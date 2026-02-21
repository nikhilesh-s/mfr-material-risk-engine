import { useState } from 'react';
import HomePage from './components/HomePage';
import InputPage from './components/InputPage';
import ResultsPage from './components/ResultsPage';
import type { AssessmentInput } from './components/InputPage';

type Page = 'home' | 'input' | 'results';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [assessmentData, setAssessmentData] = useState<AssessmentInput>({
    materialType: 'Polymer',
    temperature: '',
    exposureTime: '',
    environment: 'Open Air'
  });

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
  };

  const handleSubmit = (data: AssessmentInput) => {
    setAssessmentData(data);
  };

  return (
    <>
      {currentPage === 'home' && (
        <HomePage onNavigate={() => handleNavigate('input')} />
      )}
      {currentPage === 'input' && (
        <InputPage
          onNavigate={handleNavigate}
          onSubmit={handleSubmit}
        />
      )}
      {currentPage === 'results' && (
        <ResultsPage
          onNavigate={handleNavigate}
          inputData={assessmentData}
        />
      )}
    </>
  );
}

export default App;
