export interface HealthPattern {
  id: string;
  name: string;
  description: string;
  indicators: Array<{
    marker: string;
    condition: 'ABOVE' | 'BELOW' | 'BETWEEN' | 'EQUAL';
    values: number[];
    weight: number;
  }>;
  timeframe: {
    duration: number;
    unit: 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS';
  };
  significance: number; // 0-1
  actionRequired: boolean;
}

export const HEALTH_PATTERNS: HealthPattern[] = [
  {
    id: "pattern_metabolic_syndrome",
    name: "Metabolic Syndrome Pattern",
    description: "Combination of risk factors indicating metabolic syndrome",
    indicators: [
      {
        marker: "waist_circumference",
        condition: "ABOVE",
        values: [102], // cm for males
        weight: 0.25
      },
      {
        marker: "triglycerides",
        condition: "ABOVE",
        values: [150], // mg/dL
        weight: 0.2
      },
      {
        marker: "hdl",
        condition: "BELOW",
        values: [40], // mg/dL for males
        weight: 0.2
      }
    ],
    timeframe: {
      duration: 3,
      unit: "MONTHS"
    },
    significance: 0.8,
    actionRequired: true
  }
  // Many more patterns...
];