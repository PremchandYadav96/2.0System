interface GeneMarker {
  id: string;
  name: string;
  associatedConditions: {
    condition: string;
    riskContribution: number;
    confidence: number;
  }[];
}

interface EnvironmentalFactor {
  factor: string;
  impact: number; // -1 to 1, negative reduces risk, positive increases
  conditions: string[];
}

export class GeneticRiskCalculator {
  private markers: GeneMarker[] = [
    {
      id: 'rs1801282',
      name: 'PPARG',
      associatedConditions: [
        {
          condition: 'Type 2 Diabetes',
          riskContribution: 0.15,
          confidence: 0.85
        }
      ]
    }
    // Add more markers
  ];

  private environmentalFactors: EnvironmentalFactor[] = [
    {
      factor: 'Regular Exercise',
      impact: -0.3,
      conditions: ['Type 2 Diabetes', 'Cardiovascular Disease']
    },
    {
      factor: 'Smoking',
      impact: 0.4,
      conditions: ['Lung Cancer', 'Cardiovascular Disease']
    }
    // Add more factors
  ];

  calculateConditionRisk(
    geneticData: string,
    condition: string,
    environmentalFactors: string[]
  ): {
    baselineRisk: number;
    adjustedRisk: number;
    confidence: number;
    contributingFactors: string[];
  } {
    // Parse genetic markers from data
    const relevantMarkers = this.findRelevantMarkers(condition);
    const presentMarkers = this.identifyPresentMarkers(
      geneticData,
      relevantMarkers
    );

    // Calculate baseline genetic risk
    const baselineRisk = this.calculateBaselineRisk(presentMarkers, condition);
    const confidence = this.calculateConfidence(presentMarkers, condition);

    // Adjust for environmental factors
    const { adjustedRisk, factors } = this.adjustRiskForEnvironment(
      baselineRisk,
      condition,
      environmentalFactors
    );

    return {
      baselineRisk,
      adjustedRisk,
      confidence,
      contributingFactors: factors
    };
  }

  private findRelevantMarkers(condition: string): GeneMarker[] {
    return this.markers.filter(marker =>
      marker.associatedConditions.some(ac => ac.condition === condition)
    );
  }

  private identifyPresentMarkers(
    geneticData: string,
    relevantMarkers: GeneMarker[]
  ): GeneMarker[] {
    // In reality, this would parse actual genetic data
    // This is a simplified version
    return relevantMarkers.filter(marker =>
      geneticData.includes(marker.id)
    );
  }

  private calculateBaselineRisk(
    markers: GeneMarker[],
    condition: string
  ): number {
    let risk = 0;
    markers.forEach(marker => {
      const relevantCondition = marker.associatedConditions.find(
        ac => ac.condition === condition
      );
      if (relevantCondition) {
        risk += relevantCondition.riskContribution;
      }
    });
    return Math.min(risk, 1); // Cap at 100%
  }

  private calculateConfidence(
    markers: GeneMarker[],
    condition: string
  ): number {
    if (markers.length === 0) return 0;

    const confidences = markers
      .map(marker => {
        const relevantCondition = marker.associatedConditions.find(
          ac => ac.condition === condition
        );
        return relevantCondition?.confidence || 0;
      })
      .filter(c => c > 0);

    if (confidences.length === 0) return 0;
    return confidences.reduce((a, b) => a + b) / confidences.length;
  }

  private adjustRiskForEnvironment(
    baselineRisk: number,
    condition: string,
    factors: string[]
  ): {
    adjustedRisk: number;
    factors: string[];
  } {
    let risk = baselineRisk;
    const contributingFactors: string[] = [];

    factors.forEach(factor => {
      const envFactor = this.environmentalFactors.find(ef =>
        ef.factor.toLowerCase() === factor.toLowerCase() &&
        ef.conditions.includes(condition)
      );

      if (envFactor) {
        risk += envFactor.impact;
        contributingFactors.push(
          `${envFactor.factor} (${envFactor.impact > 0 ? 'Increases' : 'Decreases'} risk)`
        );
      }
    });

    return {
      adjustedRisk: Math.max(0, Math.min(1, risk)),
      factors: contributingFactors
    };
  }
}