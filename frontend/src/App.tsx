import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import SiteLockGate from './components/SiteLockGate';
import Sidebar from './layout/Sidebar';
import TopNav from './layout/TopNav';
import AnalyzePage from './pages/AnalyzePage';
import AdvisorPage from './pages/AdvisorPage';
import HistoryPage from './pages/HistoryPage';
import ScreenPage from './pages/ScreenPage';

const ACCESS_KEY = 'dravix-site-unlocked-v0.3.2';

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(ACCESS_KEY) === 'true') {
      setIsUnlocked(true);
    }
  }, []);

  const unlockSite = () => {
    window.sessionStorage.setItem(ACCESS_KEY, 'true');
    setIsUnlocked(true);
  };

  const lockSite = () => {
    window.sessionStorage.removeItem(ACCESS_KEY);
    setIsUnlocked(false);
  };

  if (!isUnlocked) {
    return <SiteLockGate onUnlock={unlockSite} />;
  }

  return (
    <div className="min-h-screen bg-[var(--dravix-bg-app)] text-[var(--dravix-ink)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1720px] gap-4 px-4 py-4 lg:px-6">
        <Sidebar />
        <main className="dravix-shell min-w-0 flex-1 rounded-[2rem] border border-[#762123]/10 p-4 md:p-6">
          <TopNav onLock={lockSite} />
          <Routes>
            <Route path="/" element={<Navigate to="/analyze" replace />} />
            <Route path="/analyze" element={<AnalyzePage />} />
            <Route path="/screen" element={<ScreenPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/advisor" element={<AdvisorPage />} />
            <Route path="*" element={<Navigate to="/analyze" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
