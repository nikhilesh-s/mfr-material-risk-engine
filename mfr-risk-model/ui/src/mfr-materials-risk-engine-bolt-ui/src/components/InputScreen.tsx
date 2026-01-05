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
    <div className="min-h-screen bg-[#f4f6f7] p-6">
      <div className="max-w-3xl mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-[#5c6770] hover:text-[#8b5e3c] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Overview
          </button>
          <img
            src="https://i.imgur.com/756B74g.png"
            alt="Material Fire Risk logo"
            className="h-10"
          />
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-10 border border-[#d6c4a1]">
          <h1 className="text-3xl font-bold text-[#5c6770] mb-2">
            Material Assessment Input
          </h1>
          <p className="text-[#5c6770] mb-8">
            Inputs represent simplified experimental conditions for comparative, early-stage risk assessment.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[#5c6770] mb-2">
                Material Type
              </label>
              <select
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                className="w-full px-4 py-3 border border-[#a9b1b7] rounded-lg focus:ring-2 focus:ring-[#e26a2c] focus:border-transparent outline-none transition-all"
              >
                <option value="polymer">Polymer</option>
                <option value="composite">Composite</option>
                <option value="generic">Generic Material</option>
              </select>
              <p className="text-sm text-[#a9b1b7] mt-1">
                Primary material classification used for comparison
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#5c6770] mb-2">
                Temperature (°C)
              </label>
              <input
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                min="0"
                max="2000"
                className="w-full px-4 py-3 border border-[#a9b1b7] rounded-lg focus:ring-2 focus:ring-[#e26a2c] focus:border-transparent outline-none transition-all"
              />
              <p className="text-sm text-[#a9b1b7] mt-1">
                Simplified heat exposure input for controlled test conditions (0-2000°C)
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#5c6770] mb-2">
                Exposure Time (minutes)
              </label>
              <input
                type="number"
                value={exposureTime}
                onChange={(e) => setExposureTime(Number(e.target.value))}
                min="1"
                max="480"
                className="w-full px-4 py-3 border border-[#a9b1b7] rounded-lg focus:ring-2 focus:ring-[#e26a2c] focus:border-transparent outline-none transition-all"
              />
              <p className="text-sm text-[#a9b1b7] mt-1">
                Exposure duration under simplified test conditions (1-480 minutes)
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#5c6770] mb-2">
                Environment
              </label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full px-4 py-3 border border-[#a9b1b7] rounded-lg focus:ring-2 focus:ring-[#e26a2c] focus:border-transparent outline-none transition-all"
              >
                <option value="open-air">Open Air</option>
                <option value="enclosed">Enclosed / Confined</option>
              </select>
              <p className="text-sm text-[#a9b1b7] mt-1">
                Experimental ambient conditions used for comparative analysis
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-[#9e2a2b] bg-[#f4f6f7] p-3 text-sm text-[#9e2a2b]">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#e26a2c] text-white px-6 py-4 rounded-xl font-semibold shadow-lg hover:bg-[#9e2a2b] transition-all hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
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
