import * as tf from '@tensorflow/tfjs';
import { ImageAnalysis, Region, Confidence } from '../types';

export class XRayAnalyzer {
  private model: tf.LayersModel | null = null;
  private readonly modelPath = 'indexeddb://xray-analysis-model';
  private readonly targetSize = 224; // Input size for the model
  private readonly classNames = [
    'normal',
    'bacterial_pneumonia',
    'viral_pneumonia',
    'covid19',
    'tuberculosis',
    'pleural_effusion',
    'nodule',
    'mass',
    'cardiomegaly',
  ];

  async initialize(): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(this.modelPath);
    } catch (error) {
      console.error('Failed to load X-ray analysis model:', error);
      throw new Error('Model initialization failed');
    }
  }

  private async preprocessImage(imageData: string): Promise<tf.Tensor4D> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Convert image to tensor and preprocess
          const tensor = tf.browser.fromPixels(img)
            .resizeNearestNeighbor([this.targetSize, this.targetSize])
            .toFloat()
            .expandDims();
          
          // Normalize pixel values
          const normalized = tensor.div(255.0);
          resolve(normalized as tf.Tensor4D);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageData;
    });
  }

  private async detectRegionsOfInterest(
    tensor: tf.Tensor4D
  ): Promise<Region[]> {
    // Implement region proposal network or similar technique
    const regions: Region[] = [];
    
    try {
      // Example implementation using sliding window approach
      const windowSizes = [32, 64, 128];
      const stride = 16;

      for (const size of windowSizes) {
        for (let y = 0; y <= this.targetSize - size; y += stride) {
          for (let x = 0; x <= this.targetSize - size; x += stride) {
            const region = tensor.slice(
              [0, y, x, 0],
              [1, size, size, 3]
            );

            const score = await this.evaluateRegion(region);
            if (score > 0.5) {
              regions.push({
                x: x / this.targetSize,
                y: y / this.targetSize,
                width: size / this.targetSize,
                height: size / this.targetSize,
                confidence: score,
              });
            }

            tf.dispose(region);
          }
        }
      }

      // Non-maximum suppression to remove overlapping regions
      return this.nonMaxSuppression(regions);
    } catch (error) {
      console.error('Region detection failed:', error);
      throw error;
    }
  }

  private async evaluateRegion(region: tf.Tensor4D): Promise<number> {
    try {
      const prediction = this.model!.predict(region) as tf.Tensor;
      const score = await prediction.max().data();
      tf.dispose(prediction);
      return score[0];
    } catch (error) {
      console.error('Region evaluation failed:', error);
      return 0;
    }
  }

  private nonMaxSuppression(regions: Region[]): Region[] {
    const threshold = 0.3; // IOU threshold
    const sorted = [...regions].sort((a, b) => b.confidence - a.confidence);
    const selected: Region[] = [];

    while (sorted.length > 0) {
      const current = sorted.shift()!;
      selected.push(current);

      for (let i = sorted.length - 1; i >= 0; i--) {
        const iou = this.calculateIOU(current, sorted[i]);
        if (iou > threshold) {
          sorted.splice(i, 1);
        }
      }
    }

    return selected;
  }

  private calculateIOU(a: Region, b: Region): number {
    const intersectionX = Math.max(
      0,
      Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
    );
    const intersectionY = Math.max(
      0,
      Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
    );

    const intersectionArea = intersectionX * intersectionY;
    const aArea = a.width * a.height;
    const bArea = b.width * b.height;
    const unionArea = aArea + bArea - intersectionArea;

    return intersectionArea / unionArea;
  }

  private async classifyRegions(
    tensor: tf.Tensor4D,
    regions: Region[]
  ): Promise<Confidence[]> {
    const classifications: Confidence[] = [];

    try {
      for (const region of regions) {
        const regionTensor = tensor.slice(
          [
            0,
            Math.floor(region.y * this.targetSize),
            Math.floor(region.x * this.targetSize),
            0,
          ],
          [
            1,
            Math.floor(region.height * this.targetSize),
            Math.floor(region.width * this.targetSize),
            3,
          ]
        );

        const resized = tf.image.resizeBilinear(
          regionTensor,
          [this.targetSize, this.targetSize]
        );

        const prediction = this.model!.predict(resized) as tf.Tensor;
        const probabilities = await prediction.data();

        // Get top 3 predictions
        const topK = 3;
        const indices = Array.from(probabilities)
          .map((p, i) => ({ probability: p, index: i }))
          .sort((a, b) => b.probability - a.probability)
          .slice(0, topK);

        classifications.push(
          ...indices.map(({ probability, index }) => ({
            class: this.classNames[index],
            probability,
            region,
          }))
        );

        tf.dispose([regionTensor, resized, prediction]);
      }

      return classifications;
    } catch (error) {
      console.error('Region classification failed:', error);
      throw error;
    }
  }

  private generateFindings(
    classifications: Confidence[]
  ): string[] {
    const findings: string[] = [];
    const significantFindings = classifications.filter(c => c.probability > 0.7);

    if (significantFindings.length === 0) {
      findings.push('No significant abnormalities detected.');
      return findings;
    }

    // Group findings by class
    const groupedFindings = new Map<string, Confidence[]>();
    significantFindings.forEach(finding => {
      const existing = groupedFindings.get(finding.class) || [];
      groupedFindings.set(finding.class, [...existing, finding]);
    });

    // Generate detailed findings
    groupedFindings.forEach((findings, className) => {
      const locations = findings.map(f => {
        const region = f.region;
        const x = Math.round(region.x * 100);
        const y = Math.round(region.y * 100);
        return `(${x}%, ${y}%)`;
      });

      const maxConfidence = Math.max(...findings.map(f => f.probability));
      const confidenceLevel = maxConfidence > 0.9 ? 'high' : 'moderate';

      findings.push(
        `${className.replace('_', ' ')} detected with ${confidenceLevel} confidence ` +
        `at locations: ${locations.join(', ')}`
      );
    });

    return findings;
  }

  async analyze(imageData: string): Promise<ImageAnalysis> {
    if (!this.model) {
      await this.initialize();
    }

    let tensor: tf.Tensor4D | null = null;

    try {
      // Preprocess image
      tensor = await this.preprocessImage(imageData);

      // Detect regions of interest
      const regions = await this.detectRegionsOfInterest(tensor);

      // Classify each region
      const classifications = await this.classifyRegions(tensor, regions);

      // Generate findings
      const findings = this.generateFindings(classifications);

      // Calculate overall assessment
      const normalProbability = classifications.find(c => c.class === 'normal')?.probability || 0;
      const overallAssessment = normalProbability > 0.8
        ? 'Normal study'
        : 'Abnormal findings present';

      return {
        findings,
        classifications,
        regions,
        overallAssessment,
        timestamp: Date.now(),
      };
    } finally {
      if (tensor) {
        tf.dispose(tensor);
      }
    }
  }

  async cleanup(): Promise<void> {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}