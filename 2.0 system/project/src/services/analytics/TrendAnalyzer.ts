import { TestResult, UUID } from '../../types';

export class TrendAnalyzer {
  calculateMovingAverage(data: number[], window: number): number[] {
    if (window > data.length) return [];
    
    const result: number[] = [];
    let sum = data.slice(0, window).reduce((a, b) => a + b, 0);
    
    result.push(sum / window);
    
    for (let i = window; i < data.length; i++) {
      sum = sum - data[i - window] + data[i];
      result.push(sum / window);
    }
    
    return result;
  }

  detectAnomalies(data: number[], stdDevThreshold = 2): number[] {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const squaredDiffs = data.map(x => Math.pow(x - mean, 2));
    const stdDev = Math.sqrt(
      squaredDiffs.reduce((a, b) => a + b, 0) / data.length
    );

    return data.filter(x => Math.abs(x - mean) > stdDev * stdDevThreshold);
  }

  async analyzeTestTrends(
    results: TestResult[]
  ): Promise<{
    shortTerm: string;
    longTerm: string;
    anomalies: number[];
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  }> {
    const values = results.map(r => r.value);
    const shortTermTrend = this.calculateMovingAverage(values, 3);
    const longTermTrend = this.calculateMovingAverage(values, 7);
    const anomalies = this.detectAnomalies(values);

    const latestShortTrend = shortTermTrend[shortTermTrend.length - 1];
    const latestLongTrend = longTermTrend[longTermTrend.length - 1];

    const shortTerm = this.describeTrend(shortTermTrend);
    const longTerm = this.describeTrend(longTermTrend);
    
    const riskLevel = this.assessRiskLevel(
      latestShortTrend,
      latestLongTrend,
      anomalies.length
    );

    return { shortTerm, longTerm, anomalies, riskLevel };
  }

  private describeTrend(trend: number[]): string {
    if (trend.length < 2) return 'Insufficient data';

    const changes = trend.slice(1).map((val, i) => val - trend[i]);
    const increasingCount = changes.filter(c => c > 0).length;
    const decreasingCount = changes.filter(c => c < 0).length;
    
    if (increasingCount > decreasingCount * 2) return 'Strongly increasing';
    if (increasingCount > decreasingCount) return 'Slightly increasing';
    if (decreasingCount > increasingCount * 2) return 'Strongly decreasing';
    if (decreasingCount > increasingCount) return 'Slightly decreasing';
    return 'Stable';
  }

  private assessRiskLevel(
    shortTerm: number,
    longTerm: number,
    anomalyCount: number
  ): 'LOW' | 'MODERATE' | 'HIGH' {
    if (anomalyCount > 3 || Math.abs(shortTerm - longTerm) > 20) {
      return 'HIGH';
    }
    if (anomalyCount > 1 || Math.abs(shortTerm - longTerm) > 10) {
      return 'MODERATE';
    }
    return 'LOW';
  }
}