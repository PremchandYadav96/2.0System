import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { getReports } from '../services/storage';
import { MedicalReport } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [reports, setReports] = useState<MedicalReport[]>([]);

  useEffect(() => {
    const loadReports = async () => {
      const data = await getReports();
      setReports(data);
    };
    loadReports();
  }, []);

  const healthScoreData = {
    labels: reports.map((report) =>
      new Date(report.timestamp).toLocaleDateString()
    ),
    datasets: [
      {
        label: 'Health Score',
        data: reports.map((report) => report.analysis.healthScore),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Health Score Trend',
      },
    },
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Total Reports
          </h3>
          <p className="text-3xl font-bold text-indigo-600">
            {reports.length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Average Health Score
          </h3>
          <p className="text-3xl font-bold text-indigo-600">
            {reports.length
              ? Math.round(
                  reports.reduce(
                    (acc, report) => acc + report.analysis.healthScore,
                    0
                  ) / reports.length
                )
              : 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Detected Anomalies
          </h3>
          <p className="text-3xl font-bold text-indigo-600">
            {reports.reduce(
              (acc, report) => acc + report.analysis.anomalies.length,
              0
            )}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <Line options={options} data={healthScoreData} />
      </div>
    </div>
  );
}