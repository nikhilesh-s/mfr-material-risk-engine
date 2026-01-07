import { ArrowRight } from 'lucide-react';
import logoSrc from '../assets/dravix_brand_(1).svg';

interface LandingScreenProps {
  onGetStarted: () => void;
}

export default function LandingScreen({ onGetStarted }: LandingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e8eaed] flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-5xl w-full text-center">
        <div className="mb-12">
          <img
            src={logoSrc}
            alt="Dravix"
            className="w-[22rem] h-auto mx-auto drop-shadow-sm"
          />
        </div>

        <button
          onClick={onGetStarted}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#e26a2c] to-[#9e2a2b] text-white px-10 py-5 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
        >
          Run Material Assessment
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
