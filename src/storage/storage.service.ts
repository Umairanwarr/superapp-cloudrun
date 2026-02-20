import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import * as path from 'path';
import type { Readable } from 'stream';

@Injectable()
export class StorageService {
  private storage: Storage;
  private bucket: string;

  constructor() {
    // Use default credentials on Cloud Run, key file for local dev
    const keyFilePath = path.join(
      process.cwd(),
      'project-e1475e79-3396-4c78-a29-bced688fa4a0.json',
    );
    
    // Check if running on Cloud Run (no key file) or locally
    const fs = require('fs');
    const useKeyFile = fs.existsSync(keyFilePath);

    if (useKeyFile) {
      this.storage = new Storage({
        keyFilename: keyFilePath,
        projectId: 'project-e1475e79-3396-4c78-a29',
      });
    } else {
      // Use default credentials (works on Cloud Run with attached service account)
      this.storage = new Storage({
        projectId: 'project-e1475e79-3396-4c78-a29',
      });
    }
    this.bucket = 'superapp_images';
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    const filename = `${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    const blob = this.storage.bucket(this.bucket).file(filename);

    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (err) => reject(err));
      blobStream.on('finish', () => {
        const publicUrl = `https://storage.googleapis.com/${this.bucket}/${filename}`;
        resolve(publicUrl);
      });
      blobStream.end(file.buffer);
    });
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string,
  ): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }

  private getObjectPathFromPublicUrl(url: string): string | null {
    try {
      // Expected: https://storage.googleapis.com/<bucket>/<objectPath>
      const u = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length < 2) return null;
      const bucketName = parts[0];
      if (bucketName !== this.bucket) return null;
      return parts.slice(1).join('/');
    } catch (_) {
      return null;
    }
  }

  async getFileStreamAndContentTypeFromPublicUrl(
    url: string,
  ): Promise<{ stream: Readable; contentType?: string } | null> {
    const objectPath = this.getObjectPathFromPublicUrl(url);
    if (!objectPath) return null;

    const file = this.storage.bucket(this.bucket).file(objectPath);
    const [metadata] = await file.getMetadata();

    return {
      stream: file.createReadStream(),
      contentType: metadata?.contentType,
    };
  }
}
