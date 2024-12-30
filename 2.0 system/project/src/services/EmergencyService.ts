import { EmergencyService as IEmergencyService, GeoLocation, Symptom, UUID } from '../types';

export class EmergencyService {
  private services: Map<UUID, IEmergencyService> = new Map();
  private symptoms: Map<UUID, Symptom> = new Map();

  async findNearbyServices(
    location: GeoLocation,
    radius: number,
    type?: IEmergencyService['type']
  ): Promise<IEmergencyService[]> {
    return Array.from(this.services.values())
      .filter(service => {
        if (type && service.type !== type) return false;
        
        // Calculate distance using Haversine formula
        const R = 6371; // Earth's radius in km
        const lat1 = location.latitude * Math.PI / 180;
        const lat2 = service.location.latitude * Math.PI / 180;
        const dLat = (service.location.latitude - location.latitude) * Math.PI / 180;
        const dLon = (service.location.longitude - location.longitude) * Math.PI / 180;

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                 Math.cos(lat1) * Math.cos(lat2) *
                 Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        return distance <= radius;
      })
      .sort((a, b) => {
        // Prioritize by wait time if available
        if (a.waitTime !== undefined && b.waitTime !== undefined) {
          return a.waitTime - b.waitTime;
        }
        return 0;
      });
  }

  async triageSymptoms(symptoms: Symptom[]): Promise<{
    severity: 1 | 2 | 3 | 4 | 5;
    recommendation: string;
    requiresImmediate: boolean;
  }> {
    const maxSeverity = Math.max(...symptoms.map(s => s.severity));
    const criticalSymptoms = symptoms.filter(s => s.severity >= 4);

    const requiresImmediate = maxSeverity >= 4 || criticalSymptoms.length >= 2;

    let recommendation = '';
    if (requiresImmediate) {
      recommendation = 'Seek immediate emergency care';
    } else if (maxSeverity >= 3) {
      recommendation = 'Visit urgent care or contact your doctor immediately';
    } else if (maxSeverity >= 2) {
      recommendation = 'Schedule an appointment with your doctor';
    } else {
      recommendation = 'Monitor symptoms and rest. Contact doctor if symptoms worsen';
    }

    return {
      severity: maxSeverity as 1 | 2 | 3 | 4 | 5,
      recommendation,
      requiresImmediate
    };
  }

  async getEmergencyProtocol(symptomIds: UUID[]): Promise<string[]> {
    const symptoms = symptomIds
      .map(id => this.symptoms.get(id))
      .filter((s): s is Symptom => s !== undefined);

    const protocol: string[] = ['Call emergency services if symptoms worsen'];

    // Add specific protocols based on symptoms
    symptoms.forEach(symptom => {
      switch(symptom.name.toLowerCase()) {
        case 'chest pain':
          protocol.push(
            'Take aspirin if available and no known allergies',
            'Sit or lie down and try to remain calm',
            'Loosen any tight clothing'
          );
          break;
        case 'difficulty breathing':
          protocol.push(
            'Sit upright to help breathing',
            'Open windows for fresh air',
            'Use rescue inhaler if prescribed'
          );
          break;
        case 'severe bleeding':
          protocol.push(
            'Apply direct pressure to wound',
            'Elevate injured area if possible',
            'Use clean cloth or sterile bandage'
          );
          break;
        // Add more specific protocols as needed
      }
    });

    return protocol;
  }
}