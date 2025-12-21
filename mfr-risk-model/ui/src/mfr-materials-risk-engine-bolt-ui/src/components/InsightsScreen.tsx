import { ChevronLeft, AlertCircle, BookOpen, Activity, Home } from 'lucide-react';
import { AssessmentInput, AssessmentResults } from './InputScreen';

interface InsightsScreenProps {
  onBack: () => void;
  onReturnHome: () => void;
  input: AssessmentInput;
  results: AssessmentResults;
}

export default function InsightsScreen({ onBack, onReturnHome, input }: InsightsScreenProps) {
  const getMaterialProperties = (materialType: string) => {
    switch (materialType) {
      case 'polymer':
        return [
          'Organic molecular structure with carbon-based chains',
          'Typical decomposition onset: 200-400°C',
          'Variable thermal conductivity: 0.1-0.5 W/mK',
          'Susceptible to thermal degradation and oxidation',
          'May release combustible volatiles at high temperatures',
        ];
      case 'composite':
        return [
          'Multi-phase material with matrix and reinforcement',
          'Performance depends on constituent materials',
          'Interface degradation critical above 300°C',
          'Anisotropic thermal properties',
          'Delamination risk under thermal stress',
        ];
      case 'generic':
        return [
          'Baseline material properties assumed',
          'Moderate thermal stability',
          'Standard thermal expansion coefficients',
          'General combustibility characteristics',
          'Representative of common structural materials',
        ];
      default:
        return [];
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
          Back to Results
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-10 mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Assessment Insights & Details
          </h1>
          <p className="text-slate-600 mb-8">
            Understanding the analysis, assumptions, and limitations
          </p>

          <div className="space-y-6">
            <div className="border border-slate-200 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-1">
                    Material Properties Summary
                  </h2>
                  <p className="text-sm text-slate-600">
                    Key characteristics of {input.materialType} materials
                  </p>
                </div>
              </div>
              <ul className="space-y-2 ml-13">
                {getMaterialProperties(input.materialType).map((property, index) => (
                  <li key={index} className="flex items-start gap-2 text-slate-700">
                    <span className="text-blue-600 mt-1.5 flex-shrink-0">•</span>
                    <span>{property}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-slate-200 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-1">
                    Model Assumptions
                  </h2>
                  <p className="text-sm text-slate-600">
                    Conditions and constraints used in this analysis
                  </p>
                </div>
              </div>
              <ul className="space-y-2 ml-13">
                <li className="flex items-start gap-2 text-slate-700">
                  <span className="text-orange-600 mt-1.5 flex-shrink-0">•</span>
                  <span>
                    Uniform temperature distribution across material surface
                  </span>
                </li>
                <li className="flex items-start gap-2 text-slate-700">
                  <span className="text-orange-600 mt-1.5 flex-shrink-0">•</span>
                  <span>
                    Standard atmospheric pressure and oxygen availability
                  </span>
                </li>
                <li className="flex items-start gap-2 text-slate-700">
                  <span className="text-orange-600 mt-1.5 flex-shrink-0">•</span>
                  <span>
                    Material thickness and geometry effects normalized
                  </span>
                </li>
                <li className="flex items-start gap-2 text-slate-700">
                  <span className="text-orange-600 mt-1.5 flex-shrink-0">•</span>
                  <span>
                    Steady-state thermal exposure conditions
                  </span>
                </li>
                <li className="flex items-start gap-2 text-slate-700">
                  <span className="text-orange-600 mt-1.5 flex-shrink-0">•</span>
                  <span>
                    No external load or mechanical stress applied
                  </span>
                </li>
              </ul>
            </div>

            <div className="border border-amber-200 bg-amber-50 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">
                    Limitations & Disclaimers
                  </h2>
                  <ul className="space-y-2 text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 mt-1.5 flex-shrink-0">•</span>
                      <span>
                        <strong>Estimates only:</strong> Results are model-based predictions and not certified test data. Real-world performance may vary significantly.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 mt-1.5 flex-shrink-0">•</span>
                      <span>
                        <strong>Not for certification:</strong> This tool is intended for preliminary assessment and educational purposes only, not regulatory compliance.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 mt-1.5 flex-shrink-0">•</span>
                      <span>
                        <strong>Material variability:</strong> Manufacturing processes, additives, and composition differences affect actual fire resistance.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-600 mt-1.5 flex-shrink-0">•</span>
                      <span>
                        <strong>Validation required:</strong> Critical applications require laboratory testing per relevant fire safety standards (e.g., ASTM E84, ISO 5660).
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-6 bg-slate-50">
              <h2 className="text-xl font-semibold text-slate-900 mb-3">
                About the MFR Risk Model
              </h2>
              <p className="text-slate-700 mb-3">
                The Material Fire Resistance (MFR) Risk Model Engine uses machine learning algorithms trained on thermal analysis data, fire test results, and material property databases to estimate fire performance metrics.
              </p>
              <p className="text-slate-700">
                The model considers thermal decomposition kinetics, heat transfer characteristics, and combustion behavior to generate risk assessments. Results should be interpreted by qualified engineers and validated through experimental testing for safety-critical applications.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 bg-slate-200 text-slate-900 px-6 py-3 rounded-xl font-semibold hover:bg-slate-300 transition-all"
          >
            Back to Results
          </button>
          <button
            onClick={onReturnHome}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-slate-800 transition-all"
          >
            <Home className="w-5 h-5" />
            New Assessment
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Developed by Nikhilesh Suravarjjala</p>
        </div>
      </div>
    </div>
  );
}
