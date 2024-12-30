import { Medication, MedicationSchedule, TimeSlot, UUID } from '../types';

export class MedicationService {
  private medications: Map<UUID, Medication> = new Map();
  private schedules: Map<UUID, MedicationSchedule> = new Map();

  async addMedication(medication: Omit<Medication, 'id'>): Promise<Medication> {
    const id = crypto.randomUUID();
    const newMedication = { ...medication, id };
    this.medications.set(id, newMedication);
    return newMedication;
  }

  async createSchedule(
    medicationId: UUID,
    userId: UUID,
    times: string[]
  ): Promise<MedicationSchedule> {
    const medication = this.medications.get(medicationId);
    if (!medication) {
      throw new Error('Medication not found');
    }

    const timeSlots: TimeSlot[] = times.map(time => ({
      time,
      taken: false
    }));

    const schedule: MedicationSchedule = {
      id: crypto.randomUUID(),
      medicationId,
      userId,
      timeSlots,
      status: 'ACTIVE'
    };

    this.schedules.set(schedule.id, schedule);
    return schedule;
  }

  async checkInteractions(medicationIds: UUID[]): Promise<string[]> {
    const medications = medicationIds
      .map(id => this.medications.get(id))
      .filter((med): med is Medication => med !== undefined);

    const interactions: Set<string> = new Set();
    
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        const med1 = medications[i];
        const med2 = medications[j];
        
        // Check if any interactions from med1 mention med2 or vice versa
        const commonInteractions = [
          ...med1.interactions.filter(int => 
            int.toLowerCase().includes(med2.name.toLowerCase())
          ),
          ...med2.interactions.filter(int =>
            int.toLowerCase().includes(med1.name.toLowerCase())
          )
        ];
        
        commonInteractions.forEach(int => interactions.add(int));
      }
    }

    return Array.from(interactions);
  }

  async markDoseTaken(scheduleId: UUID, time: string): Promise<boolean> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) return false;

    const timeSlot = schedule.timeSlots.find(slot => slot.time === time);
    if (!timeSlot) return false;

    timeSlot.taken = true;
    timeSlot.takenAt = new Date();
    return true;
  }

  async getAdherenceRate(userId: UUID): Promise<number> {
    const userSchedules = Array.from(this.schedules.values())
      .filter(schedule => schedule.userId === userId);

    if (userSchedules.length === 0) return 0;

    const totalSlots = userSchedules.reduce(
      (sum, schedule) => sum + schedule.timeSlots.length,
      0
    );

    const takenSlots = userSchedules.reduce(
      (sum, schedule) => sum + schedule.timeSlots.filter(slot => slot.taken).length,
      0
    );

    return (takenSlots / totalSlots) * 100;
  }
}