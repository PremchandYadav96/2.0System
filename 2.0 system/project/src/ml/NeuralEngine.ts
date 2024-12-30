import * as tf from '@tensorflow/tfjs';
import { HealthState, VitalSigns } from '../types';

export class NeuralEngine {
  private model: tf.LayersModel | null = null;
  private readonly inputSize = 10;
  private readonly hiddenLayers = [64, 32, 16];

  async initialize(): Promise<void> {
    this.model = tf.sequential();
    
    // Input layer
    this.model.add(tf.layers.dense({
      units: this.hiddenLayers[0],
      activation: 'relu',
      inputShape: [this.inputSize]
    }));

    // Hidden layers
    for (let i = 1; i < this.hiddenLayers.length; i++) {
      this.model.add(tf.layers.dense({
        units: this.hiddenLayers[i],
        activation: 'relu'
      }));
    }

    // Output layer
    this.model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
  }

  async trainOnLocalData(
    states: HealthState[]
  ): Promise<{ accuracy: number; loss: number }> {
    if (!this.model) await this.initialize();

    const { inputs, labels } = this.prepareTrainingData(states);
    
    const result = await this.model!.fit(
      tf.tensor2d(inputs),
      tf.tensor2d(labels),
      {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        shuffle: true
      }
    );

    return {
      accuracy: result.history.acc[result.history.acc.length - 1],
      loss: result.history.loss[result.history.loss.length - 1]
    };
  }

  private prepareTrainingData(states: HealthState[]): {
    inputs: number[][];
    labels: number[][];
  } {
    return {
      inputs: states.map(state => this.stateToVector(state)),
      labels: states.map(state => [this.calculateRiskScore(state)])
    };
  }

  private stateToVector(state: HealthState): number[] {
    return [
      state.vitals.bloodPressure.systolic / 200,
      state.vitals.bloodPressure.diastolic / 120,
      state.vitals.heartRate / 200,
      state.vitals.temperature / 40,
      state.vitals.oxygenSaturation / 100,
      state.lifestyle.exercise / 500,
      state.lifestyle.sleep / 24,
      state.lifestyle.stress / 5,
      this.dietToNumber(state.lifestyle.diet),
      state.conditions.length / 10
    ];
  }

  private dietToNumber(diet: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT'): number {
    const map: Record<string, number> = {
      'POOR': 0,
      'FAIR': 0.33,
      'GOOD': 0.66,
      'EXCELLENT': 1
    };
    return map[diet];
  }

  private calculateRiskScore(state: HealthState): number {
    let score = 0;
    
    // Vital signs contribution
    if (state.vitals.bloodPressure.systolic > 140) score += 0.2;
    if (state.vitals.bloodPressure.diastolic > 90) score += 0.2;
    if (state.vitals.heartRate > 100) score += 0.15;
    if (state.vitals.oxygenSaturation < 95) score += 0.25;
    
    // Lifestyle factors
    if (state.lifestyle.exercise < 150) score += 0.15;
    if (state.lifestyle.sleep < 6) score += 0.1;
    if (state.lifestyle.stress > 3) score += 0.1;
    if (state.lifestyle.diet === 'POOR') score += 0.2;
    
    return Math.min(score, 1);
  }

  async predictRisk(state: HealthState): Promise<{
    risk: number;
    confidence: number;
    features: { name: string; importance: number }[];
  }> {
    if (!this.model) await this.initialize();

    const input = this.stateToVector(state);
    const prediction = await this.model!.predict(
      tf.tensor2d([input])
    ) as tf.Tensor;
    
    const risk = (await prediction.data())[0];

    // Calculate feature importance using integrated gradients
    const features = await this.calculateFeatureImportance(input);

    return {
      risk,
      confidence: this.calculateConfidence(features),
      features
    };
  }

  private async calculateFeatureImportance(
    input: number[]
  ): Promise<{ name: string; importance: number }[]> {
    const featureNames = [
      'Systolic BP',
      'Diastolic BP',
      'Heart Rate',
      'Temperature',
      'Oxygen Saturation',
      'Exercise',
      'Sleep',
      'Stress',
      'Diet',
      'Conditions'
    ];

    const baseline = new Array(this.inputSize).fill(0);
    const steps = 50;
    
    const importances = await Promise.all(
      input.map(async (value, index) => {
        const gradients = [];
        
        for (let step = 0; step < steps; step++) {
          const alpha = step / steps;
          const interpolated = baseline.map((b, i) =>
            i === index ? b + alpha * (value - b) : b
          );
          
          const grad = await this.calculateGradient(interpolated);
          gradients.push(grad[index]);
        }
        
        const importance = gradients.reduce((a, b) => a + b) / steps;
        return { name: featureNames[index], importance: Math.abs(importance) };
      })
    );

    return importances.sort((a, b) => b.importance - a.importance);
  }

  private async calculateGradient(input: number[]): Promise<number[]> {
    const inputTensor = tf.tensor2d([input]);
    const gradientTensor = tf.grad(x => 
      this.model!.predict(x) as tf.Tensor
    )(inputTensor);
    
    const gradients = await gradientTensor.data();
    gradientTensor.dispose();
    inputTensor.dispose();
    
    return Array.from(gradients);
  }

  private calculateConfidence(
    features: { name: string; importance: number }[]
  ): number {
    const totalImportance = features.reduce((sum, f) => sum + f.importance, 0);
    const normalizedImportances = features.map(f => 
      f.importance / totalImportance
    );
    
    // Higher confidence if feature importance is well-distributed
    const entropy = normalizedImportances.reduce((sum, p) => 
      sum - p * Math.log2(p),
      0
    );
    
    return Math.min(0.95, entropy / Math.log2(features.length));
  }
}