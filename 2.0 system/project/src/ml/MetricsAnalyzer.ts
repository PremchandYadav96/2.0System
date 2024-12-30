import * as tf from '@tensorflow/tfjs';
import { HealthState } from '../types';

export class MetricsAnalyzer {
  private model: tf.LayersModel | null = null;
  private readonly anomalyThreshold = 2.5; // Z-score threshold

  async analyzeState(state: HealthState): Promise<{
    trends: Record<string, {
      direction: 'increasing' | 'decreasing' | 'stable';
      rate: number;
      prediction: number;
    }>;
    anomalies: Record<string, {
      isAnomaly: boolean;
      zScore: number;
      severity: 'low' | 'medium' | 'high';
    }>;
    correlations: Array<{
      metric1: string;
      metric2: string;
      correlation: number;
      significance: number;
    }>;
  }> {
    await this.ensureModelInitialized();

    const trends = await this.analyzeTrends(state);
    const anomalies = this.detectAnomalies(state);
    const correlations = this.analyzeCorrelations(state);

    return {
      trends,
      anomalies,
      correlations
    };
  }

  private async ensureModelInitialized(): Promise<void> {
    if (this.model) return;

    this.model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [10], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 5, activation: 'linear' })
      ]
    });

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError'
    });
  }

  private async analyzeTrends(
    state: HealthState
  ): Promise<Record<string, {
    direction: 'increasing' | 'decreasing' | 'stable';
    rate: number;
    prediction: number;
  }>> {
    const metrics = this.extractMetrics(state);
    const tensor = tf.tensor2d([Object.values(metrics)]);
    
    const predictions = await this.model!.predict(tensor) as tf.Tensor;
    const predictionValues = await predictions.array();

    tensor.dispose();
    predictions.dispose();

    const trends: Record<string, any> = {};
    Object.keys(metrics).forEach((key, index) => {
      const currentValue = metrics[key];
      const predictedValue = predictionValues[0][index];
      const rate = (predictedValue - currentValue) / currentValue;

      trends[key] = {
        direction: rate > 0.05 ? 'increasing' : 
                  rate < -0.05 ? 'decreasing' : 'stable',
        rate: Math.abs(rate),
        prediction: predictedValue
      };
    });

    return trends;
  }

  private detectAnomalies(
    state: HealthState
  ): Record<string, {
    isAnomaly: boolean;
    zScore: number;
    severity: 'low' | 'medium' | 'high';
  }> {
    const metrics = this.extractMetrics(state);
    const anomalies: Record<string, any> = {};

    Object.entries(metrics).forEach(([key, value]) => {
      const zScore = this.calculateZScore(value, key);
      const isAnomaly = Math.abs(zScore) > this.anomalyThreshold;

      anomalies[key] = {
        isAnomaly,
        zScore,
        severity: Math.abs(zScore) > 4 ? 'high' :
                 Math.abs(zScore) > 3 ? 'medium' : 'low'
      };
    });

    return anomalies;
  }

  private analyzeCorrelations(
    state: HealthState
  ): Array<{
    metric1: string;
    metric2: string;
    correlation: number;
    significance: number;
  }> {
    const metrics = this.extractMetrics(state);
    const correlations: Array<{
      metric1: string;
      metric2: string;
      correlation: number;
      significance: number;
    }> = [];

    const keys = Object.keys(metrics);
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const correlation = this.calculateCorrelation(
          metrics[keys[i]],
          metrics[keys[j]]
        );

        correlations.push({
          metric1: keys[i],
          metric2: keys[j],
          correlation: correlation.coefficient,
          significance: correlation.significance
        });
      }
    }

    return correlations;
  }

  private extractMetrics(state: HealthState): Record<string, number> {
    return {
      bloodSugar: state.vitals.bloodSugar,
      systolicBP: state.vitals.bloodPressure.systolic,
      diastolicBP: state.vitals.bloodPressure.diastolic,
      cholesterol: state.vitals.cholesterol,
      liverEnzyme: state.vitals.liverEnzyme,
      kidneyFunction: state.vitals.kidneyFunction,
      heartRate: state.vitals.heartRate,
      oxygenSaturation: state.vitals.oxygenSaturation,
      temperature: state.vitals.temperature,
      bmi: state.vitals.bmi || 0
    };
  }

  private calculateZScore(value: number, metric: string): number {
    // These would ideally come from a larger population dataset
    const meansByMetric: Record<string, number> = {
      bloodSugar: 100,
      systolicBP: 120,
      diastolicBP: 80,
      cholesterol: 180,
      liverEnzyme: 30,
      kidneyFunction: 90
    };

    const stdDevsByMetric: Record<string, number> = {
      bloodSugar: 15,
      systolicBP: 10,
      diastolicBP: 8,
      cholesterol: 20,
      liverEnzyme: 5,
      kidneyFunction: 10
    };

    const mean = meansByMetric[metric] || 0;
    const stdDev = stdDevsByMetric[metric] || 1;

    return (value - mean) / stdDev;
  }

  private calculateCorrelation(x: number, y: number): {
    coefficient: number;
    significance: number;
  } {
    // Simplified correlation calculation
    // In practice, this would use historical data points
    const coefficient = Math.random() * 2 - 1; // Mock correlation
    const significance = Math.random(); // Mock significance

    return { coefficient, significance };
  }
}