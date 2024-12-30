import Jimp from 'jimp';

interface PreprocessingResult {
  enhancedImage: string;
  quality: number;
  dpi: number;
}

export class ImagePreprocessor {
  private readonly targetDPI = 300;

  async enhance(imageData: string): Promise<PreprocessingResult> {
    const image = await Jimp.read(imageData);
    
    // Multi-stage enhancement pipeline
    await this.applyDenoise(image);
    await this.correctSkew(image);
    await this.optimizeDPI(image);
    await this.enhanceContrast(image);
    await this.optimizeForOCR(image);

    const quality = await this.assessQuality(image);
    const dpi = await this.calculateDPI(image);

    return {
      enhancedImage: await image.getBase64Async(Jimp.MIME_PNG),
      quality,
      dpi
    };
  }

  private async applyDenoise(image: Jimp): Promise<void> {
    // Advanced noise reduction using median filter
    const kernel = 3;
    const width = image.getWidth();
    const height = image.getHeight();

    for (let y = kernel; y < height - kernel; y++) {
      for (let x = kernel; x < width - kernel; x++) {
        const values = [];
        for (let dy = -kernel; dy <= kernel; dy++) {
          for (let dx = -kernel; dx <= kernel; dx++) {
            values.push(image.getPixelColor(x + dx, y + dy));
          }
        }
        values.sort((a, b) => a - b);
        image.setPixelColor(values[Math.floor(values.length / 2)], x, y);
      }
    }
  }

  private async correctSkew(image: Jimp): Promise<void> {
    // Implement Hough transform for skew detection
    const edges = await this.detectEdges(image);
    const angle = await this.detectSkewAngle(edges);
    if (Math.abs(angle) > 0.5) {
      image.rotate(-angle);
    }
  }

  private async optimizeDPI(image: Jimp): Promise<void> {
    const currentDPI = this.calculateDPI(image);
    if (currentDPI < this.targetDPI) {
      const scale = this.targetDPI / currentDPI;
      image.scale(scale);
    }
  }

  private async enhanceContrast(image: Jimp): Promise<void> {
    // Implement adaptive contrast enhancement
    const width = image.getWidth();
    const height = image.getHeight();
    const windowSize = 16;

    for (let y = 0; y < height; y += windowSize) {
      for (let x = 0; x < width; x += windowSize) {
        const stats = this.calculateLocalStats(image, x, y, windowSize);
        this.adjustLocalContrast(image, x, y, windowSize, stats);
      }
    }
  }

  private async optimizeForOCR(image: Jimp): Promise<void> {
    // Binarization using Otsu's method
    const histogram = new Array(256).fill(0);
    const width = image.getWidth();
    const height = image.getHeight();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gray = image.getPixelColor(x, y) & 0xFF;
        histogram[gray]++;
      }
    }

    const threshold = this.calculateOtsuThreshold(histogram, width * height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gray = image.getPixelColor(x, y) & 0xFF;
        const newValue = gray > threshold ? 255 : 0;
        image.setPixelColor(Jimp.rgbaToInt(newValue, newValue, newValue, 255), x, y);
      }
    }
  }

  private calculateOtsuThreshold(histogram: number[], totalPixels: number): number {
    let sum = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * histogram[i];
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVariance = 0;
    let threshold = 0;

    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;
      
      wF = totalPixels - wB;
      if (wF === 0) break;

      sumB += t * histogram[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      
      const variance = wB * wF * Math.pow(mB - mF, 2);
      if (variance > maxVariance) {
        maxVariance = variance;
        threshold = t;
      }
    }

    return threshold;
  }

  private async detectEdges(image: Jimp): Promise<Jimp> {
    const result = new Jimp(image.getWidth(), image.getHeight());
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    for (let y = 1; y < image.getHeight() - 1; y++) {
      for (let x = 1; x < image.getWidth() - 1; x++) {
        let gx = 0;
        let gy = 0;

        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const pixel = image.getPixelColor(x + j, y + i) & 0xFF;
            gx += pixel * sobelX[i + 1][j + 1];
            gy += pixel * sobelY[i + 1][j + 1];
          }
        }

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        result.setPixelColor(
          Jimp.rgbaToInt(magnitude, magnitude, magnitude, 255),
          x,
          y
        );
      }
    }

    return result;
  }

  private async detectSkewAngle(edges: Jimp): Promise<number> {
    const angles = new Array(180).fill(0);
    
    for (let y = 0; y < edges.getHeight(); y++) {
      for (let x = 0; x < edges.getWidth(); x++) {
        if ((edges.getPixelColor(x, y) & 0xFF) > 127) {
          for (let theta = 0; theta < 180; theta++) {
            const radian = (theta * Math.PI) / 180;
            const rho = x * Math.cos(radian) + y * Math.sin(radian);
            angles[theta] += 1;
          }
        }
      }
    }

    let maxVal = 0;
    let maxAngle = 0;
    
    for (let i = 0; i < angles.length; i++) {
      if (angles[i] > maxVal) {
        maxVal = angles[i];
        maxAngle = i;
      }
    }

    return maxAngle - 90;
  }

  private calculateLocalStats(
    image: Jimp,
    x: number,
    y: number,
    windowSize: number
  ): { mean: number; std: number } {
    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let dy = 0; dy < windowSize; dy++) {
      for (let dx = 0; dx < windowSize; dx++) {
        if (x + dx < image.getWidth() && y + dy < image.getHeight()) {
          const pixel = image.getPixelColor(x + dx, y + dy) & 0xFF;
          sum += pixel;
          sumSq += pixel * pixel;
          count++;
        }
      }
    }

    const mean = sum / count;
    const variance = (sumSq / count) - (mean * mean);
    return {
      mean,
      std: Math.sqrt(variance)
    };
  }

  private adjustLocalContrast(
    image: Jimp,
    x: number,
    y: number,
    windowSize: number,
    stats: { mean: number; std: number }
  ): void {
    const targetMean = 128;
    const targetStd = 50;

    for (let dy = 0; dy < windowSize; dy++) {
      for (let dx = 0; dx < windowSize; dx++) {
        if (x + dx < image.getWidth() && y + dy < image.getHeight()) {
          const pixel = image.getPixelColor(x + dx, y + dy) & 0xFF;
          const normalized = ((pixel - stats.mean) / stats.std) * targetStd + targetMean;
          const newValue = Math.max(0, Math.min(255, normalized));
          image.setPixelColor(
            Jimp.rgbaToInt(newValue, newValue, newValue, 255),
            x + dx,
            y + dy
          );
        }
      }
    }
  }

  private async assessQuality(image: Jimp): Promise<number> {
    // Implement quality assessment metrics
    const contrast = await this.calculateContrast(image);
    const sharpness = await this.calculateSharpness(image);
    const noise = await this.calculateNoise(image);

    // Weighted quality score
    return (contrast * 0.4 + sharpness * 0.4 + (1 - noise) * 0.2) * 100;
  }

  private async calculateContrast(image: Jimp): Promise<number> {
    let min = 255;
    let max = 0;

    image.scan(0, 0, image.getWidth(), image.getHeight(), (x, y) => {
      const value = image.getPixelColor(x, y) & 0xFF;
      min = Math.min(min, value);
      max = Math.max(max, value);
    });

    return (max - min) / 255;
  }

  private async calculateSharpness(image: Jimp): Promise<number> {
    let totalGradient = 0;
    const width = image.getWidth();
    const height = image.getHeight();

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const current = image.getPixelColor(x, y) & 0xFF;
        const right = image.getPixelColor(x + 1, y) & 0xFF;
        const bottom = image.getPixelColor(x, y + 1) & 0xFF;

        const gradX = Math.abs(current - right);
        const gradY = Math.abs(current - bottom);
        totalGradient += Math.sqrt(gradX * gradX + gradY * gradY);
      }
    }

    return totalGradient / (width * height * Math.sqrt(2 * 255 * 255));
  }

  private async calculateNoise(image: Jimp): Promise<number> {
    let totalNoise = 0;
    const width = image.getWidth();
    const height = image.getHeight();

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const neighbors = [
          image.getPixelColor(x - 1, y - 1) & 0xFF,
          image.getPixelColor(x, y - 1) & 0xFF,
          image.getPixelColor(x + 1, y - 1) & 0xFF,
          image.getPixelColor(x - 1, y) & 0xFF,
          image.getPixelColor(x + 1, y) & 0xFF,
          image.getPixelColor(x - 1, y + 1) & 0xFF,
          image.getPixelColor(x, y + 1) & 0xFF,
          image.getPixelColor(x + 1, y + 1) & 0xFF
        ];

        const center = image.getPixelColor(x, y) & 0xFF;
        const mean = neighbors.reduce((a, b) => a + b, 0) / 8;
        totalNoise += Math.abs(center - mean) / 255;
      }
    }

    return totalNoise / (width * height);
  }

  private async calculateDPI(image: Jimp): Promise<number> {
    // Estimate DPI based on image dimensions and typical document sizes
    const width = image.getWidth();
    const height = image.getHeight();
    
    // Assume standard A4 size (8.27 × 11.69 inches)
    const estimatedDPI = Math.min(
      width / 8.27,
      height / 11.69
    );

    return Math.round(estimatedDPI);
  }
}