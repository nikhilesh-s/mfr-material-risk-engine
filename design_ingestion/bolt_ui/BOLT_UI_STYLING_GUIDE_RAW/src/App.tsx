import { Palette } from 'lucide-react';
import { useState } from 'react';
import chemistryIcon from './assets/chemistry-svgrepo-com.svg';
import BrandGuide from './components/BrandGuide';

function App() {
  const [currentView, setCurrentView] = useState<'home' | 'brand'>('home');

  return (
    <div className="min-h-screen bg-[#F5F1EC] flex">
      <aside className="w-20 bg-[#FEFEFE] flex flex-col items-center py-8 gap-8 rounded-r-3xl shadow-sm">
        <button
          onClick={() => setCurrentView('home')}
          className="w-12 h-12 bg-[#232422] rounded-2xl flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <img src={chemistryIcon} alt="Dravix" className="w-6 h-6" />
        </button>

        <nav className="flex flex-col gap-6 mt-8">
          <button
            onClick={() => setCurrentView('brand')}
            className={`w-12 h-12 rounded-xl transition-colors flex items-center justify-center group ${
              currentView === 'brand' ? 'bg-[#F5F1EC]' : 'hover:bg-[#F5F1EC]'
            }`}
          >
            <Palette className={`w-5 h-5 ${
              currentView === 'brand' ? 'text-[#FF8D7C]' : 'text-[#232422] group-hover:text-[#FF8D7C]'
            }`} />
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-8">
        {currentView === 'brand' ? (
          <BrandGuide />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <img src={chemistryIcon} alt="Dravix" className="w-32 h-32 mx-auto" />
              <h1 className="text-5xl font-light text-[#232422] mt-8">Dravix</h1>
              <p className="text-[#232422]/60 mt-4">Fire Risk Assessment Platform</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
