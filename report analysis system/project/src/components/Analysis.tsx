import React, { useEffect, useState } from 'react';
import { AlertTriangle, TrendingUp, Heart } from 'lucide-react';
import { getReports } from '../services/storage';
import { MedicalReport } from '../types';

export default function Analysis() {
  const [reports, setReports] = useState<MedicalReport[]>([]);

  useEffect(() => {
    const loadReports = async () => {
      const data = await getReports();
      setReports(data);
    };
    loadReports();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Analysis Results</h2>
      
      {reports.map((report) => (
        <div
          key={report.id}
          className="bg-gray-50 rounded-lg p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Heart className="h-6 w-6 text-indigo-600" />
              <span className="text-lg font-medium text-gray-900">
                Health Score: {report.analysis.healthScore}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {new Date(report.timestamp).toLocaleString()}
            </span>
          </div>

          {report.analysis.anomalies.length > 0 && (
            <div className="space-y-2">
              <h3 className="flex items-center text-lg font-medium text-gray-900">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                Anomalies Detected
              </h3>
              <ul className="space-y-2">
                {report.analysis.anomalies.map((anomaly, index) => (
                  <li
                    key={index}
                    className="flex items-start space-x-2 text-gray-700"
                  >
                    <span
                      className={\`inline-block w-2 h-2 rounded-full mt-2 \${
                        anomaly.severity === 'high'
                          ? 'bg-red-500'
                          : anomaly.severity === 'medium'
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }\`}
                    />
                    <span>{anomaly.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.analysis.predictions.length > 0 && (
            <div className="space-y-2">
              <h3 className="flex items-center text-lg font-medium text-gray-900">
                <TrendingUp className="h-5 w-5 text-indigo-600 mr-2" />
                Predictions
              </h3>
              <ul className="space-y-2">
                {report.analysis.predictions.map((prediction, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between text-gray-700"
                  >
                    <span>{prediction.metric}</span>
                    <span className="font-medium">{prediction.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">Key Insights</h3>
            <ul className="space-y-2">
              {report.analysis.insights.map((insight, index) => (
                <li key={index} className="text-gray-700">
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}