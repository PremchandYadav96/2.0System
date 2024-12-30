import { ParameterDefinition, SystemCategory, ParameterType } from './types';

export const MEDICAL_PARAMETERS: Record<string, ParameterDefinition> = {
  // Hematology Parameters (20)
  hemoglobin: {
    name: 'Hemoglobin',
    unit: 'g/dL',
    type: ParameterType.CONTINUOUS,
    system: SystemCategory.HEMATOLOGY,
    normalRange: { min: 12, max: 16 },
    criticalRange: { min: 7, max: 20 },
    precision: 1,
    transformations: ['log', 'sqrt'],
    correlatedParams: ['hematocrit', 'rbc', 'mcv', 'mch'],
    clinicalSignificance: 'oxygen-carrying capacity'
  },
  wbc: {
    name: 'White Blood Cells',
    unit: '×10³/µL',
    type: ParameterType.CONTINUOUS,
    system: SystemCategory.HEMATOLOGY,
    normalRange: { min: 4.5, max: 11.0 },
    criticalRange: { min: 2.0, max: 30.0 },
    precision: 1,
    transformations: ['log'],
    correlatedParams: ['neutrophils', 'lymphocytes'],
    clinicalSignificance: 'immune system function'
  },
  // ... 18 more hematology parameters

  // Biochemistry Parameters (25)
  glucose: {
    name: 'Fasting Glucose',
    unit: 'mg/dL',
    type: ParameterType.CONTINUOUS,
    system: SystemCategory.BIOCHEMISTRY,
    normalRange: { min: 70, max: 100 },
    criticalRange: { min: 40, max: 500 },
    precision: 0,
    transformations: ['log', 'inverse'],
    correlatedParams: ['hba1c', 'insulin'],
    clinicalSignificance: 'metabolic control'
  },
  // ... 24 more biochemistry parameters

  // Cardiac Markers (12)
  troponin: {
    name: 'Troponin I',
    unit: 'ng/mL',
    type: ParameterType.CONTINUOUS,
    system: SystemCategory.CARDIAC,
    normalRange: { min: 0, max: 0.04 },
    criticalRange: { min: 0, max: 50 },
    precision: 3,
    transformations: ['log'],
    correlatedParams: ['ck_mb', 'ldh'],
    clinicalSignificance: 'myocardial injury'
  },
  // ... 11 more cardiac parameters

  // Liver Function Tests (10)
  alt: {
    name: 'Alanine Aminotransferase',
    unit: 'U/L',
    type: ParameterType.CONTINUOUS,
    system: SystemCategory.HEPATIC,
    normalRange: { min: 7, max: 56 },
    criticalRange: { min: 0, max: 1000 },
    precision: 0,
    transformations: ['log', 'sqrt'],
    correlatedParams: ['ast', 'alp'],
    clinicalSignificance: 'hepatocellular injury'
  },
  // ... 9 more liver parameters

  // Kidney Function Tests (8)
  creatinine: {
    name: 'Serum Creatinine',
    unit: 'mg/dL',
    type: ParameterType.CONTINUOUS,
    system: SystemCategory.RENAL,
    normalRange: { min: 0.6, max: 1.2 },
    criticalRange: { min: 0.2, max: 10.0 },
    precision: 1,
    transformations: ['reciprocal'],
    correlatedParams: ['bun', 'egfr'],
    clinicalSignificance: 'renal function'
  },
  // ... 7 more kidney parameters

  // Electrolytes (7)
  sodium: {
    name: 'Serum Sodium',
    unit: 'mEq/L',
    type: ParameterType.CONTINUOUS,
    system: SystemCategory.ELECTROLYTES,
    normalRange: { min: 135, max: 145 },
    criticalRange: { min: 120, max: 160 },
    precision: 0,
    transformations: ['none'],
    correlatedParams: ['potassium', 'chloride'],
    clinicalSignificance: 'fluid balance'
  },
  // ... 6 more electrolyte parameters

  // Endocrine Parameters (15)
  tsh: {
    name: 'Thyroid Stimulating Hormone',
    unit: 'mIU/L',
    type: ParameterType.CONTINUOUS,
    system: SystemCategory.ENDOCRINE,
    normalRange: { min: 0.4, max: 4.0 },
    criticalRange: { min: 0.01, max: 100 },
    precision: 2,
    transformations: ['log'],
    correlatedParams: ['t3', 't4'],
    clinicalSignificance: 'thyroid function'
  },
  // ... 14 more endocrine parameters

  // Inflammatory Markers (6)
  crp: {
    name: 'C-Reactive Protein',
    unit: 'mg/L',
    type: ParameterType.CONTINUOUS,
    system: SystemCategory.INFLAMMATORY,
    normalRange: { min: 0, max: 3 },
    criticalRange: { min: 0, max: 300 },
    precision: 1,
    transformations: ['log'],
    correlatedParams: ['esr', 'fibrinogen'],
    clinicalSignificance: 'inflammation'
  },
  // ... 5 more inflammatory parameters

  // Coagulation Parameters (5)
  pt: {
    name: 'Prothrombin Time',
    unit: 'seconds',
    type: ParameterType.CONTINUOUS,
    system: SystemCategory.COAGULATION,
    normalRange: { min: 11, max: 13.5 },
    criticalRange: { min: 9, max: 30 },
    precision: 1,
    transformations: ['none'],
    correlatedParams: ['inr', 'ptt'],
    clinicalSignificance: 'coagulation cascade'
  }
  // ... 4 more coagulation parameters
};