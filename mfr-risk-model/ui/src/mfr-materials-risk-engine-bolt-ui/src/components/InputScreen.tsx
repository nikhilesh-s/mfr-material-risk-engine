import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import logoSrc from '../assets/dravix_brand_(1).svg';

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
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e8eaed]">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#5c6770] hover:text-[#e26a2c] transition-all mb-10 font-medium hover:gap-3"
        >
          <ArrowLeft size={20} />
          Back to Home
        </button>

        <div className="bg-white rounded-3xl shadow-xl p-10">
          <div className="flex items-center gap-6 mb-10">
            <img src={logoSrc} alt="Dravix" className="h-16 drop-shadow-sm" />
            <div>
              <h1 className="text-4xl font-bold text-[#2c3e50]">
                Material Assessment Input
              </h1>
              <p className="text-[#a9b1b7] mt-1">
                Inputs represent simplified experimental conditions for comparative, early-stage assessment.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-[#2c3e50] mb-3">
                  Material Type
                </label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="w-full px-5 py-4 bg-[#f8f9fa] border-2 border-transparent rounded-xl focus:ring-2 focus:ring-[#e26a2c] focus:bg-white focus:border-[#e26a2c] outline-none transition-all text-[#2c3e50] font-medium"
                  required
                >
                  <option value="polymer">Polymer</option>
                  <option value="composite">Composite</option>
                  <option value="generic">Generic Material</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#2c3e50] mb-3">
                  Environment
                </label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="w-full px-5 py-4 bg-[#f8f9fa] border-2 border-transparent rounded-xl focus:ring-2 focus:ring-[#e26a2c] focus:bg-white focus:border-[#e26a2c] outline-none transition-all text-[#2c3e50] font-medium"
                  required
                >
                  <option value="open-air">Open Air</option>
                  <option value="enclosed">Enclosed / Confined</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-[#2c3e50] mb-3">
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  min="0"
                  max="2000"
                  className="w-full px-5 py-4 bg-[#f8f9fa] border-2 border-transparent rounded-xl focus:ring-2 focus:ring-[#e26a2c] focus:bg-white focus:border-[#e26a2c] outline-none transition-all text-[#2c3e50] font-medium placeholder:text-[#a9b1b7]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#2c3e50] mb-3">
                  Exposure Time (minutes)
                </label>
                <input
                  type="number"
                  value={exposureTime}
                  onChange={(e) => setExposureTime(Number(e.target.value))}
                  min="1"
                  max="480"
                  className="w-full px-5 py-4 bg-[#f8f9fa] border-2 border-transparent rounded-xl focus:ring-2 focus:ring-[#e26a2c] focus:bg-white focus:border-[#e26a2c] outline-none transition-all text-[#2c3e50] font-medium placeholder:text-[#a9b1b7]"
                  required
                />
              </div>
            </div>

            <p className="text-sm text-[#a9b1b7]">
              Inputs reflect controlled experimental conditions and are used for relative comparisons only.
            </p>

            {errorMessage && (
              <div className="rounded-xl border border-[#9e2a2b] bg-[#f8f9fa] p-3 text-sm text-[#9e2a2b]">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-5 bg-gradient-to-r from-[#e26a2c] to-[#9e2a2b] text-white font-bold rounded-2xl hover:shadow-xl hover:scale-[1.02] transition-all duration-300 text-lg"
            >
              {isLoading ? 'Analyzing...' : 'Analyze Fire Risk'}
            </button>
          </form>

          <div className="mt-8 text-sm text-[#a9b1b7] text-center">
            Dravix v0.2 — Phase 2 Prototype
          </div>
        </div>
      </div>
    </div>
  );
}
