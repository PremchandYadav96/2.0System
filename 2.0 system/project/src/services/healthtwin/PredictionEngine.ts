import { HealthState, VitalSigns } from '../../types';

interface RiskFactor {
  name: string;
  weight: number;
  threshold: number;
  isHigherWorse: boolean;
}

interface DiseaseModel {
  name: string;
  riskFactors: RiskFactor[];
  baselineRisk: number;
  timeHorizon: number; // years
}

export class PredictionEngine {
  private diseaseModels: DiseaseModel[] = [
    {
      name: 'Cardiovascular Disease',
      riskFactors: [
        {
          name: 'systolicBP',
          weight: 0.3,
          threshold: 140,
          isHigherWorse: true
        },
        {
          name: 'exercise',
          weight: 0.2,
          threshold: 150,
          isHigherWorse: false
        }
      ],
      baselineRisk: 0.1,
      timeHorizon: 10
    }
    // Add more disease models
  ];

  async generatePredictions(
    currentState: HealthState,
    historicalStates: HealthState[] = []
  ): Promise<{
    predictions: Map<string, number>;
    confidenceIntervals: Map<string, [number, number]>;
    keyFactors: Map<string, string[]>;
  }> {
    const predictions = new Map<string, number>();
    const confidenceIntervals = new Map<string, [number, number]>();
    const keyFactors = new Map<string, string[]>();

    for (const model of this.diseaseModels) {
      const {
        risk,
        confidence,
        factors
      } = this.calculateDiseaseRisk(
        model,
        currentState,
        historicalStates
      );

      predictions.set(model.name, risk);
      confidenceIntervals.set(
        model.name,
        [
          Math.max(0, risk - (risk * (1 - confidence))),
          Math.min(1, risk + (risk * (1 - confidence)))
        ]
      );
      keyFactors.set(model.name, factors);
    }

    return { predictions, confidenceIntervals, keyFactors };
  }

  private calculateDiseaseRisk(
    model: DiseaseModel,
    currentState: HealthState,
    historicalStates: HealthState[]
  ): {
    risk: number;
    confidence: number;
    factors: string[];
  } {
    let riskScore = model.baselineRisk;
    const contributingFactors: string[] = [];
    
    // Calculate current risk based on risk factors
    for (const factor of model.riskFactors) {
      const value = this.extractValue(currentState, factor.name);
      if (value === null) continue;

      const threshold = factor.threshold;
      const impact = factor.isHigherWorse
        ? (value > threshold ? 1 : -1)
        : (value < threshold ? 1 : -1);

      const deviation = Math.abs(value - threshold) / threshold;
      const contribution = factor.weight * impact * deviation;
      
      riskScore += contribution;

      if (Math.abs(contribution) > 0.05) {
        contributingFactors.push(
          `${factor.name}: ${impact > 0 ? 'Increases' : 'Decreases'} risk by ${Math.abs(contribution * 100).toFixed(1)}%`
        );
      }
    }

    // Adjust for trends if historical data is available
    const trendAdjustment = this.calculateTrendAdjustment(
      model,
      currentState,
      historicalStates
    );
    riskScore += trendAdjustment;

    // Calculate confidence based on data completeness
    const confidence = this.calculateConfidence(
      model,
      currentState,
      historicalStates
    );

    return {
      risk: Math.max(0, Math.min(1, riskScore)),
      confidence,
      factors: contributingFactors
    };
  }

  private extractValue(state: HealthState, factor: string): number | null {
    switch (factor) {
      case 'systolicBP':
        return state.vitals.bloodPressure.systolic;
      case 'exercise':
        return state.lifestyle.exercise;
      // Add more factors
      default:
        return null;
    }
  }

  private calculateTrendAdjustment(
    model: DiseaseModel,
    currentState: HealthState,
    historicalStates: HealthState[]
  ): number {
    if (historicalStates.length < 2) return 0;

    let adjustment = 0;
    for (const factor of model.riskFactors) {
      const values = historicalStates
        .map(state => this.extractValue(state, factor.name))
        .filter((v): v is number => v !== null);

      if (values.length < 2) continue;

      const trend = this.calculateTrend(values);
      adjustment += trend * factor.weight * 0.1;
    }

    return adjustment;
  }

  private calculateTrend(values: number[]): number {
    const changes = values.slice(1).map((v, i) => v - values[i]);
    return changes.reduce((a, b) => a + b, 0) / changes.length;
  }

  private calculateConfidence(
    model: DiseaseModel,
    currentState: HealthState,
    historicalStates: HealthState[]
  ): number {
    // Base confidence on data completeness and historical data
    let confidence = 0.5; // Base confidence

    // Add confidence for each available risk factor
    const availableFactors = model.riskFactors.filter(factor =>
      this.extractValue(currentState, factor.name) !== null
    ).length;
    
    confidence += 0.1 * (availableFactors / model.riskFactors.length);

    // Add confidence for historical data
    if (historicalStates.length > 0) {
      confidence += Math.min(0.2, historicalStates.length * 0.02);
    }

    return Math.min(0.95, confidence); // Cap at 95% confidence
  }
}