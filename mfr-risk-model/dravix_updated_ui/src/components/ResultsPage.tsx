import { ArrowLeft, Info, TrendingUp } from 'lucide-react';
import logoSrc from '../assets/dravix_brand_(1).svg';
import type { AssessmentInput } from './InputPage';

interface ResultsPageProps {
  onNavigate: (page: 'home' | 'input') => void;
  inputData: AssessmentInput;
}

export default function ResultsPage({ onNavigate, inputData }: ResultsPageProps) {
  const riskScore = 67;
  const riskClass = 'Medium';
  const resistanceIndex = '33.0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e8eaed]">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <button
          onClick={() => onNavigate('input')}
          className="flex items-center gap-2 text-[#5c6770] hover:text-[#e26a2c] transition-all mb-10 font-medium hover:gap-3"
        >
          <ArrowLeft size={20} />
          New Assessment
        </button>

        <div className="flex items-center gap-6 mb-10">
          <img src={logoSrc} alt="Dravix" className="h-20 drop-shadow-sm" />
          <div>
            <h1 className="text-5xl font-bold text-[#2c3e50]">
              Assessment Results
            </h1>
            <p className="text-[#a9b1b7] mt-2 text-lg">Comprehensive fire risk analysis</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-[#8b5e3c] to-[#6d4a2e] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm font-bold text-white/80 uppercase tracking-wide">Risk Score</div>
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="text-6xl font-bold mb-2">{riskScore}</div>
              <div className="text-white/70 text-sm font-medium">out of 100</div>
              <div className="mt-6 flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-white/80">Live assessment</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm font-bold text-[#2c3e50] uppercase tracking-wide">Risk Class</div>
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              </div>
            </div>
            <div className="text-5xl font-bold mb-2 text-yellow-600">
              {riskClass}
            </div>
            <div className="text-[#a9b1b7] text-sm font-medium">Classification level</div>
            <div className="mt-6 inline-block px-4 py-2 bg-yellow-50 rounded-full">
              <span className="text-yellow-700 text-sm font-semibold">Moderate Risk</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm font-bold text-[#2c3e50] uppercase tracking-wide">Resistance Index</div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="text-blue-600 font-bold text-sm">RI</div>
              </div>
            </div>
            <div className="text-5xl font-bold mb-2 text-[#2c3e50]">{resistanceIndex}</div>
            <div className="text-[#a9b1b7] text-sm font-medium">Relative scale</div>
            <div className="mt-6 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: '33%' }}></div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold text-[#2c3e50] mb-6">Risk Visualization</h2>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-3">
                  <span className="text-sm font-semibold text-[#2c3e50]">Overall Risk Level</span>
                  <span className="text-sm font-bold text-yellow-600">{riskScore}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-8 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 transition-all duration-500 flex items-center justify-end px-4"
                    style={{ width: `${riskScore}%` }}
                  >
                    <span className="text-white text-xs font-bold drop-shadow">{riskScore}%</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-xs font-semibold pt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-[#a9b1b7]">Low Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-[#a9b1b7]">Medium Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-[#a9b1b7]">High Risk</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold text-[#2c3e50] mb-6">Analysis Summary</h2>
            <p className="text-[#5c6770] leading-relaxed">
              This material shows moderate fire risk under the specified conditions. While not immediately hazardous,
              prolonged exposure or higher temperatures may lead to thermal degradation. Enhanced monitoring or
              protective measures are recommended.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold text-[#2c3e50] mb-6">Assessment Parameters</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-xl">
                <span className="text-sm font-bold text-[#a9b1b7]">Material Type</span>
                <span className="text-[#2c3e50] font-semibold">{inputData.materialType}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-xl">
                <span className="text-sm font-bold text-[#a9b1b7]">Temperature</span>
                <span className="text-[#2c3e50] font-semibold">{inputData.temperature}°C</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-xl">
                <span className="text-sm font-bold text-[#a9b1b7]">Exposure Time</span>
                <span className="text-[#2c3e50] font-semibold">{inputData.exposureTime} minutes</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-xl">
                <span className="text-sm font-bold text-[#a9b1b7]">Environment</span>
                <span className="text-[#2c3e50] font-semibold">{inputData.environment}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold text-[#2c3e50] mb-6">Comparable Materials</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-[#f8f9fa] rounded-xl hover:bg-[#e8eaed] transition-colors">
                <div className="w-2 h-2 bg-[#8b5e3c] rounded-full"></div>
                <span className="text-[#2c3e50] font-medium">Polyethylene (HDPE)</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-[#f8f9fa] rounded-xl hover:bg-[#e8eaed] transition-colors">
                <div className="w-2 h-2 bg-[#8b5e3c] rounded-full"></div>
                <span className="text-[#2c3e50] font-medium">Polypropylene</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-[#f8f9fa] rounded-xl hover:bg-[#e8eaed] transition-colors">
                <div className="w-2 h-2 bg-[#8b5e3c] rounded-full"></div>
                <span className="text-[#2c3e50] font-medium">PVC</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-[#e26a2c] rounded-2xl p-8 flex gap-6 shadow-lg">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-[#e26a2c] bg-opacity-20 rounded-full flex items-center justify-center">
              <Info className="text-[#e26a2c]" size={24} />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-[#2c3e50] mb-3 text-lg">Important Limitations</h3>
            <p className="text-[#5c6770] leading-relaxed">
              This assessment provides a relative comparison based on general material properties and environmental factors.
              Results should not be used as absolute safety ratings. For critical applications, consult certified fire safety
              engineers and conduct standardized testing (e.g., ASTM E84, ISO 5660) to obtain definitive material fire ratings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
