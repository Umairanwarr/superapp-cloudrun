import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/index';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class ExpensesService {
  private genAI: GoogleGenerativeAI;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async create(userId: number, dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        category: dto.category || 'OTHER',
        date: dto.date ? new Date(dto.date) : new Date(),
        receiptUrl: dto.receiptUrl,
        userId,
        propertyId: dto.propertyId,
        hotelId: dto.hotelId,
      },
      include: {
        property: {
          select: { id: true, title: true, address: true },
        },
        hotel: {
          select: { id: true, title: true, address: true },
        },
      },
    });
  }

  async findAll(userId: number) {
    return this.prisma.expense.findMany({
      where: { userId },
      include: {
        property: {
          select: { id: true, title: true, address: true },
        },
        hotel: {
          select: { id: true, title: true, address: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(userId: number, id: number) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, userId },
      include: {
        property: {
          select: { id: true, title: true, address: true },
        },
        hotel: {
          select: { id: true, title: true, address: true },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async update(userId: number, id: number, dto: UpdateExpenseDto) {
    await this.findOne(userId, id);

    return this.prisma.expense.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        category: dto.category,
        date: dto.date ? new Date(dto.date) : undefined,
        receiptUrl: dto.receiptUrl,
        propertyId: dto.propertyId,
        hotelId: dto.hotelId,
      },
      include: {
        property: {
          select: { id: true, title: true, address: true },
        },
        hotel: {
          select: { id: true, title: true, address: true },
        },
      },
    });
  }

  async remove(userId: number, id: number) {
    await this.findOne(userId, id);
    await this.prisma.expense.delete({ where: { id } });
    return { message: 'Expense deleted successfully' };
  }

  async getSummary(userId: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonthExpenses, lastMonthExpenses] = await Promise.all([
      this.prisma.expense.aggregate({
        where: { userId, date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          userId,
          date: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    const thisMonth = Number(thisMonthExpenses._sum.amount || 0);
    const lastMonth = Number(lastMonthExpenses._sum.amount || 0);

    let deltaPercent = 0;
    if (lastMonth > 0) {
      deltaPercent = ((thisMonth - lastMonth) / lastMonth) * 100;
    }

    return {
      totalThisMonth: thisMonth,
      lastMonth,
      deltaPercent: Math.round(deltaPercent * 100) / 100,
    };
  }

  async getByCategory(userId: number) {
    const expenses = await this.prisma.expense.groupBy({
      by: ['category'],
      where: { userId },
      _sum: { amount: true },
      _count: { id: true },
    });

    return expenses.map((e) => ({
      category: e.category,
      total: Number(e._sum.amount || 0),
      count: e._count,
    }));
  }

  async getInsight(userId: number) {
    // Get expense data for analysis
    const [expenses, summary, byCategory] = await Promise.all([
      this.prisma.expense.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 20,
        include: {
          property: {
            select: { title: true },
          },
          hotel: {
            select: { title: true },
          },
        },
      }),
      this.getSummary(userId),
      this.getByCategory(userId),
    ]);

    if (expenses.length === 0) {
      return {
        insight: 'No expenses recorded yet. Start tracking your expenses to get AI-powered insights!',
        tips: ['Add your first expense to begin tracking', 'Categorize expenses for better analysis'],
      };
    }

    // Prepare data for Gemini
    const expenseData = expenses.map((e) => ({
      title: e.title,
      amount: Number(e.amount),
      category: e.category,
      date: e.date.toISOString().split('T')[0],
      property: e.property?.title || e.hotel?.title || 'N/A',
    }));

    const prompt = `You are a financial advisor analyzing expense data. Provide actionable insights and tips.

Expense Summary:
- Total this month: $${summary.totalThisMonth}
- Last month: $${summary.lastMonth}
- Change: ${summary.deltaPercent}%

Expenses by Category:
${byCategory.map((c) => `- ${c.category}: $${c.total} (${c.count} items)`).join('\n')}

Recent Expenses:
${expenseData.map((e) => `- ${e.title}: $${e.amount} (${e.category}) on ${e.date}`).join('\n')}

Provide:
1. A brief insight (2-3 sentences) about spending patterns
2. 2-3 actionable tips to optimize expenses

Respond in JSON format:
{
  "insight": "your insight here",
  "tips": ["tip1", "tip2", "tip3"]
}`;

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        insight: 'Unable to generate insight at this time.',
        tips: ['Track your expenses regularly', 'Review spending by category'],
      };
    } catch (error) {
      console.error('AI insight error:', error);
      return {
        insight: `You've spent $${summary.totalThisMonth} this month, a ${summary.deltaPercent > 0 ? 'increase' : 'decrease'} of ${Math.abs(summary.deltaPercent)}% from last month.`,
        tips: [
          'Review your largest expense categories for potential savings',
          'Set monthly budgets for each category',
          'Track expenses regularly for better insights',
        ],
      };
    }
  }
}
