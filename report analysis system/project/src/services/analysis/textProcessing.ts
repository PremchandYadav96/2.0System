import { createWorker, Worker } from 'tesseract.js';
import * as tf from '@tensorflow/tfjs';
import { preprocessImage } from '../imaging/preprocessing';

interface ExtractedData {
  text: string;
  confidence: number;
  structuredData: Map<string, string | number>;
}

export class TextProcessor {
  private worker: Worker | null = null;
  private readonly medicalTerms: Set<string>;
  private readonly valuePatterns: Map<string, RegExp>;

  constructor() {
    this.medicalTerms = new Set([
      'glucose', 'cholesterol', 'triglycerides', 'hemoglobin',
      // Add more medical terms
    ]);

    this.valuePatterns = new Map([
      ['glucose', /(?:glucose|glu|blood sugar)[:\s]*(\d+\.?\d*)/i],
      ['cholesterol', /(?:cholesterol|chol)[:\s]*(\d+\.?\d*)/i],
      // Add more patterns
    ]);
  }

  async initialize(): Promise<void> {
    if (this.worker) return;

    this.worker = await createWorker();
    await this.worker.loadLanguage('eng');
    await this.worker.initialize('eng');
    
    // Load medical terminology specific training data
    await this.worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:-% ',
    });
  }

  private async cleanText(text: string): Promise<string> {
    // Remove noise and standardize format
    return text
      .replace(/[^\w\s.,:-]/g, '') // Remove special characters except basic punctuation
      .replace(/\s+/g, ' ') // Standardize whitespace
      .replace(/(\d),(\d)/g, '$1.$2') // Convert comma decimals to periods
      .trim();
  }

  private extractStructuredData(text: string): Map<string, string | number> {
    const structuredData = new Map<string, string | number>();

    // Extract values using patterns
    for (const [key, pattern] of this.valuePatterns.entries()) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1]);
        if (!isNaN(value)) {
          structuredData.set(key, value);
        }
      }
    }

    // Extract dates
    const datePattern = /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g;
    const dates = text.match(datePattern);
    if (dates) {
      structuredData.set('dates', dates);
    }

    return structuredData;
  }

  private async validateExtraction(
    data: ExtractedData,
    originalImage: string
  ): Promise<boolean> {
    if (data.confidence < 65) return false;

    // Verify extracted numbers are within reasonable ranges
    for (const [key, value] of data.structuredData.entries()) {
      if (typeof value === 'number') {
        if (value < 0 || value > 1000000) {
          return false;
        }
      }
    }

    // Additional validation using ML model could be added here

    return true;
  }

  async processText(imageData: string): Promise<ExtractedData> {
    if (!this.worker) {
      await this.initialize();
    }

    try {
      // Preprocess image
      const preprocessedImage = await preprocessImage(imageData);

      // Perform OCR
      const { data } = await this.worker!.recognize(preprocessedImage);
      const cleanedText = await this.cleanText(data.text);
      
      // Extract structured data
      const structuredData = this.extractStructuredData(cleanedText);

      const result = {
        text: cleanedText,
        confidence: data.confidence,
        structuredData
      };

      // Validate extraction
      const isValid = await this.validateExtraction(result, imageData);
      if (!isValid) {
        throw new Error('Extraction validation failed');
      }

      return result;
    } catch (error) {
      console.error('Text processing failed:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}