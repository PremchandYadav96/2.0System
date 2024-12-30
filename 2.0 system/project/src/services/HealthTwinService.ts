import { HealthPrediction, HealthState, HealthTwin, UUID, VitalSigns } from '../types';

export class HealthTwinService {
  private twins: Map<UUID, HealthTwin> = new Map();

  async createOrUpdateTwin(
    userId: UUID,
    currentState: HealthState
  ): Promise<HealthTwin> {
    const existingTwin = Array.from(this.twins.values())
      .find(twin => twin.userId === userId);

    const twin: HealthTwin = {
      id: existingTwin?.id || crypto.randomUUID(),
      userId,
      currentState,
      predictions: await this.generatePredictions(currentState)
    };

    this.twins.set(twin.id, twin);
    return twin;
  }

  private async generatePredictions(
    state: HealthState
  ): Promise<HealthPrediction[]> {
    const predictions: HealthPrediction[] = [];

    // Calculate cardiovascular risk
    if (this.isAtCardiovascularRisk(state.vitals)) {
      predictions.push({
        condition: 'Cardiovascular Disease',
        probability: this.calculateCardiovascularRisk(state),
        timeframe: '5 years',
        preventiveActions: [
          'Regular exercise (150 minutes/week)',
          'Mediterranean diet',
          'Blood pressure monitoring',
          'Stress management'
        ]
      });
    }

    // Calculate diabetes risk
    if (this.isAtDiabetesRisk(state)) {
      predictions.push({
        condition: 'Type 2 Diabetes',
        probability: this.calculateDiabetesRisk(state),
        timeframe: '10 years',
        preventiveActions: [
          'Weight management',
          'Regular blood sugar monitoring',
          'Limited refined carbohydrate intake',
          'Regular physical activity'
        ]
      });
    }

    return predictions;
  }

  private isAtCardiovascularRisk(vitals: VitalSigns): boolean {
    return (
      vitals.bloodPressure.systolic > 130 ||
      vitals.bloodPressure.diastolic > 80 ||
      vitals.heartRate > 100 ||
      vitals.heartRate < 60
    );
  }

  private calculateCardiovascularRisk(state: HealthState): number {
    let risk = 0;
    
    // Blood pressure contribution
    if (state.vitals.bloodPressure.systolic > 140) risk += 0.2;
    if (state.vitals.bloodPressure.diastolic > 90) risk += 0.15;
    
    // Heart rate contribution
    if (state.vitals.heartRate > 100) risk += 0.1;
    
    // Lifestyle factors
    if (state.lifestyle.exercise < 150) risk += 0.15; // Less than recommended
    if (state.lifestyle.stress >= 4) risk += 0.1; // High stress
    if (state.lifestyle.diet === 'POOR') risk += 0.2;
    
    // Existing conditions
    if (state.conditions.some(c => 
      c.toLowerCase().includes('diabetes') ||
      c.toLowerCase().includes('hypertension')
    )) {
      risk += 0.2;
    }

    return Math.min(risk, 1); // Cap at 100%
  }

  private isAtDiabetesRisk(state: HealthState): boolean {
    return (
      state.lifestyle.exercise < 150 ||
      state.lifestyle.diet === 'POOR' ||
      state.conditions.some(c => c.toLowerCase().includes('prediabetes'))
    );
  }

  private calculateDiabetesRisk(state: HealthState): number {
    let risk = 0;
    
    // Lifestyle factors
    if (state.lifestyle.exercise < 150) risk += 0.2;
    if (state.lifestyle.diet === 'POOR') risk += 0.25;
    if (state.lifestyle.sleep < 6) risk += 0.15;
    
    // Existing conditions
    if (state.conditions.some(c => c.toLowerCase().includes('prediabetes'))) {
      risk += 0.3;
    }
    
    return Math.min(risk, 1);
  }

  async simulateIntervention(
    twinId: UUID,
    changes: Partial<HealthState>
  ): Promise<{
    originalRisk: number;
    newRisk: number;
    recommendations: string[];
  }> {
    const twin = this.twins.get(twinId);
    if (!twin) throw new Error('Health twin not found');

    const originalPredictions = await this.generatePredictions(twin.currentState);
    
    const modifiedState: HealthState = {
      ...twin.currentState,
      ...changes
    };
    
    const newPredictions = await this.generatePredictions(modifiedState);

    // Compare risks for cardiovascular disease as an example
    const originalRisk = originalPredictions.find(
      p => p.condition === 'Cardiovascular Disease'
    )?.probability || 0;

    const newRisk = newPredictions.find(
      p => p.condition === 'Cardiovascular Disease'
    )?.probability || 0;

    const recommendations = this.generateInterventionRecommendations(
      originalRisk,
      newRisk,
      changes
    );

    return { originalRisk, newRisk, recommendations };
  }

  private generateInterventionRecommendations(
    originalRisk: number,
    newRisk: number,
    changes: Partial<HealthState>
  ): string[] {
    const recommendations: string[] = [];

    if (newRisk < originalRisk) {
      recommendations.push(
        'Proposed changes show positive impact on health outcomes',
        'Continue with planned interventions'
      );
    } else {
      recommendations.push(
        'Proposed changes may not be sufficient',
        'Consider additional lifestyle modifications'
      );
    }

    // Add specific recommendations based on changes
    if (changes.lifestyle?.exercise) {
      recommendations.push(
        `Target exercise: ${Math.max(150, changes.lifestyle.exercise)} minutes/week`
      );
    }

    if (changes.lifestyle?.diet) {
      recommendations.push(
        'Maintain balanced nutrition with emphasis on:',
        '- Whole grains',
        '- Lean proteins',
        '- Fresh vegetables and fruits',
        '- Limited processed foods'
      );
    }

    return recommendations;
  }
}