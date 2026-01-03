import { useState } from 'react';
import { ChevronLeft, Calculator } from 'lucide-react';

interface InputScreenProps {
  onBack: () => void;
  onAnalyze: (data: AssessmentInput) => void;
  isLoading: boolean;
  errorMessage: string | null;
}

export interface AssessmentInput {
  materialType: string;
  temperature: number;
  exposureTime: number;
  environment: string;
}

export default function InputScreen({
  onBack,
  onAnalyze,
  isLoading,
  errorMessage,
}: InputScreenProps) {
  const [materialType, setMaterialType] = useState('polymer');
  const [temperature, setTemperature] = useState(500);
  const [exposureTime, setExposureTime] = useState(30);
  const [environment, setEnvironment] = useState('open-air');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnalyze({
      materialType,
      temperature,
      exposureTime,
      environment,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-3xl mx-auto py-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Overview
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Material Assessment Input
          </h1>
          <p className="text-slate-600 mb-8">
            Define the testing conditions for fire resistance analysis
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Material Type
              </label>
              <select
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              >
                <option value="polymer">Polymer</option>
                <option value="composite">Composite</option>
                <option value="generic">Generic Material</option>
              </select>
              <p className="text-sm text-slate-500 mt-1">
                Select the primary material classification
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Temperature (°C)
              </label>
              <input
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                min="0"
                max="2000"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              <p className="text-sm text-slate-500 mt-1">
                Maximum thermal exposure temperature (0-2000°C)
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Exposure Time (minutes)
              </label>
              <input
                type="number"
                value={exposureTime}
                onChange={(e) => setExposureTime(Number(e.target.value))}
                min="1"
                max="480"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              <p className="text-sm text-slate-500 mt-1">
                Duration of continuous thermal exposure (1-480 minutes)
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Environment
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              >
                <option value="open-air">Open Air</option>
                <option value="enclosed">Enclosed / Confined</option>
              </select>
              <p className="text-sm text-slate-500 mt-1">
                Ambient conditions during thermal exposure
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <Calculator className="w-5 h-5" />
              {isLoading ? 'Analyzing...' : 'Analyze Fire Risk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
