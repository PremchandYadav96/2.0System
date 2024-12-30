import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { performOCR } from '../services/ocr';
import { saveReport } from '../services/storage';
import { MedicalReport } from '../types';

export default function FileUploader() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsProcessing(true);
    setProgress(0);

    const files = Array.from(e.dataTransfer.files);
    
    try {
      for (const file of files) {
        setProgress((prev) => prev + (100 / files.length) * 0.5);
        
        const reader = new FileReader();
        const imageData = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const text = await performOCR(imageData);
        setProgress((prev) => prev + (100 / files.length) * 0.5);

        const report: MedicalReport = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          text,
          images: [imageData],
          analysis: {
            anomalies: [],
            predictions: [],
            healthScore: 0,
            insights: [],
          },
        };

        await saveReport(report);
      }
    } catch (error) {
      console.error('Error processing files:', error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, []);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleFileDrop}
      className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center"
    >
      <Upload className="mx-auto h-12 w-12 text-gray-400" />
      <p className="mt-4 text-lg text-gray-600">
        Drag and drop medical reports here
      </p>
      <p className="mt-2 text-sm text-gray-500">
        Supports PDF, PNG, JPEG, and TIFF formats
      </p>
      {isProcessing && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-indigo-600 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="mt-2 text-sm text-gray-600">Processing files...</p>
        </div>
      )}
    </div>
  );
}