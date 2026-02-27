import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  Content,
} from '@google/generative-ai';
import { SpeechClient } from '@google-cloud/speech';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AiAssistantService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private speechClient: SpeechClient;
  private readonly logger = new Logger(AiAssistantService.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.genAI = new GoogleGenerativeAI(apiKey);

    // Define tools
    const tools = [
      {
        functionDeclarations: [
          {
            name: 'getHotelRecommendations',
            description:
              'Get hotel or property recommendations based on location and price range.',
            parameters: {
              type: 'OBJECT',
              properties: {
                location: {
                  type: 'STRING',
                  description:
                    'The location to search for hotels (e.g., London, Paris).',
                },
                priceMin: {
                  type: 'NUMBER',
                  description: 'Minimum price per night.',
                },
                priceMax: {
                  type: 'NUMBER',
                  description: 'Maximum price per night.',
                },
                category: {
                  type: 'STRING',
                  description:
                    'Type of accommodation: "Hotel", "Property", or "All". Defaults to "All" if not specified.',
                  enum: ['Hotel', 'Property', 'All'],
                },
              },
              required: ['location'],
            },
          },
          {
            name: 'getPricePrediction',
            description:
              'Get price prediction chart data for a specific hotel.',
            parameters: {
              type: 'OBJECT',
              properties: {
                hotelName: {
                  type: 'STRING',
                  description: 'The name of the hotel.',
                },
              },
              required: ['hotelName'],
            },
          },
          {
            name: 'getStaffMembers',
            description: 'Get a list of staff members.',
            parameters: {
              type: 'OBJECT',
              properties: {},
            },
          },
          {
            name: 'getStaffCompletedJobs',
            description:
              'Get a list of completed jobs for a specific staff member.',
            parameters: {
              type: 'OBJECT',
              properties: {
                staffName: {
                  type: 'STRING',
                  description:
                    'The name of the staff member (first name or last name).',
                },
              },
              required: ['staffName'],
            },
          },
          {
            name: 'getAvailableJobs',
            description: 'Get a list of currently available (queued) jobs.',
            parameters: {
              type: 'OBJECT',
              properties: {},
            },
          },
        ],
      },
    ];

    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      tools: tools as any, // valid in newer SDK versions
    });

    this.speechClient = new SpeechClient();
  }

  private chatHistory = new Map<number, Content[]>();

  async transcribeAudio(input: { audioBuffer: Buffer; mimeType?: string }) {
    const mimeType = (input.mimeType || '').toLowerCase();

    // Debug logging
    this.logger.log(`Audio received: ${input.audioBuffer.length} bytes, mimeType: ${input.mimeType || 'none'}`);
    const header = input.audioBuffer.subarray(0, 12).toString('ascii');
    this.logger.log(`Audio header: ${JSON.stringify(header)}`);

    // For best results and simplest config we expect WAV/LINEAR16.
    // If you want MP3/M4A/OGG, we should convert to LINEAR16 on backend via ffmpeg.
    const looksLikeWav = header.startsWith('RIFF') && header.includes('WAVE');
    const isWav = mimeType.includes('wav') || looksLikeWav;
    if (!isWav) {
      throw new BadRequestException(
        'Unsupported audio type. Please upload WAV audio (audio/wav).',
      );
    }

    const audio = {
      content: input.audioBuffer.toString('base64'),
    };

    const config = {
      encoding: 'LINEAR16' as const,
      sampleRateHertz: 16000,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
    };

    this.logger.log('Calling Google Speech API...');
    const [response] = await this.speechClient.recognize({
      audio,
      config,
    });

    this.logger.log(`Speech API response: ${JSON.stringify(response)}`);

    const transcript = (response.results || [])
      .map((r) => r.alternatives?.[0]?.transcript || '')
      .join(' ')
      .trim();

    this.logger.log(`Transcript: "${transcript}"`);

    return transcript;
  }

  async chat(userId: number, userMessage: string) {
    // Retrieve or initialize history
    let history = this.chatHistory.get(userId);
    if (!history) {
      history = [
        {
          role: 'user',
          parts: [{ text: 'Hello, I am a traveler.' }],
        },
        {
          role: 'model',
          parts: [
            {
              text: "Hello! I'm your AI travel assistant. How can I help you today?",
            },
          ],
        },
      ];
    }

    const chat = this.model.startChat({
      history: history,
    });

    let result = await chat.sendMessage(userMessage);
    let response = result.response;
    let functionCalls = response.functionCalls();

    const responseData = {
      messages: [] as any[],
    };

    // Loop to handle function calls and feed them back to the model
    while (functionCalls && functionCalls.length > 0) {
      const functionResponses: any[] = [];

      for (const call of functionCalls) {
        if (call.name === 'getHotelRecommendations') {
          const args = call.args as any;
          const category = args.category || 'All';
          console.log(`Calling getHotelRecommendations with:`, args);

          const hotels = await this.getHotels(
            args.location,
            category,
            args.priceMin,
            args.priceMax,
          );

          // Add structured data for Frontend
          let typeText = 'hotel and property';
          if (category === 'Hotel') typeText = 'hotel';
          if (category === 'Property') typeText = 'property';

          if (hotels.length > 0) {
            responseData.messages.push({
              type: 'text',
              content: `Here are some ${typeText} recommendations in ${args.location}.`,
            });
            responseData.messages.push({
              type: 'hotel_list',
              data: hotels,
            });
          } else {
            responseData.messages.push({
              type: 'text',
              content: `I'm sorry, I couldn't find any ${typeText} in ${args.location} within that price range.`,
            });
          }

          // Prepare response for the Model
          functionResponses.push({
            functionResponse: {
              name: 'getHotelRecommendations',
              response: { hotels: hotels }, // Pass the data to the model!
            },
          });
        } else if (call.name === 'getPricePrediction') {
          const args = call.args as any;
          console.log(`Calling getPricePrediction for:`, args.hotelName);

          const chartData = await this.getPricePrediction(args.hotelName);

          responseData.messages.push({
            type: 'text',
            content: `Here is the price trend for ${args.hotelName}.`,
          });
          responseData.messages.push({
            type: 'chart',
            data: chartData,
          });

          functionResponses.push({
            functionResponse: {
              name: 'getPricePrediction',
              response: { prediction: chartData },
            },
          });
        } else if (call.name === 'getStaffMembers') {
          console.log(`Calling getStaffMembers`);
          const staff = await this.getStaffMembers();
          functionResponses.push({
            functionResponse: {
              name: 'getStaffMembers',
              response: { staff },
            },
          });
        } else if (call.name === 'getStaffCompletedJobs') {
          const args = call.args as any;
          console.log(`Calling getStaffCompletedJobs for:`, args.staffName);
          const jobs = await this.getStaffCompletedJobs(args.staffName);
          functionResponses.push({
            functionResponse: {
              name: 'getStaffCompletedJobs',
              response: { jobs },
            },
          });
        } else if (call.name === 'getAvailableJobs') {
          console.log(`Calling getAvailableJobs`);
          const jobs = await this.getAvailableJobs();
          functionResponses.push({
            functionResponse: {
              name: 'getAvailableJobs',
              response: { jobs },
            },
          });
        }
      }

      // Send function responses back to the model
      if (functionResponses.length > 0) {
        result = await chat.sendMessage(functionResponses);
        response = result.response;
        functionCalls = response.functionCalls();
      } else {
        break; // Should not happen if functionCalls > 0
      }
    }

    // Add the final text response from the model (after it processed the function data)
    const text = response.text();
    if (text) {
      responseData.messages.push({
        type: 'text',
        content: text,
      });
    }

    // Save updated history
    this.chatHistory.set(userId, await chat.getHistory());

    return responseData;
  }

  // --- Helper Functions ---

  private async getHotels(
    location: string,
    category: string,
    min?: number,
    max?: number,
  ) {
    const whereHotel: any = {};
    const whereProperty: any = {};

    if (location) {
      whereHotel.address = { contains: location, mode: 'insensitive' };
      whereProperty.address = { contains: location, mode: 'insensitive' };
    }

    let mappedHotels: any[] = [];
    let mappedProperties: any[] = [];

    if (category === 'Hotel' || category === 'All') {
      const hotels = await this.prisma.hotel.findMany({
        where: whereHotel,
        include: {
          rooms: true,
          reviews: true,
        },
        take: 5,
      });
      mappedHotels = hotels.map((h) => {
        const lowestPrice =
          h.rooms.length > 0
            ? Math.min(...h.rooms.map((r) => Number(r.price)))
            : 0;
        return {
          id: h.id,
          name: h.title,
          location: h.address,
          price: lowestPrice,
          image: h.images.length > 0 ? h.images[0] : '',
          match: '95% Match', // AI match score
          type: 'Hotel',
          // Include full hotel data for detail screen
          title: h.title,
          address: h.address,
          description: h.description,
          images: h.images,
          amenities: h.amenities,
          rooms: h.rooms,
          reviews: h.reviews,
          latitude: h.latitude,
          longitude: h.longitude,
        };
      });
    }

    if (category === 'Property' || category === 'All') {
      const properties = await this.prisma.property.findMany({
        where: whereProperty,
        include: {
          reviews: true,
        },
        take: 5,
      });
      mappedProperties = properties.map((p) => {
        return {
          id: p.id,
          name: p.title,
          location: p.address,
          price: Number(p.price),
          image: p.images.length > 0 ? p.images[0] : '',
          match: '90% Match', // AI match score
          type: 'Property',
          // Include full property data for detail screen
          title: p.title,
          address: p.address,
          description: p.description,
          images: p.images,
          amenities: p.amenities,
          neighborhoodInsights: (p as any).neighborhoodInsights || [],
          rooms: p.rooms,
          bathrooms: p.bathrooms,
          area: p.area,
          reviews: p.reviews,
          latitude: p.latitude,
          longitude: p.longitude,
        };
      });
    }

    const allResults = [...mappedHotels, ...mappedProperties];

    // Filter by price
    return allResults.filter((h) => {
      if (min && h.price < min) return false;
      if (max && h.price > max) return false;
      return true;
    });
  }

  private async getPricePrediction(hotelName: string) {
    // Mock data for chart
    return {
      currentPrice: 200,
      bestPrice: 260,
      confidence: 87,
      points: [
        { x: 0, y: 220 },
        { x: 1, y: 210 },
        { x: 2, y: 240 },
        { x: 3, y: 180 }, // Low point
        { x: 4, y: 190 },
        { x: 5, y: 200 },
      ],
      xLabels: ['Jan 15', 'Jan 22', 'Jan 29', 'Feb 5', 'Feb 12', 'Feb 19'],
    };
  }

  private async getStaffMembers() {
    const staff = await this.prisma.user.findMany({
      where: { role: 'STAFF' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        fullName: true,
        email: true,
        avatar: true,
      },
    });
    return staff;
  }

  private async getStaffCompletedJobs(staffName: string) {
    const jobs = await this.prisma.job.findMany({
      where: {
        status: { in: ['COMPLETED', 'APPROVED'] },
        assignments: {
          some: {
            applier: {
              OR: [
                { firstName: { contains: staffName, mode: 'insensitive' } },
                { lastName: { contains: staffName, mode: 'insensitive' } },
                { fullName: { contains: staffName, mode: 'insensitive' } },
              ],
            },
          },
        },
      },
      include: {
        property: { select: { title: true } },
        hotel: { select: { title: true } },
      },
    });
    return jobs;
  }

  private async getAvailableJobs() {
    const jobs = await this.prisma.job.findMany({
      where: { status: 'QUEUED' },
      include: {
        property: { select: { title: true } },
        hotel: { select: { title: true } },
      },
    });
    return jobs;
  }
}
