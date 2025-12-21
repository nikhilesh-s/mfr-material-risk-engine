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
        return 'bg-green-500';
      case 'Medium':
        return 'bg-yellow-500';
      case 'High':
        return 'bg-red-500';
      default:
        return 'bg-slate-500';
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
        return 'text-green-700';
      case 'Medium':
        return 'text-yellow-700';
      case 'High':
        return 'text-red-700';
      default:
        return 'text-slate-700';
    }
  };

  const getRiskBgColor = (riskClass: string) => {
    switch (riskClass) {
      case 'Low':
        return 'bg-green-50 border-green-200';
      case 'Medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'High':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto py-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Input
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-10 mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Fire Risk Assessment Results
          </h1>
          <p className="text-slate-600 mb-8">
            Analysis for {input.materialType} at {input.temperature}°C for {input.exposureTime} minutes
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <div className="text-sm font-semibold text-slate-600 mb-2">Risk Score</div>
              <div className="text-4xl font-bold text-slate-900">{results.riskScore}</div>
              <div className="text-sm text-slate-500 mt-1">Out of 100</div>
            </div>

            <div className={`rounded-xl p-6 border ${getRiskBgColor(results.riskClass)}`}>
              <div className="text-sm font-semibold text-slate-600 mb-2">Risk Class</div>
              <div className={`flex items-center gap-2 ${getRiskTextColor(results.riskClass)}`}>
                {getRiskIcon(results.riskClass)}
                <span className="text-4xl font-bold">{results.riskClass}</span>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <div className="text-sm font-semibold text-slate-600 mb-2">Resistance Index</div>
              <div className="text-4xl font-bold text-blue-700">{results.resistanceIndex}</div>
              <div className="text-sm text-slate-500 mt-1">Higher is better</div>
            </div>
          </div>

          <div className="mb-8">
            <div className="text-sm font-semibold text-slate-700 mb-3">Risk Level Visualization</div>
            <div className="relative w-full h-8 bg-slate-200 rounded-lg overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full ${getRiskColor(results.riskClass)} transition-all duration-1000 ease-out`}
                style={{ width: `${results.riskScore}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-900">
                {results.riskScore}% Risk
              </div>
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>Low Risk</span>
              <span>High Risk</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-slate-900 mb-1">Comparison</div>
                  <p className="text-slate-700">{results.comparison}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="font-semibold text-slate-900 mb-1">Interpretation</div>
              <p className="text-slate-700">{results.interpretation}</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={onViewInsights}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-slate-800 transition-all"
          >
            View Detailed Insights
          </button>
        </div>
      </div>
    </div>
  );
}
