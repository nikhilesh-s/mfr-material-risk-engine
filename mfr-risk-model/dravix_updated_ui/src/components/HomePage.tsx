import logoSrc from '../assets/dravix_brand_(1).svg';

interface HomePageProps {
  onNavigate: () => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e8eaed] flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-16">
          <img
            src={logoSrc}
            alt="Dravix"
            className="w-[28rem] h-auto mx-auto drop-shadow-sm"
          />
        </div>
        <button
          onClick={onNavigate}
          className="px-10 py-5 bg-gradient-to-r from-[#e26a2c] to-[#9e2a2b] text-white font-semibold rounded-2xl hover:shadow-xl hover:scale-105 transition-all duration-300 text-lg shadow-lg"
        >
          Run Materials Assessment
        </button>
      </div>
    </div>
  );
}
