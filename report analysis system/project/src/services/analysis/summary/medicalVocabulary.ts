export const clinicalTerminology = {
  parameters: {
    glucose: {
      formal: 'Blood Glucose',
      alternates: ['Serum Glucose', 'Plasma Glucose'],
      description: 'Measure of blood sugar concentration',
      interpretations: {
        high: ['hyperglycemia', 'elevated blood glucose'],
        low: ['hypoglycemia', 'decreased blood glucose'],
        normal: ['normoglycemic', 'euglycemic']
      }
    },
    // Add more parameters...
  },

  conditions: {
    diabetic: {
      terms: ['diabetes mellitus', 'hyperglycemic state'],
      modifiers: ['Type 1', 'Type 2', 'gestational'],
      severity: ['mild', 'moderate', 'severe', 'uncontrolled']
    },
    // Add more conditions...
  },

  trends: {
    increasing: ['upward trend', 'progressive elevation', 'gradual increase'],
    decreasing: ['downward trend', 'progressive decline', 'gradual decrease'],
    stable: ['stable', 'maintained', 'consistent']
  },

  recommendations: {
    lifestyle: [
      'dietary modification',
      'increased physical activity',
      'stress management'
    ],
    monitoring: [
      'regular blood glucose monitoring',
      'periodic HbA1c assessment',
      'blood pressure tracking'
    ],
    followUp: [
      'follow-up evaluation',
      'specialist consultation',
      'diagnostic imaging'
    ]
  }
};