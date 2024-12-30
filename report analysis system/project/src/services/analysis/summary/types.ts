export interface MedicalParameter {
  name: string;
  value: number;
  unit: string;
  normalRange: { min: number; max: number };
  trend?: 'increasing' | 'decreasing' | 'stable';
  significance: 'critical' | 'important' | 'normal';
}

export interface CorrelationInsight {
  parameters: string[];
  relationship: string;
  clinicalSignificance: string;
  recommendedAction?: string;
}

export interface TrendAnalysis {
  parameter: string;
  historicalValues: number[];
  prediction: number;
  confidence: number;
  riskLevel: 'low' | 'moderate' | 'high';
}

export interface SummarySection {
  title: string;
  content: string;
  priority: number;
  tags: string[];
}

export interface MedicalSummary {
  overview: string;
  keyFindings: string[];
  detailedAnalysis: SummarySection[];
  recommendations: string[];
  riskAssessment: {
    level: 'low' | 'moderate' | 'high';
    factors: string[];
  };
  followUpActions: string[];
}