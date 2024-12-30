import { DiagnosticTest, TestResult, TestType, UUID } from '../types';

export class DiagnosticService {
  private tests: Map<UUID, DiagnosticTest> = new Map();
  private results: Map<UUID, TestResult[]> = new Map();

  async addTest(test: Omit<DiagnosticTest, 'id'>): Promise<DiagnosticTest> {
    const id = crypto.randomUUID();
    const newTest = { ...test, id };
    this.tests.set(id, newTest);
    return newTest;
  }

  async getTest(id: UUID): Promise<DiagnosticTest | null> {
    return this.tests.get(id) || null;
  }

  async getAllTests(): Promise<DiagnosticTest[]> {
    return Array.from(this.tests.values());
  }

  async recordTestResult(result: Omit<TestResult, 'id'>): Promise<TestResult> {
    const id = crypto.randomUUID();
    const newResult = { ...result, id };
    
    const userResults = this.results.get(result.userId) || [];
    userResults.push(newResult);
    this.results.set(result.userId, userResults);
    
    return newResult;
  }

  async getUserResults(userId: UUID): Promise<TestResult[]> {
    return this.results.get(userId) || [];
  }

  async validateTestResult(testId: UUID, value: number): Promise<boolean> {
    const test = await this.getTest(testId);
    if (!test || !test.normalRange) return true;
    
    return value >= test.normalRange.min && value <= test.normalRange.max;
  }

  async analyzeResults(userId: UUID, testType: TestType): Promise<{
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    average: number;
    lastResult?: TestResult;
  }> {
    const results = (await this.getUserResults(userId))
      .filter(r => (this.tests.get(r.testId)?.type === testType))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (results.length === 0) {
      return { trend: 'STABLE', average: 0 };
    }

    const values = results.map(r => r.value);
    const average = values.reduce((a, b) => a + b, 0) / values.length;

    // Calculate trend based on last 3 results
    if (results.length >= 3) {
      const recent = values.slice(0, 3);
      const trend = recent[0] > recent[1] && recent[1] > recent[2]
        ? 'IMPROVING'
        : recent[0] < recent[1] && recent[1] < recent[2]
          ? 'DECLINING'
          : 'STABLE';
      
      return { trend, average, lastResult: results[0] };
    }

    return { trend: 'STABLE', average, lastResult: results[0] };
  }
}