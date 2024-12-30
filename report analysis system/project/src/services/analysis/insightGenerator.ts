import * as tf from '@tensorflow/tfjs';
import { ReportAnalysis } from '../../types';

interface MetricThresholds {
  [key: string]: {
    low: number;
    high: number;
    unit: string;
    description: string;
  };
}

export class InsightGenerator {
  private readonly metricThresholds: MetricThresholds = {
    glucose: {
      low: 70,
      high: 100,
      unit: 'mg/dL',
      description: 'blood sugar',
    },
    cholesterol: {
      low: 150,
      high: 200,
      unit: 'mg/dL',
      description: 'total cholesterol',
    },
    // Add more metrics
  };

  private generateMetricInsight(
    metric: string,
    value: number,
    trend: string
  ): string {
    const threshold = this.metricThresholds[metric];
    if (!threshold) return '';

    let insight = `Your ${threshold.description} (${value} ${threshold.unit}) is `;
    
    if (value < threshold.low) {
      insight += `below the recommended range (${threshold.low}-${threshold.high} ${threshold.unit}).`;
    } else if (value > threshold.high) {
      insight += `above the recommended range (${threshold.low}-${threshold.high} ${threshold.unit}).`;
    } else {
      insight += 'within the normal range.';
    }

    if (trend === 'increasing') {
      insight += ' There is an increasing trend which should be monitored.';
    } else if (trend === 'decreasing') {
      insight += ' There is a decreasing trend which should be monitored.';
    }

    return insight;
  }

  private generateCorrelationInsights(analysis: ReportAnalysis): string[] {
    const insights: string[] = [];
    const metrics = analysis.predictions.map(p => ({
      metric: p.metric,
      value: p.value,
      trend: p.trend,
    }));

    // Check for known correlations between metrics
    for (let i = 0; i < metrics.length; i++) {
      for (let j = i + 1; j < metrics.length; j++) {
        const m1 = metrics[i];
        const m2 = metrics[j];

        if (
          m1.metric === 'glucose' && 
          m2.metric === 'cholesterol' &&
          m1.value > this.metricThresholds.glucose.high &&
          m2.value > this.metricThresholds.cholesterol.high
        ) {
          insights.push(
            'Both blood sugar and cholesterol levels are elevated, which may indicate metabolic syndrome.'
          );
        }
        // Add more correlation checks
      }
    }

    return insights;
  }

  private generateAnomalyInsights(analysis: ReportAnalysis): string[] {
    const insights: string[] = [];
    const highSeverityAnomalies = analysis.anomalies.filter(
      a => a.severity === 'high'
    );

    if (highSeverityAnomalies.length > 0) {
      insights.push(
        'Several critical values require immediate attention. Please consult your healthcare provider.'
      );
    }

    // Group anomalies by type
    const anomalyGroups = new Map<string, number>();
    analysis.anomalies.forEach(anomaly => {
      const count = anomalyGroups.get(anomaly.type) || 0;
      anomalyGroups.set(anomaly.type, count + 1);
    });

    anomalyGroups.forEach((count, type) => {
      if (count > 1) {
        insights.push(
          `Multiple abnormalities detected in ${type}. Further investigation may be needed.`
        );
      }
    });

    return insights;
  }

  private calculateHealthScore(analysis: ReportAnalysis): number {
    let score = 100;
    
    // Deduct points for anomalies based on severity
    analysis.anomalies.forEach(anomaly => {
      switch (anomaly.severity) {
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    // Adjust score based on predictions
    analysis.predictions.forEach(prediction => {
      const threshold = this.metricThresholds[prediction.metric];
      if (!threshold) return;

      if (prediction.value < threshold.low || prediction.value > threshold.high) {
        score -= 5;
      }

      if (prediction.trend === 'increasing' && prediction.value > threshold.high) {
        score -= 5;
      } else if (prediction.trend === 'decreasing' && prediction.value < threshold.low) {
        score -= 5;
      }
    });

    return Math.max(0, Math.min(100, score));
  }

  async generateInsights(analysis: ReportAnalysis): Promise<ReportAnalysis> {
    const insights: string[] = [];

    // Generate metric-specific insights
    analysis.predictions.forEach(prediction => {
      const insight = this.generateMetricInsight(
        prediction.metric,
        prediction.value,
        prediction.trend
      );
      if (insight) insights.push(insight);
    });

    // Generate correlation insights
    insights.push(...this.generateCorrelationInsights(analysis));

    // Generate anomaly insights
    insights.push(...this.generateAnomalyInsights(analysis));

    // Calculate health score
    const healthScore = this.calculateHealthScore(analysis);

    return {
      ...analysis,
      insights,
      healthScore,
    };
  }
}