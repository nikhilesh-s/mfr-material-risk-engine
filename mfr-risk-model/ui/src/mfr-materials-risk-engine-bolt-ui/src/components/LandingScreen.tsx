import { ArrowRight } from 'lucide-react';

interface LandingScreenProps {
  onGetStarted: () => void;
}

export default function LandingScreen({ onGetStarted }: LandingScreenProps) {
  return (
    <div className="min-h-screen bg-[#f4f6f7] flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <img
            src="https://i.imgur.com/756B74g.png"
            alt="Material Fire Risk logo"
            className="h-20 mx-auto mb-6"
          />

          <h1 className="text-4xl md:text-5xl font-bold text-[#5c6770] mb-4">
            Comparative fire resistance risk estimation under controlled thermal exposure
          </h1>

          <p className="text-lg text-[#5c6770] max-w-3xl mx-auto">
            Experimental-condition analysis designed for early-stage material comparison. This is a decision-support tool,
            not a regulatory or certification system.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-10 mb-8 border border-[#d6c4a1]">
          <h2 className="text-2xl font-semibold text-[#5c6770] mb-8 text-center">
            How It Works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#f4f6f7] rounded-xl flex items-center justify-center mx-auto mb-4 border border-[#d6c4a1]">
                <span className="text-2xl font-bold text-[#8b5e3c]">1</span>
              </div>
              <h3 className="text-lg font-semibold text-[#5c6770] mb-2">Input</h3>
              <p className="text-[#5c6770]">
                Provide simplified test-condition inputs for comparative analysis
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#f4f6f7] rounded-xl flex items-center justify-center mx-auto mb-4 border border-[#d6c4a1]">
                <span className="text-2xl font-bold text-[#8b5e3c]">2</span>
              </div>
              <h3 className="text-lg font-semibold text-[#5c6770] mb-2">Model</h3>
              <p className="text-[#5c6770]">
                The model evaluates relative fire failure risk under similar conditions
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#f4f6f7] rounded-xl flex items-center justify-center mx-auto mb-4 border border-[#d6c4a1]">
                <span className="text-2xl font-bold text-[#8b5e3c]">3</span>
              </div>
              <h3 className="text-lg font-semibold text-[#5c6770] mb-2">Results</h3>
              <p className="text-[#5c6770]">
                Receive interpretable risk scores for early-stage comparisons
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-[#e26a2c] text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:bg-[#9e2a2b] transition-all hover:scale-105"
          >
            Run Material Assessment
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-12 text-center text-sm text-[#a9b1b7]">
          <p>Experimental-condition decision support for early material evaluation</p>
        </div>
      </div>
    </div>
  );
}
