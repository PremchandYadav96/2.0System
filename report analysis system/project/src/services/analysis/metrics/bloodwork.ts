import { MetricAnalyzer, ReferenceRange, AnalysisResult } from '../types';

export class BloodworkAnalyzer implements MetricAnalyzer {
  private readonly referenceRanges: Record<string, ReferenceRange> = {
    // Complete Blood Count (CBC)
    'wbc': { min: 4.5, max: 11.0, unit: '10³/µL', critical: { min: 2.0, max: 30.0 } },
    'rbc': { min: 4.5, max: 5.9, unit: '10⁶/µL', critical: { min: 2.5, max: 7.0 } },
    'hemoglobin': { min: 13.5, max: 17.5, unit: 'g/dL', critical: { min: 6.5, max: 20.0 } },
    'hematocrit': { min: 41, max: 53, unit: '%', critical: { min: 20, max: 60 } },
    'platelets': { min: 150, max: 450, unit: '10³/µL', critical: { min: 20, max: 1000 } },

    // Basic Metabolic Panel (BMP)
    'glucose': { min: 70, max: 100, unit: 'mg/dL', critical: { min: 40, max: 500 } },
    'calcium': { min: 8.6, max: 10.2, unit: 'mg/dL', critical: { min: 6.0, max: 14.0 } },
    'sodium': { min: 135, max: 145, unit: 'mEq/L', critical: { min: 120, max: 160 } },
    'potassium': { min: 3.5, max: 5.0, unit: 'mEq/L', critical: { min: 2.5, max: 6.5 } },
    'chloride': { min: 98, max: 106, unit: 'mEq/L', critical: { min: 80, max: 120 } },
    'co2': { min: 23, max: 29, unit: 'mEq/L', critical: { min: 10, max: 40 } },
    'bun': { min: 7, max: 20, unit: 'mg/dL', critical: { min: 2, max: 100 } },
    'creatinine': { min: 0.6, max: 1.2, unit: 'mg/dL', critical: { min: 0.2, max: 10.0 } },

    // Lipid Panel
    'total_cholesterol': { min: 125, max: 200, unit: 'mg/dL', critical: { min: 50, max: 500 } },
    'triglycerides': { min: 0, max: 150, unit: 'mg/dL', critical: { min: 0, max: 1000 } },
    'hdl': { min: 40, max: 60, unit: 'mg/dL', critical: { min: 20, max: 100 } },
    'ldl': { min: 0, max: 100, unit: 'mg/dL', critical: { min: 0, max: 300 } },

    // Liver Function Tests
    'alt': { min: 7, max: 56, unit: 'U/L', critical: { min: 0, max: 1000 } },
    'ast': { min: 10, max: 40, unit: 'U/L', critical: { min: 0, max: 1000 } },
    'alp': { min: 44, max: 147, unit: 'U/L', critical: { min: 0, max: 1000 } },
    'albumin': { min: 3.4, max: 5.4, unit: 'g/dL', critical: { min: 1.0, max: 7.0 } },
    'bilirubin': { min: 0.3, max: 1.2, unit: 'mg/dL', critical: { min: 0.0, max: 20.0 } },

    // Thyroid Panel
    'tsh': { min: 0.4, max: 4.0, unit: 'mIU/L', critical: { min: 0.01, max: 100 } },
    't4': { min: 4.5, max: 12.0, unit: 'µg/dL', critical: { min: 1.0, max: 30.0 } },
    't3': { min: 80, max: 200, unit: 'ng/dL', critical: { min: 20, max: 600 } },

    // Diabetes Tests
    'hba1c': { min: 4.0, max: 5.6, unit: '%', critical: { min: 3.0, max: 15.0 } },
    'insulin': { min: 2.6, max: 24.9, unit: 'µIU/mL', critical: { min: 0.0, max: 100.0 } },
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

  private calculateRiskScore(value: number, range: ReferenceRange): number {
    const normalizedValue = (value - range.min) / (range.max - range.min);
    const criticalLow = (range.critical.min - range.min) / (range.max - range.min);
    const criticalHigh = (range.critical.max - range.min) / (range.max - range.min);

    if (normalizedValue < criticalLow) {
      return 100 * (1 - normalizedValue / criticalLow);
    }
    if (normalizedValue > criticalHigh) {
      return 100 * ((normalizedValue - criticalHigh) / (1 - criticalHigh));
    }
    if (normalizedValue < 0.25 || normalizedValue > 0.75) {
      return 50;
    }
    return 0;
  }

  private analyzeMetric(name: string, value: number): AnalysisResult {
    const range = this.referenceRanges[name];
    if (!range) {
      throw new Error(`Unknown metric: ${name}`);
    }

    const severity = this.calculateSeverity(value, range);
    const riskScore = this.calculateRiskScore(value, range);

    let interpretation = '';
    if (value < range.min) {
      interpretation = `Low ${name} (${value} ${range.unit}) - Below normal range (${range.min}-${range.max} ${range.unit})`;
    } else if (value > range.max) {
      interpretation = `High ${name} (${value} ${range.unit}) - Above normal range (${range.min}-${range.max} ${range.unit})`;
    } else {
      interpretation = `Normal ${name} (${value} ${range.unit}) - Within range (${range.min}-${range.max} ${range.unit})`;
    }

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

  private detectCorrelations(results: AnalysisResult[]): string[] {
    const correlations: string[] = [];
    const metrics = new Map(results.map(r => [r.metric, r]));

    // Metabolic Syndrome Check
    if (
      metrics.get('glucose')?.value! > 100 &&
      metrics.get('triglycerides')?.value! > 150 &&
      metrics.get('hdl')?.value! < 40
    ) {
      correlations.push('Possible metabolic syndrome detected based on glucose, triglycerides, and HDL levels.');
    }

    // Kidney Function Check
    if (
      metrics.get('bun')?.value! > 20 &&
      metrics.get('creatinine')?.value! > 1.2
    ) {
      correlations.push('Elevated BUN and creatinine may indicate decreased kidney function.');
    }

    // Liver Function Check
    if (
      metrics.get('alt')?.value! > 56 &&
      metrics.get('ast')?.value! > 40 &&
      metrics.get('alp')?.value! > 147
    ) {
      correlations.push('Multiple elevated liver enzymes detected. Further evaluation recommended.');
    }

    // Anemia Check
    if (
      metrics.get('hemoglobin')?.value! < 13.5 &&
      metrics.get('hematocrit')?.value! < 41 &&
      metrics.get('rbc')?.value! < 4.5
    ) {
      correlations.push('Low hemoglobin, hematocrit, and RBC count may indicate anemia.');
    }

    return correlations;
  }

  analyze(metrics: Record<string, number>): {
    results: AnalysisResult[];
    correlations: string[];
    overallRisk: number;
  } {
    const results = Object.entries(metrics)
      .filter(([name]) => this.referenceRanges[name])
      .map(([name, value]) => this.analyzeMetric(name, value));

    const correlations = this.detectCorrelations(results);

    // Calculate overall risk score
    const overallRisk = results.reduce((acc, result) => {
      return acc + (result.riskScore * this.getMetricWeight(result.metric));
    }, 0) / results.length;

    return {
      results,
      correlations,
      overallRisk: Math.min(100, overallRisk),
    };
  }

  private getMetricWeight(metric: string): number {
    // Assign weights to different metrics based on their clinical significance
    const weights: Record<string, number> = {
      'glucose': 1.5,
      'potassium': 2.0,
      'sodium': 1.8,
      'hemoglobin': 1.5,
      'platelets': 1.7,
      'creatinine': 1.6,
      'alt': 1.4,
      'ast': 1.4,
      'tsh': 1.3,
      // Default weight for other metrics
      'default': 1.0,
    };

    return weights[metric] || weights.default;
  }
}