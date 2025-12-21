import { Flame, ArrowRight } from 'lucide-react';

interface LandingScreenProps {
  onGetStarted: () => void;
}

export default function LandingScreen({ onGetStarted }: LandingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-6 shadow-lg">
            <Flame className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Material Fire Resistance Risk Estimator
          </h1>

          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Estimate fire failure risk and resistance of materials under thermal exposure.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-10 mb-8">
          <h2 className="text-2xl font-semibold text-slate-900 mb-8 text-center">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Input</h3>
              <p className="text-slate-600">
                Define material properties and fire exposure conditions
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Model</h3>
              <p className="text-slate-600">
                ML engine analyzes thermal resistance and failure patterns
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Risk Assessment</h3>
              <p className="text-slate-600">
                Get actionable risk scores and resistance metrics
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            Run a Material Assessment
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-12 text-center text-sm text-slate-500">
          <p>Developed by Nikhilesh Suravarjjala</p>
        </div>
      </div>
    </div>
  );
}
