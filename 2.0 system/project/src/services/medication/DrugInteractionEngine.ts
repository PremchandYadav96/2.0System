interface DrugInteraction {
  severity: 'MILD' | 'MODERATE' | 'SEVERE';
  description: string;
  mechanism: string;
  recommendations: string[];
}

interface DrugClass {
  name: string;
  compounds: string[];
  commonInteractions: {
    withClass: string;
    interaction: DrugInteraction;
  }[];
}

export class DrugInteractionEngine {
  private drugClasses: DrugClass[] = [
    {
      name: 'ACE Inhibitors',
      compounds: ['lisinopril', 'enalapril', 'ramipril'],
      commonInteractions: [
        {
          withClass: 'ARBs',
          interaction: {
            severity: 'SEVERE',
            description: 'Increased risk of adverse effects',
            mechanism: 'Dual RAAS blockade',
            recommendations: [
              'Avoid combination',
              'Monitor kidney function if necessary'
            ]
          }
        }
        // Add more interactions
      ]
    }
    // Add more drug classes
  ];

  private metabolicPathways: Map<string, string[]> = new Map([
    ['CYP3A4', ['simvastatin', 'atorvastatin', 'clarithromycin']],
    ['CYP2D6', ['paroxetine', 'fluoxetine', 'codeine']]
  ]);

  async checkInteractions(
    medications: string[]
  ): Promise<{
    interactions: DrugInteraction[];
    metabolicConflicts: string[];
    recommendations: string[];
  }> {
    const interactions: DrugInteraction[] = [];
    const metabolicConflicts: string[] = [];
    const recommendations: Set<string> = new Set();

    // Check class-based interactions
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const classInteractions = this.findClassInteractions(
          medications[i],
          medications[j]
        );
        
        interactions.push(...classInteractions);
        
        classInteractions.forEach(interaction => {
          interaction.recommendations.forEach(rec => recommendations.add(rec));
        });
      }
    }

    // Check metabolic pathway conflicts
    this.metabolicPathways.forEach((drugs, pathway) => {
      const conflictingDrugs = medications.filter(med => 
        drugs.includes(med.toLowerCase())
      );
      
      if (conflictingDrugs.length > 1) {
        metabolicConflicts.push(
          `Multiple drugs metabolized by ${pathway}: ${conflictingDrugs.join(', ')}`
        );
        recommendations.add(`Monitor for increased side effects of ${conflictingDrugs.join(', ')}`);
      }
    });

    return {
      interactions,
      metabolicConflicts,
      recommendations: Array.from(recommendations)
    };
  }

  private findClassInteractions(
    drug1: string,
    drug2: string
  ): DrugInteraction[] {
    const interactions: DrugInteraction[] = [];
    const class1 = this.findDrugClass(drug1);
    const class2 = this.findDrugClass(drug2);

    if (!class1 || !class2) return interactions;

    class1.commonInteractions.forEach(interaction => {
      if (interaction.withClass === class2.name) {
        interactions.push(interaction.interaction);
      }
    });

    return interactions;
  }

  private findDrugClass(drug: string): DrugClass | undefined {
    return this.drugClasses.find(dc =>
      dc.compounds.includes(drug.toLowerCase())
    );
  }

  async assessCombinationRisk(
    medications: string[]
  ): Promise<{
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
    criticalWarnings: string[];
  }> {
    const { interactions } = await this.checkInteractions(medications);
    
    const severeCount = interactions.filter(
      i => i.severity === 'SEVERE'
    ).length;
    const moderateCount = interactions.filter(
      i => i.severity === 'MODERATE'
    ).length;

    const criticalWarnings = interactions
      .filter(i => i.severity === 'SEVERE')
      .map(i => i.description);

    let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' = 'LOW';
    if (severeCount > 0) riskLevel = 'HIGH';
    else if (moderateCount > 2) riskLevel = 'HIGH';
    else if (moderateCount > 0) riskLevel = 'MODERATE';

    return { riskLevel, criticalWarnings };
  }
}