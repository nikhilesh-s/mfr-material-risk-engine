import { ChevronLeft, AlertTriangle, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { AssessmentInput } from './InputScreen';

interface ResultsScreenProps {
  onBack: () => void;
  onViewInsights: () => void;
  input: AssessmentInput;
  results: AssessmentResults;
}

export interface AssessmentResults {
  riskScore: number;
  riskClass: 'Low' | 'Medium' | 'High';
  resistanceIndex: number;
  comparison: string;
  interpretation: string;
}

export default function ResultsScreen({ onBack, onViewInsights, input, results }: ResultsScreenProps) {
  const getRiskColor = (riskClass: string) => {
    switch (riskClass) {
      case 'Low':
        return 'bg-[#8b5e3c]';
      case 'Medium':
        return 'bg-[#e26a2c]';
      case 'High':
        return 'bg-[#9e2a2b]';
      default:
        return 'bg-[#5c6770]';
    }
  };

  const getRiskIcon = (riskClass: string) => {
    switch (riskClass) {
      case 'Low':
        return <CheckCircle className="w-6 h-6" />;
      case 'Medium':
        return <AlertCircle className="w-6 h-6" />;
      case 'High':
        return <AlertTriangle className="w-6 h-6" />;
      default:
        return <Info className="w-6 h-6" />;
    }
  };

  const getRiskTextColor = (riskClass: string) => {
    switch (riskClass) {
      case 'Low':
        return 'text-[#8b5e3c]';
      case 'Medium':
        return 'text-[#e26a2c]';
      case 'High':
        return 'text-[#9e2a2b]';
      default:
        return 'text-[#5c6770]';
    }
  };

  const getRiskBgColor = (riskClass: string) => {
    switch (riskClass) {
      case 'Low':
        return 'bg-[#f4f6f7] border-[#d6c4a1]';
      case 'Medium':
        return 'bg-[#f4f6f7] border-[#e26a2c]';
      case 'High':
        return 'bg-[#f4f6f7] border-[#9e2a2b]';
      default:
        return 'bg-[#f4f6f7] border-[#a9b1b7]';
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f7] p-6">
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-[#5c6770] hover:text-[#8b5e3c] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Input
          </button>
          <img
            src="https://i.imgur.com/756B74g.png"
            alt="Material Fire Risk logo"
            className="h-10"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-10 mb-6 border border-[#d6c4a1]">
          <h1 className="text-3xl font-bold text-[#5c6770] mb-2">
            Fire Risk Assessment Results
          </h1>
          <p className="text-[#5c6770] mb-4">
            Analysis for {input.materialType} at {input.temperature}°C for {input.exposureTime} minutes
          </p>
          <p className="text-sm text-[#5c6770] mb-8">
            This score reflects relative fire failure risk under similar test conditions and is intended for
            comparison, not certification.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#f4f6f7] rounded-xl p-6 border border-[#d6c4a1]">
              <div className="text-sm font-semibold text-[#5c6770] mb-2">Risk Score</div>
              <div className="text-4xl font-bold text-[#5c6770]">{results.riskScore}</div>
              <div className="text-sm text-[#a9b1b7] mt-1">Out of 100</div>
            </div>

            <div className={`rounded-xl p-6 border ${getRiskBgColor(results.riskClass)}`}>
              <div className="text-sm font-semibold text-[#5c6770] mb-2">Risk Class</div>
              <div className={`flex items-center gap-2 ${getRiskTextColor(results.riskClass)}`}>
                {getRiskIcon(results.riskClass)}
                <span className="text-4xl font-bold">{results.riskClass}</span>
              </div>
            </div>

            <div className="bg-[#f4f6f7] rounded-xl p-6 border border-[#d6c4a1]">
              <div className="text-sm font-semibold text-[#5c6770] mb-2">Resistance Index</div>
              <div className="text-4xl font-bold text-[#8b5e3c]">{results.resistanceIndex}</div>
              <div className="text-sm text-[#a9b1b7] mt-1">Higher is better</div>
            </div>
          </div>

          <div className="mb-8">
            <div className="text-sm font-semibold text-[#5c6770] mb-3">Risk Level Visualization</div>
            <div className="relative w-full h-8 bg-[#a9b1b7] rounded-lg overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full ${getRiskColor(results.riskClass)} transition-all duration-1000 ease-out`}
                style={{ width: `${results.riskScore}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white">
                {results.riskScore}% Risk
              </div>
            </div>
            <div className="flex justify-between text-xs text-[#a9b1b7] mt-2">
              <span>Low Risk</span>
              <span>High Risk</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[#f4f6f7] border border-[#d6c4a1] rounded-lg p-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-[#8b5e3c] mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-[#5c6770] mb-1">Comparison</div>
                  <p className="text-[#5c6770]">{results.comparison}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#f4f6f7] border border-[#d6c4a1] rounded-lg p-4">
              <div className="font-semibold text-[#5c6770] mb-1">Interpretation</div>
              <p className="text-[#5c6770]">{results.interpretation}</p>
              <p className="text-xs text-[#a9b1b7] mt-2">
                Interpret as relative risk under similar experimental conditions, not a definitive fire rating.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={onViewInsights}
            className="inline-flex items-center gap-2 bg-[#5c6770] text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-[#8b5e3c] transition-all"
          >
            View Detailed Insights
          </button>
        </div>
      </div>
    </div>
  );
}
