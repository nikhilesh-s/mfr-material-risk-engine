import { useState } from 'react';
import LandingScreen from './components/LandingScreen';
import InputScreen from './components/InputScreen';
import ResultsScreen from './components/ResultsScreen';
import { AssessmentInput } from './components/InputScreen';
import { AssessmentResults } from './components/ResultsScreen';

type Screen = 'landing' | 'input' | 'results';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [assessmentInput, setAssessmentInput] = useState<AssessmentInput | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const buildComparison = (riskClass: AssessmentResults['riskClass'], materialType: string) => {
    const materialNames = {
      polymer: 'polymers',
      composite: 'composite materials',
      generic: 'generic baseline materials',
    };
    const materialName = materialNames[materialType as keyof typeof materialNames] || 'materials';

    if (riskClass === 'Low') {
      return `Performs significantly better than baseline ${materialName} under similar thermal conditions. Suitable for applications with moderate fire safety requirements.`;
    }
    if (riskClass === 'Medium') {
      return `Performance is comparable to typical ${materialName} at these exposure levels. Additional fire protection measures may be advisable for critical applications.`;
    }
    return `Shows elevated risk compared to fire-resistant alternatives. Material degradation likely under these conditions. Consider fire-retardant treatments or alternative materials for safety-critical use.`;
  };

  const handleGetStarted = () => {
    setCurrentScreen('input');
  };

  const handleAnalyze = async (input: AssessmentInput) => {
    setAssessmentInput(input);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBase}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          MATERIAL: input.materialType,
          'HEAT FLUX': input.temperature,
          'TIME TO IGN': input.exposureTime,
          'FLOW FACTOR': input.environment === 'enclosed' ? 1.15 : 0.85,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const payload = await response.json();
      const results: AssessmentResults = {
        riskScore: payload.riskScore,
        riskClass: payload.riskClass,
        resistanceIndex: payload.resistanceIndex,
        interpretation: payload.interpretation,
        comparison: buildComparison(payload.riskClass, input.materialType),
      };

      setAssessmentResults(results);
      setCurrentScreen('results');
    } catch (error) {
      setErrorMessage('Unable to reach the prediction service. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLanding = () => {
    setCurrentScreen('landing');
    setAssessmentInput(null);
    setAssessmentResults(null);
  };

  const handleBackToInput = () => {
    setCurrentScreen('input');
  };

  return (
    <>
      {currentScreen === 'landing' && (
        <LandingScreen onGetStarted={handleGetStarted} />
      )}
      {currentScreen === 'input' && (
        <InputScreen
          onBack={handleBackToLanding}
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />
      )}
      {currentScreen === 'results' && assessmentInput && assessmentResults && (
        <ResultsScreen
          onBack={handleBackToInput}
          input={assessmentInput}
          results={assessmentResults}
        />
      )}
    </>
  );
}

export default App;
