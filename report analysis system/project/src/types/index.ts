export interface MedicalReport {
  id: string;
  timestamp: number;
  text: string;
  images: string[];
  analysis: ReportAnalysis;
}

export interface ReportAnalysis {
  anomalies: Anomaly[];
  predictions: Prediction[];
  healthScore: number;
  insights: string[];
}

export interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  location: string;
}

export interface Prediction {
  metric: string;
  value: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}