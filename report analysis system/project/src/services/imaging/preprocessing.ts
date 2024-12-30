import Jimp from 'jimp';

interface PreprocessingOptions {
  denoise?: boolean;
  deskew?: boolean;
  enhanceContrast?: boolean;
  removeBackground?: boolean;
  targetDPI?: number;
}

export async function preprocessImage(
  imageData: string,
  options: PreprocessingOptions = {}
): Promise<string> {
  const {
    denoise = true,
    deskew = true,
    enhanceContrast = true,
    removeBackground = true,
    targetDPI = 300
  } = options;

  try {
    let image = await Jimp.read(imageData);

    // Resize to target DPI
    const currentDPI = Math.min(image.getWidth(), image.getHeight());
    if (currentDPI !== targetDPI) {
      const scale = targetDPI / currentDPI;
      image = image.scale(scale);
    }

    if (removeBackground) {
      // Implement Otsu's thresholding
      const threshold = await calculateOtsuThreshold(image);
      image.scan(0, 0, image.getWidth(), image.getHeight(), (x, y, idx) => {
        const gray = image.getPixelColor(x, y) & 0xFF;
        const newValue = gray > threshold ? 255 : 0;
        const rgba = Jimp.rgbaToInt(newValue, newValue, newValue, 255);
        image.setPixelColor(rgba, x, y);
      });
    }

    if (denoise) {
      // Implement median filter for noise reduction
      image = await applyMedianFilter(image, 3);
    }

    if (deskew) {
      // Implement Hough transform for deskewing
      const angle = await detectSkewAngle(image);
      if (Math.abs(angle) > 0.5) {
        image.rotate(angle);
      }
    }

    if (enhanceContrast) {
      // Implement adaptive contrast enhancement
      image = await enhanceLocalContrast(image);
    }

    // Convert to grayscale and normalize
    image
      .grayscale()
      .normalize();

    return await image.getBase64Async(Jimp.MIME_PNG);
  } catch (error) {
    console.error('Image preprocessing failed:', error);
    throw error;
  }
}

async function calculateOtsuThreshold(image: Jimp): Promise<number> {
  const histogram = new Array(256).fill(0);
  
  // Calculate histogram
  image.scan(0, 0, image.getWidth(), image.getHeight(), (x, y) => {
    const gray = image.getPixelColor(x, y) & 0xFF;
    histogram[gray]++;
  });

  const total = image.getWidth() * image.getHeight();
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
    
    wF = total - wB;
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

async function applyMedianFilter(image: Jimp, size: number): Promise<Jimp> {
  const result = new Jimp(image.getWidth(), image.getHeight());
  const offset = Math.floor(size / 2);

  for (let y = offset; y < image.getHeight() - offset; y++) {
    for (let x = offset; x < image.getWidth() - offset; x++) {
      const values = [];
      
      for (let fy = -offset; fy <= offset; fy++) {
        for (let fx = -offset; fx <= offset; fx++) {
          values.push(image.getPixelColor(x + fx, y + fy) & 0xFF);
        }
      }
      
      values.sort((a, b) => a - b);
      const median = values[Math.floor(values.length / 2)];
      result.setPixelColor(
        Jimp.rgbaToInt(median, median, median, 255),
        x,
        y
      );
    }
  }

  return result;
}

async function detectSkewAngle(image: Jimp): Promise<number> {
  // Implement Hough transform for line detection
  const edges = await detectEdges(image);
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

async function detectEdges(image: Jimp): Promise<Jimp> {
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

async function enhanceLocalContrast(image: Jimp): Promise<Jimp> {
  const result = new Jimp(image.getWidth(), image.getHeight());
  const windowSize = 16;
  const offset = Math.floor(windowSize / 2);

  for (let y = offset; y < image.getHeight() - offset; y++) {
    for (let x = offset; x < image.getWidth() - offset; x++) {
      let sum = 0;
      let sumSq = 0;
      let count = 0;

      for (let wy = -offset; wy <= offset; wy++) {
        for (let wx = -offset; wx <= offset; wx++) {
          const pixel = image.getPixelColor(x + wx, y + wy) & 0xFF;
          sum += pixel;
          sumSq += pixel * pixel;
          count++;
        }
      }

      const mean = sum / count;
      const variance = (sumSq / count) - (mean * mean);
      const stdDev = Math.sqrt(variance);

      const centerPixel = image.getPixelColor(x, y) & 0xFF;
      let newValue = Math.round(((centerPixel - mean) * (128 / stdDev)) + 128);
      newValue = Math.max(0, Math.min(255, newValue));

      result.setPixelColor(
        Jimp.rgbaToInt(newValue, newValue, newValue, 255),
        x,
        y
      );
    }
  }

  return result;
}