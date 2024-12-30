export interface MetabolicMarker {
  id: string;
  name: string;
  category: 'LIPID' | 'GLUCOSE' | 'HORMONE' | 'ENZYME' | 'PROTEIN';
  normalRange: {
    min: number;
    max: number;
    unit: string;
  };
  interpretations: Array<{
    range: [number, number];
    significance: string;
    recommendations: string[];
  }>;
}

export const METABOLIC_MARKERS: MetabolicMarker[] = [
  {
    id: "HDL",
    name: "High-Density Lipoprotein",
    category: "LIPID",
    normalRange: {
      min: 40,
      max: 60,
      unit: "mg/dL"
    },
    interpretations: [
      {
        range: [0, 40],
        significance: "Low HDL - increased cardiovascular risk",
        recommendations: [
          "Increase aerobic exercise",
          "Consume healthy fats",
          "Quit smoking if applicable"
        ]
      },
      {
        range: [40, 60],
        significance: "Normal HDL levels",
        recommendations: [
          "Maintain current lifestyle habits",
          "Regular exercise",
          "Balanced diet"
        ]
      }
    ]
  }
  // Many more markers...
];