import React, { useState } from 'react';
import { FileUpload, Brain, Activity, TrendingUp } from 'lucide-react';
import Dashboard from './components/Dashboard';
import FileUploader from './components/FileUploader';
import Analysis from './components/Analysis';

function App() {
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Brain className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">
                  Medical Report Analyzer
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('upload')}
            className={\`flex items-center px-4 py-2 rounded-lg \${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }\`}
          >
            <FileUpload className="h-5 w-5 mr-2" />
            Upload
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={\`flex items-center px-4 py-2 rounded-lg \${
              activeTab === 'analysis'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }\`}
          >
            <Activity className="h-5 w-5 mr-2" />
            Analysis
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={\`flex items-center px-4 py-2 rounded-lg \${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }\`}
          >
            <TrendingUp className="h-5 w-5 mr-2" />
            Dashboard
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          {activeTab === 'upload' && <FileUploader />}
          {activeTab === 'analysis' && <Analysis />}
          {activeTab === 'dashboard' && <Dashboard />}
        </div>
      </div>
    </div>
  );
}

export default App;