import * as tf from '@tensorflow/tfjs';
import { Anomaly } from '../../types';

interface ReferenceRanges {
  [key: string]: {
    min: number;
    max: number;
    unit: string;
    severity: (value: number) => 'low' | 'medium' | 'high';
  };
}

const REFERENCE_RANGES: ReferenceRanges = {
  glucose: {
    min: 70,
    max: 100,
    unit: 'mg/dL',
    severity: (value) => {
      if (value > 200 || value < 50) return 'high';
      if (value > 140 || value < 60) return 'medium';
      return 'low';
    },
  },
  // Add more reference ranges for other metrics
};

export class AnomalyDetector {
  private model: tf.LayersModel | null = null;
  private readonly modelPath = 'indexeddb://anomaly-detection-model';

  async initialize(): Promise<void> {
    try {
      this.model = await tf.loadLayersModel(this.modelPath);
    } catch {
      // If model doesn't exist, create and train a new one
      await this.createAndTrainModel();
    }
  }

  private async createAndTrainModel(): Promise<void> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [10], units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    this.model = model;
    await model.save(this.modelPath);
  }

  private extractNumericValues(text: string): Map<string, number> {
    const values = new Map<string, number>();
    const patterns = {
      glucose: /glucose:?\s*(\d+\.?\d*)/i,
      cholesterol: /cholesterol:?\s*(\d+\.?\d*)/i,
      // Add more patterns for other metrics
    };

    for (const [metric, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match && match[1]) {
        values.set(metric, parseFloat(match[1]));
      }
    }

    return values;
  }

  private async detectStatisticalAnomalies(
    values: Map<string, number>
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    for (const [metric, value] of values.entries()) {
      const range = REFERENCE_RANGES[metric];
      if (!range) continue;

      if (value < range.min || value > range.max) {
        anomalies.push({
          type: 'statistical',
          severity: range.severity(value),
          description: `${metric} level (${value} ${range.unit}) is ${
            value < range.min ? 'below' : 'above'
          } normal range (${range.min}-${range.max} ${range.unit})`,
          location: metric
        });
      }
    }

    return anomalies;
  }

  private async detectMLAnomalies(
    values: Map<string, number>
  ): Promise<Anomaly[]> {
    if (!this.model) return [];

    const anomalies: Anomaly[] = [];
    const inputArray = Array.from(values.values());
    
    // Pad or truncate input array to match model input shape
    while (inputArray.length < 10) inputArray.push(0);
    if (inputArray.length > 10) inputArray.length = 10;

    const inputTensor = tf.tensor2d([inputArray]);
    
    try {
      const prediction = await this.model.predict(inputTensor) as tf.Tensor;
      const anomalyScore = (await prediction.data())[0];

      if (anomalyScore > 0.8) {
        anomalies.push({
          type: 'ml',
          severity: 'high',
          description: 'Complex pattern anomaly detected in multiple metrics',
          location: 'multiple'
        });
      }

      // Cleanup tensors
      inputTensor.dispose();
      prediction.dispose();
    } catch (error) {
      console.error('ML anomaly detection failed:', error);
    }

    return anomalies;
  }

  async detectAnomalies(text: string): Promise<Anomaly[]> {
    if (!this.model) await this.initialize();

    const values = this.extractNumericValues(text);
    if (values.size === 0) {
      throw new Error('No numeric values found in the text');
    }

    const [statisticalAnomalies, mlAnomalies] = await Promise.all([
      this.detectStatisticalAnomalies(values),
      this.detectMLAnomalies(values)
    ]);

    return [...statisticalAnomalies, ...mlAnomalies];
  }
}