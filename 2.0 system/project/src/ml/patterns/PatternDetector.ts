import { HealthPattern } from './HealthPatterns';
import { HealthState } from '../../types';

export class PatternDetector {
  private patterns: HealthPattern[];
  private readonly CONFIDENCE_THRESHOLD = 0.7;

  constructor(patterns: HealthPattern[]) {
    this.patterns = patterns;
  }

  async detectPatterns(
    states: HealthState[],
    timeWindow: number
  ): Promise<Array<{
    pattern: HealthPattern;
    confidence: number;
    matchedIndicators: string[];
    suggestedActions: string[];
  }>> {
    const recentStates = this.filterRecentStates(states, timeWindow);
    const detectedPatterns: Array<{
      pattern: HealthPattern;
      confidence: number;
      matchedIndicators: string[];
      suggestedActions: string[];
    }> = [];

    for (const pattern of this.patterns) {
      const { confidence, matched } = this.evaluatePattern(
        pattern,
        recentStates
      );

      if (confidence >= this.CONFIDENCE_THRESHOLD) {
        detectedPatterns.push({
          pattern,
          confidence,
          matchedIndicators: matched,
          suggestedActions: this.generateActions(pattern, confidence)
        });
      }
    }

    return this.prioritizePatterns(detectedPatterns);
  }

  private filterRecentStates(
    states: HealthState[],
    timeWindow: number
  ): HealthState[] {
    const cutoff = Date.now() - timeWindow;
    return states.filter(state => 
      new Date(state.timestamp).getTime() > cutoff
    );
  }

  private evaluatePattern(
    pattern: HealthPattern,
    states: HealthState[]
  ): {
    confidence: number;
    matched: string[];
  } {
    const matched: string[] = [];
    let totalWeight = 0;
    let weightedMatches = 0;

    for (const indicator of pattern.indicators) {
      const matches = states.some(state => 
        this.matchesIndicator(state, indicator)
      );

      if (matches) {
        matched.push(indicator.marker);
        weightedMatches += indicator.weight;
      }
      totalWeight += indicator.weight;
    }

    return {
      confidence: weightedMatches / totalWeight,
      matched
    };
  }

  private matchesIndicator(
    state: HealthState,
    indicator: HealthPattern['indicators'][0]
  ): boolean {
    const value = this.extractValue(state, indicator.marker);
    if (value === null) return false;

    switch (indicator.condition) {
      case 'ABOVE':
        return value > indicator.values[0];
      case 'BELOW':
        return value < indicator.values[0];
      case 'BETWEEN':
        return value >= indicator.values[0] && 
               value <= indicator.values[1];
      case 'EQUAL':
        return Math.abs(value - indicator.values[0]) < 0.001;
      default:
        return false;
    }
  }

  private extractValue(
    state: HealthState,
    marker: string
  ): number | null {
    // Add complex value extraction logic here
    return null;
  }

  private generateActions(
    pattern: HealthPattern,
    confidence: number
  ): string[] {
    const actions: string[] = [];
    
    if (pattern.actionRequired) {
      actions.push(
        `Consult healthcare provider about ${pattern.name}`,
        `Monitor ${pattern.indicators.map(i => i.marker).join(', ')} closely`
      );
    }

    if (confidence > 0.9) {
      actions.push(
        'Immediate attention recommended',
        'Consider lifestyle modifications'
      );
    }

    return actions;
  }

  private prioritizePatterns(patterns: Array<{
    pattern: HealthPattern;
    confidence: number;
    matchedIndicators: string[];
    suggestedActions: string[];
  }>): typeof patterns {
    return patterns.sort((a, b) => {
      // Sort by significance and confidence
      const scoreA = a.pattern.significance * a.confidence;
      const scoreB = b.pattern.significance * b.confidence;
      return scoreB - scoreA;
    });
  }
}