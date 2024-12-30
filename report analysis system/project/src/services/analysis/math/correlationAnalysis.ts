import * as tf from '@tensorflow/tfjs';
import { MedicalParameter } from '../parameters/types';

export class CorrelationAnalysis {
  // Pearson correlation with statistical significance
  async calculatePearsonCorrelation(
    x: number[],
    y: number[]
  ): Promise<{
    coefficient: number;
    pValue: number;
    significant: boolean;
  }> {
    const n = x.length;
    const xMean = x.reduce((a, b) => a + b) / n;
    const yMean = y.reduce((a, b) => a + b) / n;
    
    let numerator = 0;
    let xDenominator = 0;
    let yDenominator = 0;
    
    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - xMean;
      const yDiff = y[i] - yMean;
      numerator += xDiff * yDiff;
      xDenominator += xDiff * xDiff;
      yDenominator += yDiff * yDiff;
    }
    
    const r = numerator / Math.sqrt(xDenominator * yDenominator);
    const tStat = r * Math.sqrt((n - 2) / (1 - r * r));
    const pValue = this.calculateTDistributionPValue(tStat, n - 2);
    
    return {
      coefficient: r,
      pValue,
      significant: pValue < 0.05
    };
  }

  // Spearman rank correlation for non-linear relationships
  async calculateSpearmanCorrelation(
    x: number[],
    y: number[]
  ): Promise<{
    coefficient: number;
    pValue: number;
    significant: boolean;
  }> {
    const n = x.length;
    const xRanks = this.calculateRanks(x);
    const yRanks = this.calculateRanks(y);
    
    return this.calculatePearsonCorrelation(xRanks, yRanks);
  }

  // Kendall's Tau for ordinal data
  calculateKendallTau(
    x: number[],
    y: number[]
  ): {
    coefficient: number;
    pValue: number;
    significant: boolean;
  } {
    const n = x.length;
    let concordant = 0;
    let discordant = 0;
    
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const xDiff = x[j] - x[i];
        const yDiff = y[j] - y[i];
        if (xDiff * yDiff > 0) concordant++;
        else if (xDiff * yDiff < 0) discordant++;
      }
    }
    
    const tau = (concordant - discordant) / (n * (n - 1) / 2);
    const var0 = (4 * n + 10) / (9 * n * (n - 1));
    const z = tau / Math.sqrt(var0);
    const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));
    
    return {
      coefficient: tau,
      pValue,
      significant: pValue < 0.05
    };
  }

  // Partial correlation controlling for confounding variables
  async calculatePartialCorrelation(
    x: number[],
    y: number[],
    z: number[]
  ): Promise<{
    coefficient: number;
    pValue: number;
    significant: boolean;
  }> {
    const rxy = (await this.calculatePearsonCorrelation(x, y)).coefficient;
    const rxz = (await this.calculatePearsonCorrelation(x, z)).coefficient;
    const ryz = (await this.calculatePearsonCorrelation(y, z)).coefficient;
    
    const coefficient = (rxy - rxz * ryz) / 
                       Math.sqrt((1 - rxz * rxz) * (1 - ryz * ryz));
    
    const n = x.length;
    const tStat = coefficient * Math.sqrt((n - 3) / (1 - coefficient * coefficient));
    const pValue = this.calculateTDistributionPValue(tStat, n - 3);
    
    return {
      coefficient,
      pValue,
      significant: pValue < 0.05
    };
  }

  // Multiple correlation for complex relationships
  async calculateMultipleCorrelation(
    dependent: number[],
    independents: number[][]
  ): Promise<{
    coefficient: number;
    pValue: number;
    significant: boolean;
  }> {
    const n = dependent.length;
    const p = independents.length;
    
    // Create correlation matrix
    const correlationMatrix = await this.createCorrelationMatrix(
      [dependent, ...independents]
    );
    
    // Calculate multiple correlation coefficient
    const Ryy = correlationMatrix[0][0];
    const Ryx = correlationMatrix[0].slice(1);
    const Rxx = correlationMatrix.slice(1).map(row => row.slice(1));
    const RxxInv = this.matrixInverse(Rxx);
    
    const R = Math.sqrt(
      Ryx.reduce((sum, ryx, i) => 
        sum + ryx * RxxInv[i].reduce((sum2, rxx, j) => 
          sum2 + rxx * Ryx[j], 0
        ), 0
      )
    );
    
    // Calculate F-statistic
    const F = (R * R / p) / ((1 - R * R) / (n - p - 1));
    const pValue = this.calculateFDistributionPValue(F, p, n - p - 1);
    
    return {
      coefficient: R,
      pValue,
      significant: pValue < 0.05
    };
  }

  // Helper functions
  private calculateRanks(values: number[]): number[] {
    const sorted = values.slice().sort((a, b) => a - b);
    return values.map(v => sorted.indexOf(v) + 1);
  }

  private normalCDF(x: number): number {
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private erf(x: number): number {
    const t = 1 / (1 + 0.5 * Math.abs(x));
    const tau = t * Math.exp(
      -x * x - 1.26551223 +
      1.00002368 * t +
      0.37409196 * t * t +
      0.09678418 * t * t * t -
      0.18628806 * t * t * t * t +
      0.27886807 * t * t * t * t * t -
      1.13520398 * t * t * t * t * t * t +
      1.48851587 * t * t * t * t * t * t * t -
      0.82215223 * t * t * t * t * t * t * t * t +
      0.17087277 * t * t * t * t * t * t * t * t * t
    );
    return x >= 0 ? 1 - tau : tau - 1;
  }

  private calculateTDistributionPValue(t: number, df: number): number {
    const x = df / (df + t * t);
    return 1 - this.incompleteBeta(x, df/2, 0.5);
  }

  private calculateFDistributionPValue(F: number, df1: number, df2: number): number {
    const x = df2 / (df2 + df1 * F);
    return this.incompleteBeta(x, df2/2, df1/2);
  }

  private incompleteBeta(x: number, a: number, b: number): number {
    // Implementation of incomplete beta function using continued fraction
    const maxIterations = 200;
    const epsilon = 1e-8;
    
    if (x === 0) return 0;
    if (x === 1) return 1;
    
    const lnBeta = this.gammaLn(a + b) - this.gammaLn(a) - this.gammaLn(b);
    const bt = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta);
    
    if (x < (a + 1) / (a + b + 2)) {
      return bt * this.betaCF(x, a, b) / a;
    }
    return 1 - bt * this.betaCF(1 - x, b, a) / b;
  }

  private gammaLn(x: number): number {
    const c = [
      76.18009172947146,
      -86.50532032941677,
      24.01409824083091,
      -1.231739572450155,
      0.1208650973866179e-2,
      -0.5395239384953e-5
    ];
    
    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    
    for (let j = 0; j <= 5; j++) {
      ser += c[j] / ++y;
    }
    
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }

  private betaCF(x: number, a: number, b: number): number {
    const maxIterations = 200;
    const epsilon = 1e-8;
    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;
    let c = 1;
    let d = 1 - qab * x / qap;
    
    if (Math.abs(d) < epsilon) d = epsilon;
    d = 1 / d;
    let h = d;
    
    for (let m = 1; m <= maxIterations; m++) {
      const m2 = 2 * m;
      const aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < epsilon) d = epsilon;
      c = 1 + aa / c;
      if (Math.abs(c) < epsilon) c = epsilon;
      d = 1 / d;
      h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < epsilon) d = epsilon;
      c = 1 + aa / c;
      if (Math.abs(c) < epsilon) c = epsilon;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < epsilon) break;
    }
    
    return h;
  }

  private async createCorrelationMatrix(
    variables: number[][]
  ): Promise<number[][]> {
    const n = variables.length;
    const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        const correlation = await this.calculatePearsonCorrelation(
          variables[i],
          variables[j]
        );
        matrix[i][j] = matrix[j][i] = correlation.coefficient;
      }
    }
    
    return matrix;
  }

  private matrixInverse(matrix: number[][]): number[][] {
    const n = matrix.length;
    const augmented = matrix.map((row, i) => 
      [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]
    );
    
    // Gaussian elimination
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(augmented[j][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = j;
        }
      }
      
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      
      const pivot = augmented[i][i];
      for (let j = i; j < 2 * n; j++) {
        augmented[i][j] /= pivot;
      }
      
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const factor = augmented[j][i];
          for (let k = i; k < 2 * n; k++) {
            augmented[j][k] -= factor * augmented[i][k];
          }
        }
      }
    }
    
    return augmented.map(row => row.slice(n));
  }
}