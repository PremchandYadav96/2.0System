export interface GeneMarker {
  id: string;
  name: string;
  chromosome: string;
  position: number;
  alleles: string[];
  associatedTraits: {
    trait: string;
    riskAllele: string;
    oddsRatio: number;
    confidence: number;
    populations: Array<{
      name: string;
      frequency: number;
    }>;
  }[];
}

export const GENETIC_MARKERS: GeneMarker[] = [
  {
    id: "rs1801133",
    name: "MTHFR C677T",
    chromosome: "1",
    position: 11856378,
    alleles: ["C", "T"],
    associatedTraits: [
      {
        trait: "Cardiovascular Disease",
        riskAllele: "T",
        oddsRatio: 1.4,
        confidence: 0.85,
        populations: [
          { name: "European", frequency: 0.33 },
          { name: "Asian", frequency: 0.35 },
          { name: "African", frequency: 0.11 }
        ]
      }
    ]
  },
  {
    id: "rs429358",
    name: "APOE-e4",
    chromosome: "19",
    position: 45411941,
    alleles: ["T", "C"],
    associatedTraits: [
      {
        trait: "Alzheimer's Disease",
        riskAllele: "C",
        oddsRatio: 3.2,
        confidence: 0.92,
        populations: [
          { name: "European", frequency: 0.15 },
          { name: "Asian", frequency: 0.09 },
          { name: "African", frequency: 0.22 }
        ]
      }
    ]
  }
  // Many more markers...
];