export enum SystemCategory {
  HEMATOLOGY = 'Hematology',
  BIOCHEMISTRY = 'Biochemistry',
  CARDIAC = 'Cardiac',
  HEPATIC = 'Hepatic',
  RENAL = 'Renal',
  ELECTROLYTES = 'Electrolytes',
  ENDOCRINE = 'Endocrine',
  INFLAMMATORY = 'Inflammatory',
  COAGULATION = 'Coagulation'
}

export enum ParameterType {
  CONTINUOUS = 'continuous',
  CATEGORICAL = 'categorical',
  ORDINAL = 'ordinal'
}

export interface Range {
  min: number;
  max: number;
}

export interface ParameterDefinition {
  name: string;
  unit: string;
  type: ParameterType;
  system: SystemCategory;
  normalRange: Range;
  criticalRange: Range;
  precision: number;
  transformations: string[];
  correlatedParams: string[];
  clinicalSignificance: string;
}