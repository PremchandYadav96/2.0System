import { HealthState, HealthAction } from '../types';

interface StateActionPair {
  state: HealthState;
  action: HealthAction;
  reward: number;
}

export class ReinforcementEngine {
  private qTable: Map<string, Map<string, number>> = new Map();
  private readonly learningRate = 0.1;
  private readonly discountFactor = 0.9;
  private readonly explorationRate = 0.1;

  async updatePolicy(
    currentState: HealthState,
    action: HealthAction,
    nextState: HealthState
  ): Promise<void> {
    const stateKey = this.hashState(currentState);
    const actionKey = this.hashAction(action);
    const reward = this.calculateReward(currentState, action, nextState);

    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, new Map());
    }

    const currentQ = this.qTable.get(stateKey)?.get(actionKey) || 0;
    const nextStateMaxQ = this.getMaxQValue(nextState);

    const newQ = currentQ + this.learningRate * (
      reward + this.discountFactor * nextStateMaxQ - currentQ
    );

    this.qTable.get(stateKey)!.set(actionKey, newQ);
  }

  async suggestAction(
    state: HealthState
  ): Promise<{
    action: HealthAction;
    confidence: number;
    alternatives: { action: HealthAction; value: number }[];
  }> {
    const stateKey = this.hashState(state);
    const actionValues = this.qTable.get(stateKey) || new Map();

    if (Math.random() < this.explorationRate) {
      // Exploration: try a random action
      return this.generateRandomAction(state);
    }

    // Exploitation: choose best known action
    const entries = Array.from(actionValues.entries());
    entries.sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      return this.generateRandomAction(state);
    }

    const bestAction = this.unhashAction(entries[0][0]);
    const confidence = this.calculateConfidence(entries);

    const alternatives = entries.slice(1, 4).map(([actionKey, value]) => ({
      action: this.unhashAction(actionKey),
      value
    }));

    return { action: bestAction, confidence, alternatives };
  }

  private hashState(state: HealthState): string {
    // Discretize continuous values and create a unique string representation
    return JSON.stringify({
      bp: Math.floor(state.vitals.bloodPressure.systolic / 10),
      hr: Math.floor(state.vitals.heartRate / 10),
      exercise: Math.floor(state.lifestyle.exercise / 30),
      stress: state.lifestyle.stress,
      diet: state.lifestyle.diet
    });
  }

  private hashAction(action: HealthAction): string {
    return JSON.stringify(action);
  }

  private unhashAction(hash: string): HealthAction {
    return JSON.parse(hash);
  }

  private calculateReward(
    state: HealthState,
    action: HealthAction,
    nextState: HealthState
  ): number {
    let reward = 0;

    // Reward improvements in vital signs
    if (
      nextState.vitals.bloodPressure.systolic < 
      state.vitals.bloodPressure.systolic &&
      state.vitals.bloodPressure.systolic > 140
    ) {
      reward += 1;
    }

    // Reward increased exercise if previously insufficient
    if (
      nextState.lifestyle.exercise > state.lifestyle.exercise &&
      state.lifestyle.exercise < 150
    ) {
      reward += 0.5;
    }

    // Reward stress reduction
    if (nextState.lifestyle.stress < state.lifestyle.stress) {
      reward += 0.3;
    }

    // Penalize deterioration
    if (
      nextState.vitals.bloodPressure.systolic > 
      state.vitals.bloodPressure.systolic &&
      state.vitals.bloodPressure.systolic > 140
    ) {
      reward -= 1;
    }

    return reward;
  }

  private getMaxQValue(state: HealthState): number {
    const stateKey = this.hashState(state);
    const actionValues = this.qTable.get(stateKey);
    
    if (!actionValues || actionValues.size === 0) return 0;
    
    return Math.max(...actionValues.values());
  }

  private generateRandomAction(state: HealthState): {
    action: HealthAction;
    confidence: number;
    alternatives: { action: HealthAction; value: number }[];
  } {
    // Generate a reasonable random action based on current state
    const action: HealthAction = {
      type: this.selectActionType(state),
      intensity: this.calculateIntensity(state),
      duration: this.calculateDuration(state),
      frequency: this.calculateFrequency(state)
    };

    return {
      action,
      confidence: 0.1, // Low confidence for random actions
      alternatives: [] // No alternatives for random actions
    };
  }

  private selectActionType(state: HealthState): string {
    const options = ['exercise', 'meditation', 'diet_change', 'sleep_hygiene'];
    
    // Bias selection based on state
    if (state.vitals.bloodPressure.systolic > 140) {
      return Math.random() < 0.7 ? 'exercise' : 'meditation';
    }
    
    if (state.lifestyle.stress > 3) {
      return Math.random() < 0.7 ? 'meditation' : 'sleep_hygiene';
    }
    
    return options[Math.floor(Math.random() * options.length)];
  }

  private calculateIntensity(state: HealthState): number {
    // Scale intensity based on current state
    if (state.lifestyle.exercise < 60) {
      return Math.random() * 0.3 + 0.2; // 20-50%
    }
    return Math.random() * 0.4 + 0.4; // 40-80%
  }

  private calculateDuration(state: HealthState): number {
    // Duration in minutes
    if (state.lifestyle.exercise < 60) {
      return Math.floor(Math.random() * 15 + 15); // 15-30 minutes
    }
    return Math.floor(Math.random() * 30 + 30); // 30-60 minutes
  }

  private calculateFrequency(state: HealthState): number {
    // Times per week
    if (state.lifestyle.exercise < 60) {
      return Math.floor(Math.random() * 2 + 2); // 2-3 times
    }
    return Math.floor(Math.random() * 3 + 3); // 3-5 times
  }

  private calculateConfidence(
    actionValues: [string, number][]
  ): number {
    if (actionValues.length < 2) return 0.5;

    // Calculate confidence based on difference between best and second-best
    const bestValue = actionValues[0][1];
    const secondBestValue = actionValues[1][1];
    
    const difference = bestValue - secondBestValue;
    return Math.min(0.95, 0.5 + difference);
  }
}