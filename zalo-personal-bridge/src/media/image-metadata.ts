import sharp from 'sharp';

export class ImageMetadataHelper {
  static async getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
    try {
      const meta = await sharp(buffer).metadata();
      return {
        width: meta.width || 800,
        height: meta.height || 600,
      };
    } catch {
      return { width: 800, height: 600 };
    }
  }

  static async optimizeForZalo(buffer: Buffer, maxDimension = 1600): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize({
          width: maxDimension,
          height: maxDimension,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 90, progressive: true })
        .toBuffer();
    } catch {
      return buffer;
    }
  }
}
