interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
  maintainAspectRatio?: boolean;
  progressive?: boolean;
}

interface ImageMetadata {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
  format: string;
  orientation?: number;
}

interface ProcessedImage {
  blob: Blob;
  dataUrl: string;
  metadata: ImageMetadata;
}

class ImageOptimizationService {
  private static instance: ImageOptimizationService;

  // Default compression settings for different use cases
  private static readonly PRESETS = {
    thumbnail: { maxWidth: 150, maxHeight: 150, quality: 0.7, format: 'jpeg' as const },
    preview: { maxWidth: 400, maxHeight: 400, quality: 0.8, format: 'jpeg' as const },
    mobile: { maxWidth: 800, maxHeight: 800, quality: 0.85, format: 'jpeg' as const },
    desktop: { maxWidth: 1920, maxHeight: 1920, quality: 0.9, format: 'jpeg' as const },
    original: { quality: 0.95, format: 'jpeg' as const },
  };

  public static getInstance(): ImageOptimizationService {
    if (!ImageOptimizationService.instance) {
      ImageOptimizationService.instance = new ImageOptimizationService();
    }
    return ImageOptimizationService.instance;
  }

  /**
   * Compress and optimize an image with various options
   */
  public async optimizeImage(
    file: File | Blob,
    options: CompressionOptions = {}
  ): Promise<ProcessedImage> {
    const {
      maxWidth = 1920,
      maxHeight = 1920,
      quality = 0.85,
      format = 'jpeg',
      maintainAspectRatio = true,
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      img.onload = () => {
        try {
          // Calculate new dimensions
          const { width, height } = this.calculateDimensions(
            img.width,
            img.height,
            maxWidth,
            maxHeight,
            maintainAspectRatio
          );

          canvas.width = width;
          canvas.height = height;

          // Apply image optimization settings
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Handle orientation if needed (EXIF data)
          const orientation = this.getImageOrientation(file);
          this.applyOrientation(ctx, orientation, width, height);

          // Draw the image
          ctx.drawImage(img, 0, 0, width, height);

          // Apply additional filters if needed
          this.applyImageFilters(ctx, width, height, options);

          // Convert to blob
          canvas.toBlob(
            blob => {
              if (!blob) {
                reject(new Error('Failed to create optimized image blob'));
                return;
              }

              const dataUrl = canvas.toDataURL(`image/${format}`, quality);
              const metadata: ImageMetadata = {
                originalSize: file.size,
                compressedSize: blob.size,
                compressionRatio: file.size / blob.size,
                width,
                height,
                format,
                orientation,
              };

              resolve({
                blob,
                dataUrl,
                metadata,
              });
            },
            `image/${format}`,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Create multiple versions of an image for responsive display
   */
  public async createResponsiveImages(
    file: File | Blob,
    presets: Array<keyof typeof ImageOptimizationService.PRESETS> = [
      'thumbnail',
      'mobile',
      'desktop',
    ]
  ): Promise<Record<string, ProcessedImage>> {
    const results: Record<string, ProcessedImage> = {};

    for (const presetName of presets) {
      const preset = ImageOptimizationService.PRESETS[presetName];
      try {
        results[presetName] = await this.optimizeImage(file, preset);
      } catch (error) {
        console.error(`Failed to create ${presetName} version:`, error);
      }
    }

    return results;
  }

  /**
   * Batch process multiple images
   */
  public async batchOptimize(
    files: Array<File | Blob>,
    options: CompressionOptions = {},
    onProgress?: (completed: number, total: number) => void
  ): Promise<ProcessedImage[]> {
    const results: ProcessedImage[] = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.optimizeImage(files[i], options);
        results.push(result);
        onProgress?.(i + 1, files.length);
      } catch (error) {
        console.error(`Failed to optimize image ${i}:`, error);
        onProgress?.(i + 1, files.length);
      }
    }

    return results;
  }

  /**
   * Convert image format
   */
  public async convertFormat(
    file: File | Blob,
    targetFormat: 'jpeg' | 'webp' | 'png',
    quality: number = 0.9
  ): Promise<ProcessedImage> {
    return this.optimizeImage(file, { format: targetFormat, quality });
  }

  /**
   * Create a thumbnail from an image
   */
  public async createThumbnail(
    file: File | Blob,
    size: number = 150,
    square: boolean = true
  ): Promise<ProcessedImage> {
    const options: CompressionOptions = {
      maxWidth: size,
      maxHeight: size,
      quality: 0.8,
      format: 'jpeg',
      maintainAspectRatio: !square,
    };

    return this.optimizeImage(file, options);
  }

  /**
   * Detect if image needs compression based on size and device
   */
  public shouldCompress(
    file: File,
    deviceType: 'mobile' | 'tablet' | 'desktop' = 'mobile'
  ): boolean {
    const sizeThresholds = {
      mobile: 1 * 1024 * 1024, // 1MB
      tablet: 2 * 1024 * 1024, // 2MB
      desktop: 5 * 1024 * 1024, // 5MB
    };

    return file.size > sizeThresholds[deviceType];
  }

  /**
   * Get optimal compression settings based on device and connection
   */
  public getOptimalSettings(
    deviceType: 'mobile' | 'tablet' | 'desktop' = 'mobile',
    connectionSpeed: 'slow' | 'fast' = 'slow'
  ): CompressionOptions {
    const baseSettings = {
      mobile: { maxWidth: 800, maxHeight: 800, quality: 0.8 },
      tablet: { maxWidth: 1200, maxHeight: 1200, quality: 0.85 },
      desktop: { maxWidth: 1920, maxHeight: 1920, quality: 0.9 },
    };

    const settings = baseSettings[deviceType];

    // Adjust for slow connections
    if (connectionSpeed === 'slow') {
      settings.quality = Math.max(0.6, settings.quality - 0.15);
      settings.maxWidth = Math.floor(settings.maxWidth * 0.8);
      settings.maxHeight = Math.floor(settings.maxHeight * 0.8);
    }

    return { ...settings, format: 'jpeg' as const };
  }

  // Private helper methods

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
    maintainAspectRatio: boolean
  ): { width: number; height: number } {
    if (!maintainAspectRatio) {
      return { width: maxWidth, height: maxHeight };
    }

    const aspectRatio = originalWidth / originalHeight;

    let width = Math.min(originalWidth, maxWidth);
    let height = Math.min(originalHeight, maxHeight);

    if (width / height > aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  private getImageOrientation(_file: File | Blob): number {
    // This is a simplified version - in a real implementation,
    // you'd parse EXIF data to get the actual orientation
    // For now, return 1 (no rotation needed)
    return 1;
  }

  private applyOrientation(
    ctx: CanvasRenderingContext2D,
    orientation: number,
    width: number,
    height: number
  ): void {
    // Apply rotation based on EXIF orientation
    switch (orientation) {
      case 2:
        ctx.transform(-1, 0, 0, 1, width, 0);
        break;
      case 3:
        ctx.transform(-1, 0, 0, -1, width, height);
        break;
      case 4:
        ctx.transform(1, 0, 0, -1, 0, height);
        break;
      case 5:
        ctx.transform(0, 1, 1, 0, 0, 0);
        break;
      case 6:
        ctx.transform(0, 1, -1, 0, height, 0);
        break;
      case 7:
        ctx.transform(0, -1, -1, 0, height, width);
        break;
      case 8:
        ctx.transform(0, -1, 1, 0, 0, width);
        break;
      default:
        // No transformation needed
        break;
    }
  }

  private applyImageFilters(
    _ctx: CanvasRenderingContext2D,
    _width: number,
    _height: number,
    options: CompressionOptions
  ): void {
    // Apply any additional filters or enhancements
    // This could include sharpening, noise reduction, etc.

    // For now, this is a placeholder for potential image enhancements
    if (options.format === 'jpeg') {
      // Apply slight sharpening for JPEG compression
      // This would require more complex image processing
    }
  }

  /**
   * Estimate file size after compression
   */
  public estimateCompressedSize(originalSize: number, options: CompressionOptions): number {
    const { quality = 0.85, maxWidth = 1920, maxHeight = 1920 } = options;

    // Simple estimation based on quality and resolution reduction
    const qualityFactor = quality;
    const resolutionFactor = Math.min(1, (maxWidth * maxHeight) / (1920 * 1920));

    return Math.round(originalSize * qualityFactor * resolutionFactor);
  }

  /**
   * Check if WebP format is supported
   */
  public supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  }

  /**
   * Get the best supported format for the current browser
   */
  public getBestFormat(): 'webp' | 'jpeg' {
    return this.supportsWebP() ? 'webp' : 'jpeg';
  }
}

export default ImageOptimizationService;
