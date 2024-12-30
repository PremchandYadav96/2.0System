import * as tf from '@tensorflow/tfjs';
import { Prediction } from '../../types';

interface TimeSeriesData {
  timestamp: number;
  values: Map<string, number>;
}

export class PredictionEngine {
  private timeSeriesModel: tf.LayersModel | null = null;
  private readonly modelPath = 'indexeddb://time-series-model';
  private readonly predictionHorizon = 30; // days
  private readonly minDataPoints = 5;

  async initialize(): Promise<void> {
    try {
      this.timeSeriesModel = await tf.loadLayersModel(this.modelPath);
    } catch {
      await this.createTimeSeriesModel();
    }
  }

  private async createTimeSeriesModel(): Promise<void> {
    const model = tf.sequential({
      layers: [
        tf.layers.lstm({
          inputShape: [this.minDataPoints, 1],
          units: 64,
          returnSequences: true
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.lstm({
          units: 32,
          returnSequences: false
        }),
        tf.layers.dense({ units: this.predictionHorizon })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError'
    });

    this.timeSeriesModel = model;
    await model.save(this.modelPath);
  }

  private preprocessTimeSeriesData(
    data: TimeSeriesData[]
  ): Map<string, number[][]> {
    const seriesByMetric = new Map<string, number[]>();

    // Group values by metric
    data.forEach(({ values }) => {
      values.forEach((value, metric) => {
        if (!seriesByMetric.has(metric)) {
          seriesByMetric.set(metric, []);
        }
        seriesByMetric.get(metric)!.push(value);
      });
    });

    // Create sequences for each metric
    const sequences = new Map<string, number[][]>();
    seriesByMetric.forEach((values, metric) => {
      if (values.length >= this.minDataPoints) {
        // Create sequences of minDataPoints length
        const metricSequences = [];
        for (let i = 0; i <= values.length - this.minDataPoints; i++) {
          metricSequences.push(values.slice(i, i + this.minDataPoints));
        }
        sequences.set(metric, metricSequences);
      }
    });

    return sequences;
  }

  private calculateTrend(
    historical: number[],
    predicted: number
  ): 'increasing' | 'decreasing' | 'stable' {
    const lastValue = historical[historical.length - 1];
    const percentChange = ((predicted - lastValue) / lastValue) * 100;

    if (percentChange > 5) return 'increasing';
    if (percentChange < -5) return 'decreasing';
    return 'stable';
  }

  private calculateConfidence(
    historical: number[],
    predicted: number
  ): number {
    // Calculate confidence based on historical volatility and prediction distance
    const std = tf.tensor1d(historical).sub(tf.mean(historical)).square().mean().sqrt();
    const volatility = std.dataSync()[0] / tf.mean(historical).dataSync()[0];
    
    // Confidence decreases with higher volatility and larger prediction changes
    const lastValue = historical[historical.length - 1];
    const change = Math.abs((predicted - lastValue) / lastValue);
    
    let confidence = 1 - (volatility + change) / 2;
    confidence = Math.max(0, Math.min(1, confidence)) * 100;
    
    return Math.round(confidence);
  }

  async predictTrends(
    historicalData: TimeSeriesData[]
  ): Promise<Prediction[]> {
    if (!this.timeSeriesModel) await this.initialize();
    if (historicalData.length < this.minDataPoints) {
      throw new Error(`Insufficient data points. Need at least ${this.minDataPoints}`);
    }

    const predictions: Prediction[] = [];
    const sequences = this.preprocessTimeSeriesData(historicalData);

    for (const [metric, metricSequences] of sequences.entries()) {
      try {
        // Prepare input tensor
        const inputSequence = metricSequences[metricSequences.length - 1];
        const inputTensor = tf.tensor3d([inputSequence], [1, this.minDataPoints, 1]);

        // Make prediction
        const predictionTensor = this.timeSeriesModel!.predict(inputTensor) as tf.Tensor;
        const predictedValues = await predictionTensor.data();
        
        // Calculate metrics
        const predictedValue = predictedValues[0];
        const trend = this.calculateTrend(inputSequence, predictedValue);
        const confidence = this.calculateConfidence(inputSequence, predictedValue);

        predictions.push({
          metric,
          value: Number(predictedValue.toFixed(2)),
          confidence,
          trend
        });

        // Cleanup tensors
        inputTensor.dispose();
        predictionTensor.dispose();
      } catch (error) {
        console.error(`Prediction failed for metric ${metric}:`, error);
      }
    }

    return predictions;
  }

  async cleanup(): Promise<void> {
    if (this.timeSeriesModel) {
      this.timeSeriesModel.dispose();
      this.timeSeriesModel = null;
    }
  }
}