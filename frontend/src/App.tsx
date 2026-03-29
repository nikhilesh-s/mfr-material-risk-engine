import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './layout/Sidebar';
import TopNav from './layout/TopNav';
import AnalysisPage from './pages/AnalysisPage';
import AdvisorPage from './pages/AdvisorPage';
import CoatingsPage from './pages/CoatingsPage';
import ComparisonPage from './pages/ComparisonPage';
import DashboardPage from './pages/DashboardPage';
import DatasetPage from './pages/DatasetPage';
import HistoryPage from './pages/HistoryPage';
import OptimizationPage from './pages/OptimizationPage';
import RankingPage from './pages/RankingPage';
import ReportsPage from './pages/ReportsPage';
import SimulationPage from './pages/SimulationPage';
import { applyDesignSystemToDocument } from './theme/designSystem';

function App() {
  useEffect(() => {
    applyDesignSystemToDocument();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--dravix-bg-app)] text-[var(--dravix-ink)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-6 px-4 py-4 lg:flex-row lg:px-6">
        <Sidebar />
        <main className="dravix-shell min-w-0 flex-1 rounded-[2.25rem] border border-white/60 p-6 backdrop-blur md:p-8">
          <TopNav />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/optimization" element={<OptimizationPage />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/comparison" element={<ComparisonPage />} />
            <Route path="/simulation" element={<SimulationPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/coatings" element={<CoatingsPage />} />
            <Route path="/dataset" element={<DatasetPage />} />
            <Route path="/advisor" element={<AdvisorPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
