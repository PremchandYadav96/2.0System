import { MetricAnalyzer, ReferenceRange, AnalysisResult } from '../types';

export class VitalSignsAnalyzer implements MetricAnalyzer {
  private readonly referenceRanges: Record<string, ReferenceRange> = {
    'systolic_bp': { min: 90, max: 120, unit: 'mmHg', critical: { min: 70, max: 180 } },
    'diastolic_bp': { min: 60, max: 80, unit: 'mmHg', critical: { min: 40, max: 120 } },
    'heart_rate': { min: 60, max: 100, unit: 'bpm', critical: { min: 40, max: 150 } },
    'respiratory_rate': { min: 12, max: 20, unit: 'breaths/min', critical: { min: 8, max: 30 } },
    'temperature': { min: 36.5, max: 37.5, unit: '°C', critical: { min: 35, max: 40 } },
    'oxygen_saturation': { min: 95, max: 100, unit: '%', critical: { min: 90, max: 100 } },
  };

  private calculateSeverity(value: number, range: ReferenceRange): 'low' | 'medium' | 'high' {
    if (value < range.critical.min || value > range.critical.max) {
      return 'high';
    }
    if (value < range.min || value > range.max) {
      return 'medium';
    }
    return 'low';
  }

  private analyzeVitalSign(name: string, value: number): AnalysisResult {
    const range = this.referenceRanges[name];
    if (!range) {
      throw new Error(`Unknown vital sign: ${name}`);
    }

    const severity = this.calculateSeverity(value, range);
    let interpretation = '';
    let riskScore = 0;

    // Calculate risk score based on deviation from normal range
    if (value < range.critical.min) {
      riskScore = 100 * (range.critical.min - value) / range.critical.min;
      interpretation = `Critically low ${name}`;
    } else if (value > range.critical.max) {
      riskScore = 100 * (value - range.critical.max) / range.critical.max;
      interpretation = `Critically high ${name}`;
    } else if (value < range.min) {
      riskScore = 50 * (range.min - value) / (range.min - range.critical.min);
      interpretation = `Low ${name}`;
    } else if (value > range.max) {
      riskScore = 50 * (value - range.max) / (range.critical.max - range.max);
      interpretation = `High ${name}`;
    } else {
      interpretation = `Normal ${name}`;
    }

    interpretation += ` (${value} ${range.unit})`;

    return {
      metric: name,
      value,
      unit: range.unit,
      normalRange: { min: range.min, max: range.max },
      criticalRange: range.critical,
      severity,
      riskScore,
      interpretation,
    };
  }

  private detectPatterns(results: AnalysisResult[]): string[] {
    const patterns: string[] = [];
    const metrics = new Map(results.map(r => [r.metric, r]));

    // Hypertensive Crisis Check
    const systolic = metrics.get('systolic_bp')?.value;
    const diastolic = metrics.get('diastolic_bp')?.value;
    if (systolic && diastolic && systolic >= 180 && diastolic >= 120) {
      patterns.push('URGENT: Hypertensive crisis detected. Immediate medical attention required.');
    }

    // Hypotensive Shock Risk
    if (systolic && systolic < 90 && metrics.get('heart_rate')?.value! > 100) {
      patterns.push('WARNING: Possible hypotensive shock. Immediate evaluation needed.');
    }

    // Respiratory Distress
    const respRate = metrics.get('respiratory_rate')?.value;
    const o2sat = metrics.get('oxygen_saturation')?.value;
    if (respRate && o2sat && respRate > 24 && o2sat < 92) {
      patterns.push('ALERT: Signs of respiratory distress present.');
    }

    // Sepsis Risk Assessment
    const temp = metrics.get('temperature')?.value;
    const heartRate = metrics.get('heart_rate')?.value;
    if (
      temp && heartRate && respRate &&
      ((temp > 38.3 || temp < 36.0) &&
      heartRate > 90 &&
      respRate > 20)
    ) {
      patterns.push('WARNING: Vital signs consistent with possible sepsis.');
    }

    return patterns;
  }

  analyze(metrics: Record<string, number>): {
    results: AnalysisResult[];
    patterns: string[];
    overallRisk: number;
  } {
    const results = Object.entries(metrics)
      .filter(([name]) => this.referenceRanges[name])
      .map(([name, value]) => this.analyzeVitalSign(name, value));

    const patterns = this.detectPatterns(results);

    // Calculate overall risk score with weighted importance
    const weights: Record<string, number> = {
      'systolic_bp': 2.0,
      'diastolic_bp': 1.8,
      'heart_rate': 1.5,
      'respiratory_rate': 1.7,
      'temperature': 1.3,
      'oxygen_saturation': 2.0,
    };

    const overallRisk = results.reduce((acc, result) => {
      const weight = weights[result.metric] || 1.0;
      return acc + (result.riskScore * weight);
    }, 0) / results.length;

    return {
      results,
      patterns,
      overallRisk: Math.min(100, overallRisk),
    };
  }
}