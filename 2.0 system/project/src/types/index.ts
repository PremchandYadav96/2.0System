// Common Types
export type UUID = string;

export interface User {
  id: UUID;
  name: string;
  email: string;
  dateOfBirth: Date;
  emergencyContacts: EmergencyContact[];
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

// Diagnostic Hub Types
export interface DiagnosticTest {
  id: UUID;
  name: string;
  type: TestType;
  instructions: string[];
  requiredEquipment: string[];
  normalRange?: {
    min: number;
    max: number;
    unit: string;
  };
}

export interface TestResult {
  id: UUID;
  testId: UUID;
  userId: UUID;
  value: number;
  unit: string;
  timestamp: Date;
  notes?: string;
}

export enum TestType {
  BLOOD_GLUCOSE = 'BLOOD_GLUCOSE',
  BLOOD_PRESSURE = 'BLOOD_PRESSURE',
  HEART_RATE = 'HEART_RATE',
  TEMPERATURE = 'TEMPERATURE',
  OXYGEN_SATURATION = 'OXYGEN_SATURATION'
}

// Medication Management Types
export interface Medication {
  id: UUID;
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  instructions: string;
  sideEffects: string[];
  interactions: string[];
  prescribedBy: string;
}

export interface MedicationSchedule {
  id: UUID;
  medicationId: UUID;
  userId: UUID;
  timeSlots: TimeSlot[];
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface TimeSlot {
  time: string; // 24-hour format HH:mm
  taken: boolean;
  takenAt?: Date;
}

// Emergency Room Types
export interface Symptom {
  id: UUID;
  name: string;
  severity: 1 | 2 | 3 | 4 | 5;
  duration: string;
  description: string;
}

export interface EmergencyService {
  id: UUID;
  name: string;
  type: 'HOSPITAL' | 'URGENT_CARE' | 'PHARMACY';
  location: GeoLocation;
  phone: string;
  emergencyServices: string[];
  waitTime?: number;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address: string;
}

// Health Genome Types
export interface GenomeData {
  id: UUID;
  userId: UUID;
  rawData: string;
  provider: string;
  uploadDate: Date;
  analyses: GenomeAnalysis[];
}

export interface GenomeAnalysis {
  condition: string;
  risk: 'LOW' | 'MODERATE' | 'HIGH';
  confidence: number;
  recommendations: string[];
}

// Health Twin Types
export interface HealthTwin {
  id: UUID;
  userId: UUID;
  currentState: HealthState;
  predictions: HealthPrediction[];
}

export interface HealthState {
  vitals: VitalSigns;
  conditions: string[];
  medications: string[];
  lifestyle: LifestyleFactors;
}

export interface HealthPrediction {
  condition: string;
  probability: number;
  timeframe: string;
  preventiveActions: string[];
}

export interface VitalSigns {
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  heartRate: number;
  temperature: number;
  oxygenSaturation: number;
}

export interface LifestyleFactors {
  exercise: number; // minutes per week
  sleep: number; // average hours per day
  stress: 1 | 2 | 3 | 4 | 5;
  diet: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
}