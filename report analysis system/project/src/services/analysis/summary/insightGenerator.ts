import * as tf from '@tensorflow/tfjs';
import { MedicalParameter, CorrelationInsight, TrendAnalysis } from './types';
import { clinicalTerminology } from './medicalVocabulary';

export class InsightGenerator {
  private model: tf.LayersModel | null = null;

  async initialize(): Promise<void> {
    // Load pre-trained model for parameter relationship analysis
    this.model = await tf.loadLayersModel('indexeddb://medical-insights-model');
  }

  async generateCorrelations(
    parameters: MedicalParameter[]
  ): Promise<CorrelationInsight[]> {
    const insights: CorrelationInsight[] = [];
    const parameterMap = new Map(parameters.map(p => [p.name, p]));

    // Analyze parameter pairs for significant relationships
    for (let i = 0; i < parameters.length; i++) {
      for (let j = i + 1; j < parameters.length; j++) {
        const p1 = parameters[i];
        const p2 = parameters[j];

        const correlation = await this.analyzeParameterCorrelation(p1, p2);
        if (correlation.significance > 0.7) {
          insights.push({
            parameters: [p1.name, p2.name],
            relationship: this.describeRelationship(p1, p2, correlation),
            clinicalSignificance: await this.assessClinicalSignificance(
              p1,
              p2,
              correlation
            ),
            recommendedAction: this.generateRecommendation(p1, p2, correlation)
          });
        }
      }
    }

    return insights;
  }

  private async analyzeParameterCorrelation(
    p1: MedicalParameter,
    p2: MedicalParameter
  ): Promise<{ correlation: number; significance: number }> {
    // Normalize parameter values
    const n1 = (p1.value - p1.normalRange.min) / 
               (p1.normalRange.max - p1.normalRange.min);
    const n2 = (p2.value - p2.normalRange.min) / 
               (p2.normalRange.max - p2.normalRange.min);

    // Use TensorFlow.js for correlation analysis
    const tensor = tf.tensor2d([[n1, n2]]);
    const prediction = this.model!.predict(tensor) as tf.Tensor;
    const [correlation, significance] = await prediction.data();

    tensor.dispose();
    prediction.dispose();

    return { correlation, significance };
  }

  private describeRelationship(
    p1: MedicalParameter,
    p2: MedicalParameter,
    correlation: { correlation: number; significance: number }
  ): string {
    const strength = Math.abs(correlation.correlation);
    const direction = correlation.correlation > 0 ? 'positive' : 'inverse';
    
    let description = '';
    
    if (strength > 0.8) {
      description = `Strong ${direction} correlation between ${p1.name} and ${p2.name}`;
    } else if (strength > 0.5) {
      description = `Moderate ${direction} correlation between ${p1.name} and ${p2.name}`;
    } else {
      description = `Weak ${direction} correlation between ${p1.name} and ${p2.name}`;
    }

    return description;
  }

  private async assessClinicalSignificance(
    p1: MedicalParameter,
    p2: MedicalParameter,
    correlation: { correlation: number; significance: number }
  ): Promise<string> {
    // Use medical knowledge base to interpret correlation
    const significance = [];

    if (p1.significance === 'critical' || p2.significance === 'critical') {
      significance.push('Clinically significant correlation requiring immediate attention');
    }

    if (correlation.significance > 0.9) {
      significance.push('Strong statistical significance');
    }

    // Add specific clinical interpretations based on parameter pairs
    if (p1.name === 'glucose' && p2.name === 'hba1c') {
      significance.push('Indicates long-term glycemic control status');
    }

    return significance.join('. ');
  }

  private generateRecommendation(
    p1: MedicalParameter,
    p2: MedicalParameter,
    correlation: { correlation: number; significance: number }
  ): string {
    const recommendations = [];

    // Generate parameter-specific recommendations
    if (correlation.significance > 0.8) {
      if (p1.significance === 'critical' || p2.significance === 'critical') {
        recommendations.push('Immediate medical consultation recommended');
      }
      
      recommendations.push(
        'Regular monitoring of both parameters advised',
        'Consider specialist evaluation'
      );
    }

    return recommendations.join('. ');
  }
}