import { Symptom } from '../../types';

interface SymptomPattern {
  symptoms: string[];
  severity: number;
  urgency: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  condition: string;
}

export class SymptomAnalyzer {
  private patterns: SymptomPattern[] = [
    {
      symptoms: ['chest pain', 'shortness of breath', 'arm pain'],
      severity: 5,
      urgency: 'CRITICAL',
      condition: 'Possible Heart Attack'
    },
    {
      symptoms: ['sudden confusion', 'severe headache', 'difficulty speaking'],
      severity: 5,
      urgency: 'CRITICAL',
      condition: 'Possible Stroke'
    },
    // Add more patterns
  ];

  analyzeSymptomCombination(symptoms: Symptom[]): {
    possibleConditions: string[];
    urgencyLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    recommendedActions: string[];
  } {
    const symptomNames = symptoms.map(s => s.name.toLowerCase());
    const matchingPatterns = this.patterns.filter(pattern =>
      this.hasMatchingSymptoms(symptomNames, pattern.symptoms)
    );

    const urgencyLevel = this.determineUrgencyLevel(
      symptoms,
      matchingPatterns
    );

    return {
      possibleConditions: matchingPatterns.map(p => p.condition),
      urgencyLevel,
      recommendedActions: this.getRecommendedActions(urgencyLevel, matchingPatterns)
    };
  }

  private hasMatchingSymptoms(
    userSymptoms: string[],
    patternSymptoms: string[]
  ): boolean {
    const matchCount = patternSymptoms.filter(s =>
      userSymptoms.some(us => us.includes(s))
    ).length;
    
    return matchCount >= Math.ceil(patternSymptoms.length * 0.7);
  }

  private determineUrgencyLevel(
    symptoms: Symptom[],
    patterns: SymptomPattern[]
  ): 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' {
    // Check for critical patterns first
    if (patterns.some(p => p.urgency === 'CRITICAL')) {
      return 'CRITICAL';
    }

    // Check severity of symptoms
    const maxSeverity = Math.max(...symptoms.map(s => s.severity));
    const avgSeverity = symptoms.reduce((sum, s) => sum + s.severity, 0) / symptoms.length;

    if (maxSeverity === 5 || avgSeverity > 4) return 'CRITICAL';
    if (maxSeverity === 4 || avgSeverity > 3) return 'HIGH';
    if (maxSeverity === 3 || avgSeverity > 2) return 'MODERATE';
    return 'LOW';
  }

  private getRecommendedActions(
    urgency: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL',
    patterns: SymptomPattern[]
  ): string[] {
    const actions: string[] = [];

    switch (urgency) {
      case 'CRITICAL':
        actions.push(
          'Call emergency services immediately (911)',
          'Do not drive yourself to the hospital',
          'Stay calm and seated or lying down',
          'If available, unlock door for emergency responders'
        );
        break;
      case 'HIGH':
        actions.push(
          'Visit nearest emergency room',
          'Have someone drive you if possible',
          'Prepare list of current medications'
        );
        break;
      case 'MODERATE':
        actions.push(
          'Contact your primary care physician',
          'Monitor symptoms closely',
          'Seek urgent care if symptoms worsen'
        );
        break;
      case 'LOW':
        actions.push(
          'Rest and monitor symptoms',
          'Take over-the-counter medications if appropriate',
          'Schedule routine doctor visit if symptoms persist'
        );
        break;
    }

    // Add pattern-specific actions
    patterns.forEach(pattern => {
      switch (pattern.condition) {
        case 'Possible Heart Attack':
          actions.push(
            'Chew aspirin if available and no known allergies',
            'Loosen tight clothing',
            'Stay still and try to remain calm'
          );
          break;
        case 'Possible Stroke':
          actions.push(
            'Note time symptoms started',
            'Perform FAST test (Face, Arms, Speech, Time)',
            'Do not eat or drink anything'
          );
          break;
      }
    });

    return actions;
  }
}