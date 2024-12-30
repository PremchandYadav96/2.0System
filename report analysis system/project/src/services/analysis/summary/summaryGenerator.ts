import * as tf from '@tensorflow/tfjs';
import { 
  MedicalParameter, 
  CorrelationInsight, 
  TrendAnalysis,
  MedicalSummary,
  SummarySection 
} from './types';
import { clinicalTerminology } from './medicalVocabulary';
import { InsightGenerator } from './insightGenerator';

export class SummaryGenerator {
  private insightGenerator: InsightGenerator;
  private nlgModel: tf.LayersModel | null = null;

  constructor() {
    this.insightGenerator = new InsightGenerator();
  }

  async initialize(): Promise<void> {
    await this.insightGenerator.initialize();
    this.nlgModel = await tf.loadLayersModel('indexeddb://medical-nlg-model');
  }

  async generateComprehensiveSummary(
    parameters: MedicalParameter[],
    historicalData?: MedicalParameter[][]
  ): Promise<MedicalSummary> {
    // Generate correlations and trends
    const correlations = await this.insightGenerator.generateCorrelations(parameters);
    const trends = historicalData ? 
      await this.analyzeTrends(parameters, historicalData) : 
      [];

    // Generate detailed analysis sections
    const sections = await this.generateAnalysisSections(
      parameters,
      correlations,
      trends
    );

    // Generate overview and key findings
    const overview = await this.generateOverview(parameters, correlations, trends);
    const keyFindings = await this.generateKeyFindings(
      parameters,
      correlations,
      trends
    );

    // Generate recommendations and risk assessment
    const { recommendations, riskAssessment } = await this.generateRecommendations(
      parameters,
      correlations,
      trends
    );

    return {
      overview,
      keyFindings,
      detailedAnalysis: sections,
      recommendations,
      riskAssessment,
      followUpActions: await this.generateFollowUpActions(
        parameters,
        correlations,
        trends
      )
    };
  }

  private async generateOverview(
    parameters: MedicalParameter[],
    correlations: CorrelationInsight[],
    trends: TrendAnalysis[]
  ): Promise<string> {
    const criticalParams = parameters.filter(p => p.significance === 'critical');
    const significantTrends = trends.filter(t => t.riskLevel === 'high');

    const overviewPoints = [];

    if (criticalParams.length > 0) {
      overviewPoints.push(
        `Critical findings identified in ${criticalParams.length} parameters: ` +
        criticalParams.map(p => p.name).join(', ')
      );
    }

    if (significantTrends.length > 0) {
      overviewPoints.push(
        `Significant trends observed in ${significantTrends.length} parameters: ` +
        significantTrends.map(t => t.parameter).join(', ')
      );
    }

    if (correlations.length > 0) {
      overviewPoints.push(
        `${correlations.length} significant parameter correlations identified`
      );
    }

    return overviewPoints.join('. ');
  }

  private async generateKeyFindings(
    parameters: MedicalParameter[],
    correlations: CorrelationInsight[],
    trends: TrendAnalysis[]
  ): Promise<string[]> {
    const findings: string[] = [];

    // Add critical parameter findings
    parameters
      .filter(p => p.significance === 'critical')
      .forEach(p => {
        const term = clinicalTerminology.parameters[p.name];
        if (term) {
          const status = p.value > p.normalRange.max ? 
            term.interpretations.high[0] : 
            term.interpretations.low[0];
          
          findings.push(
            `${term.formal}: ${p.value} ${p.unit} indicates ${status}`
          );
        }
      });

    // Add significant correlations
    correlations
      .filter(c => c.clinicalSignificance.includes('significant'))
      .forEach(c => {
        findings.push(c.clinicalSignificance);
      });

    // Add concerning trends
    trends
      .filter(t => t.riskLevel === 'high')
      .forEach(t => {
        findings.push(
          `${t.parameter} shows concerning trend with ${t.confidence}% confidence`
        );
      });

    return findings;
  }

  private async generateAnalysisSections(
    parameters: MedicalParameter[],
    correlations: CorrelationInsight[],
    trends: TrendAnalysis[]
  ): Promise<SummarySection[]> {
    const sections: SummarySection[] = [];

    // Generate system-wise analysis
    const systemGroups = this.groupParametersBySystem(parameters);
    for (const [system, params] of systemGroups) {
      sections.push({
        title: `${system} System Analysis`,
        content: await this.generateSystemAnalysis(params, correlations, trends),
        priority: this.calculateSectionPriority(params),
        tags: [system, ...params.map(p => p.name)]
      });
    }

    // Generate trend analysis section
    if (trends.length > 0) {
      sections.push({
        title: 'Temporal Analysis',
        content: await this.generateTrendAnalysis(trends),
        priority: this.calculateTrendPriority(trends),
        tags: ['trends', 'temporal']
      });
    }

    // Sort sections by priority
    return sections.sort((a, b) => b.priority - a.priority);
  }

  private groupParametersBySystem(
    parameters: MedicalParameter[]
  ): Map<string, MedicalParameter[]> {
    const groups = new Map<string, MedicalParameter[]>();
    
    // Implement system classification logic
    // Example: Metabolic, Cardiovascular, Renal, etc.
    
    return groups;
  }

  private async generateSystemAnalysis(
    parameters: MedicalParameter[],
    correlations: CorrelationInsight[],
    trends: TrendAnalysis[]
  ): Promise<string> {
    // Use NLG model to generate natural language analysis
    const input = this.prepareSystemAnalysisInput(parameters, correlations, trends);
    const tensor = tf.tensor2d([input]);
    const prediction = this.nlgModel!.predict(tensor) as tf.Tensor;
    const analysisText = await this.decodeNLGOutput(prediction);
    
    tensor.dispose();
    prediction.dispose();
    
    return analysisText;
  }

  private prepareSystemAnalysisInput(
    parameters: MedicalParameter[],
    correlations: CorrelationInsight[],
    trends: TrendAnalysis[]
  ): number[] {
    // Convert medical data to model input format
    // Implementation details...
    return [];
  }

  private async decodeNLGOutput(prediction: tf.Tensor): Promise<string> {
    // Convert model output to natural language
    // Implementation details...
    return '';
  }

  private calculateSectionPriority(parameters: MedicalParameter[]): number {
    return parameters.reduce((priority, param) => {
      switch (param.significance) {
        case 'critical':
          return priority + 3;
        case 'important':
          return priority + 2;
        default:
          return priority + 1;
      }
    }, 0);
  }

  private calculateTrendPriority(trends: TrendAnalysis[]): number {
    return trends.reduce((priority, trend) => {
      switch (trend.riskLevel) {
        case 'high':
          return priority + 3;
        case 'moderate':
          return priority + 2;
        default:
          return priority + 1;
      }
    }, 0);
  }

  private async generateTrendAnalysis(trends: TrendAnalysis[]): Promise<string> {
    const analysisPoints = [];

    for (const trend of trends) {
      const confidence = trend.confidence > 90 ? 'high' : 
                        trend.confidence > 70 ? 'moderate' : 'low';
      
      analysisPoints.push(
        `${trend.parameter} shows a ${trend.riskLevel} risk trend ` +
        `with ${confidence} confidence (${trend.confidence}%)`
      );
    }

    return analysisPoints.join('. ');
  }

  private async generateRecommendations(
    parameters: MedicalParameter[],
    correlations: CorrelationInsight[],
    trends: TrendAnalysis[]
  ): Promise<{
    recommendations: string[];
    riskAssessment: { level: 'low' | 'moderate' | 'high'; factors: string[] };
  }> {
    const recommendations: string[] = [];
    const riskFactors: string[] = [];

    // Generate parameter-specific recommendations
    parameters
      .filter(p => p.significance !== 'normal')
      .forEach(p => {
        const term = clinicalTerminology.parameters[p.name];
        if (term) {
          recommendations.push(
            ...this.generateParameterRecommendations(p, term)
          );
          if (p.significance === 'critical') {
            riskFactors.push(`Critical ${p.name} levels`);
          }
        }
      });

    // Add correlation-based recommendations
    correlations.forEach(c => {
      if (c.recommendedAction) {
        recommendations.push(c.recommendedAction);
      }
    });

    // Add trend-based recommendations
    trends
      .filter(t => t.riskLevel === 'high')
      .forEach(t => {
        recommendations.push(
          `Close monitoring of ${t.parameter} recommended due to concerning trend`
        );
        riskFactors.push(`Adverse ${t.parameter} trend`);
      });

    // Calculate overall risk level
    const riskLevel = this.calculateOverallRisk(parameters, trends);

    return {
      recommendations: [...new Set(recommendations)],
      riskAssessment: {
        level: riskLevel,
        factors: [...new Set(riskFactors)]
      }
    };
  }

  private generateParameterRecommendations(
    parameter: MedicalParameter,
    terminology: any
  ): string[] {
    const recommendations: string[] = [];

    // Add lifestyle recommendations
    recommendations.push(
      ...terminology.recommendations.lifestyle.map(r => 
        `Consider ${r} to improve ${parameter.name} levels`
      )
    );

    // Add monitoring recommendations
    recommendations.push(
      ...terminology.recommendations.monitoring.map(r =>
        `Implement ${r} to track ${parameter.name}`
      )
    );

    return recommendations;
  }

  private calculateOverallRisk(
    parameters: MedicalParameter[],
    trends: TrendAnalysis[]
  ): 'low' | 'moderate' | 'high' {
    const criticalParams = parameters.filter(p => p.significance === 'critical').length;
    const highRiskTrends = trends.filter(t => t.riskLevel === 'high').length;

    if (criticalParams > 0 || highRiskTrends > 1) {
      return 'high';
    } else if (
      parameters.filter(p => p.significance === 'important').length > 1 ||
      highRiskTrends === 1
    ) {
      return 'moderate';
    }
    return 'low';
  }

  private async generateFollowUpActions(
    parameters: MedicalParameter[],
    correlations: CorrelationInsight[],
    trends: TrendAnalysis[]
  ): Promise<string[]> {
    const actions: string[] = [];

    // Add parameter-specific follow-up actions
    parameters
      .filter(p => p.significance !== 'normal')
      .forEach(p => {
        const term = clinicalTerminology.parameters[p.name];
        if (term) {
          actions.push(
            ...term.recommendations.followUp.map(a =>
              `Schedule ${a} for ${p.name} monitoring`
            )
          );
        }
      });

    // Add correlation-based follow-up actions
    correlations
      .filter(c => c.clinicalSignificance.includes('significant'))
      .forEach(c => {
        actions.push(`Further evaluation of relationship between ${c.parameters.join(' and ')}`);
      });

    // Add trend-based follow-up actions
    trends
      .filter(t => t.riskLevel === 'high')
      .forEach(t => {
        actions.push(`Regular monitoring of ${t.parameter} trend`);
      });

    return [...new Set(actions)];
  }

  private async analyzeTrends(
    currentParameters: MedicalParameter[],
    historicalData: MedicalParameter[][]
  ): Promise<TrendAnalysis[]> {
    const trends: TrendAnalysis[] = [];

    for (const parameter of currentParameters) {
      const historicalValues = historicalData
        .map(data => 
          data.find(p => p.name === parameter.name)?.value
        )
        .filter((v): v is number => v !== undefined);

      if (historicalValues.length >= 3) {
        const prediction = await this.predictTrend(historicalValues);
        trends.push({
          parameter: parameter.name,
          historicalValues,
          prediction: prediction.value,
          confidence: prediction.confidence,
          riskLevel: this.assessTrendRisk(
            parameter,
            historicalValues,
            prediction.value
          )
        });
      }
    }

    return trends;
  }

  private async predictTrend(
    values: number[]
  ): Promise<{ value: number; confidence: number }> {
    // Use TensorFlow.js for trend prediction
    const tensor = tf.tensor2d([values], [1, values.length]);
    const prediction = this.nlgModel!.predict(tensor) as tf.Tensor;
    const [predictedValue, confidence] = await prediction.data();

    tensor.dispose();
    prediction.dispose();

    return {
      value: predictedValue,
      confidence: confidence * 100
    };
  }

  private assessTrendRisk(
    parameter: MedicalParameter,
    historicalValues: number[],
    predictedValue: number
  ): 'low' | 'moderate' | 'high' {
    const volatility = this.calculateVolatility(historicalValues);
    const trend = this.calculateTrendDirection(historicalValues);
    const exceedsRange = predictedValue < parameter.normalRange.min || 
                        predictedValue > parameter.normalRange.max;

    if (volatility > 0.2 && exceedsRange) {
      return 'high';
    } else if (volatility > 0.1 || exceedsRange) {
      return 'moderate';
    }
    return 'low';
  }

  private calculateVolatility(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean;
  }

  private calculateTrendDirection(
    values: number[]
  ): 'increasing' | 'decreasing' | 'stable' {
    const slope = this.calculateLinearRegression(values);
    if (Math.abs(slope) < 0.05) return 'stable';
    return slope > 0 ? 'increasing' : 'decreasing';
  }

  private calculateLinearRegression(values: number[]): number {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumXX = x.reduce((a, b) => a + b * b, 0);

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }
}