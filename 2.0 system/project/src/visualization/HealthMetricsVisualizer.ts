import { RadarChart } from './RadarChart';
import { HealthMetric, HealthState } from '../types';
import { MetricsAnalyzer } from '../ml/MetricsAnalyzer';

export class HealthMetricsVisualizer {
  private radarChart: RadarChart;
  private metricsAnalyzer: MetricsAnalyzer;

  constructor(container: string) {
    this.radarChart = new RadarChart(container, {
      width: 800,
      height: 800,
      margin: 100,
      levels: 7
    });
    
    this.metricsAnalyzer = new MetricsAnalyzer();
  }

  async visualizeHealthState(state: HealthState): Promise<void> {
    const metrics = await this.prepareMetrics(state);
    await this.radarChart.render(metrics);
  }

  private async prepareMetrics(state: HealthState): Promise<HealthMetric[]> {
    const analysis = await this.metricsAnalyzer.analyzeState(state);
    
    return [
      {
        name: 'Blood Sugar',
        value: state.vitals.bloodSugar,
        maxValue: 200,
        normalRange: { min: 70, max: 140 },
        trend: analysis.trends.bloodSugar,
        anomaly: analysis.anomalies.bloodSugar
      },
      {
        name: 'Blood Pressure',
        value: state.vitals.bloodPressure.systolic,
        maxValue: 200,
        normalRange: { min: 90, max: 120 },
        trend: analysis.trends.bloodPressure,
        anomaly: analysis.anomalies.bloodPressure
      },
      {
        name: 'Cholesterol',
        value: state.vitals.cholesterol,
        maxValue: 300,
        normalRange: { min: 125, max: 200 },
        trend: analysis.trends.cholesterol,
        anomaly: analysis.anomalies.cholesterol
      },
      {
        name: 'Liver Enzyme',
        value: state.vitals.liverEnzyme,
        maxValue: 100,
        normalRange: { min: 7, max: 56 },
        trend: analysis.trends.liverEnzyme,
        anomaly: analysis.anomalies.liverEnzyme
      },
      {
        name: 'Kidney Function',
        value: state.vitals.kidneyFunction,
        maxValue: 150,
        normalRange: { min: 60, max: 120 },
        trend: analysis.trends.kidneyFunction,
        anomaly: analysis.anomalies.kidneyFunction
      }
    ];
  }
}