import { HealthState } from '../../types';

export class AnomalyDetector {
  private readonly ZSCORE_THRESHOLD = 3;
  private readonly MIN_SAMPLES = 10;

  async detectAnomalies(
    states: HealthState[]
  ): Promise<Array<{
    timestamp: Date;
    metric: string;
    value: number;
    zscore: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }>> {
    const anomalies: Array<{
      timestamp: Date;
      metric: string;
      value: number;
      zscore: number;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
    }> = [];

    // Group metrics for analysis
    const metrics = this.extractMetrics(states);

    for (const [metric, values] of Object.entries(metrics)) {
      if (values.length < this.MIN_SAMPLES) continue;

      const { mean, stdDev } = this.calculateStats(values);
      
      values.forEach((value, index) => {
        const zscore = Math.abs((value - mean) / stdDev);
        
        if (zscore > this.ZSCORE_THRESHOLD) {
          anomalies.push({
            timestamp: new Date(states[index].timestamp),
            metric,
            value,
            zscore,
            severity: this.calculateSeverity(zscore)
          });
        }
      });
    }

    return this.prioritizeAnomalies(anomalies);
  }

  private extractMetrics(
    states: HealthState[]
  ): Record<string, number[]> {
    const metrics: Record<string, number[]> = {};

    states.forEach(state => {
      // Extract vital signs
      metrics.systolicBP = metrics.systolicBP || [];
      metrics.systolicBP.push(state.vitals.bloodPressure.systolic);

      metrics.diastolicBP = metrics.diastolicBP || [];
      metrics.diastolicBP.push(state.vitals.bloodPressure.diastolic);

      // Add more metrics as needed
    });

    return metrics;
  }

  private calculateStats(
    values: number[]
  ): { mean: number; stdDev: number } {
    const mean = values.reduce((a, b) => a + b) / values.length;
    
    const squaredDiffs = values.map(x => Math.pow(x - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev };
  }

  private calculateSeverity(zscore: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (zscore > 5) return 'HIGH';
    if (zscore > 4) return 'MEDIUM';
    return 'LOW';
  }

  private prioritizeAnomalies(anomalies: Array<{
    timestamp: Date;
    metric: string;
    value: number;
    zscore: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }>): typeof anomalies {
    return anomalies.sort((a, b) => {
      // Sort by severity and zscore
      if (a.severity !== b.severity) {
        return this.severityToNumber(b.severity) - 
               this.severityToNumber(a.severity);
      }
      return b.zscore - a.zscore;
    });
  }

  private severityToNumber(
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
  ): number {
    const map: Record<string, number> = {
      'LOW': 1,
      'MEDIUM': 2,
      'HIGH': 3
    };
    return map[severity];
  }
}