import { useState } from 'react';
import LandingScreen from './components/LandingScreen';
import InputScreen from './components/InputScreen';
import ResultsScreen from './components/ResultsScreen';
import InsightsScreen from './components/InsightsScreen';
import { AssessmentInput } from './components/InputScreen';
import { AssessmentResults } from './components/ResultsScreen';

type Screen = 'landing' | 'input' | 'results' | 'insights';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [assessmentInput, setAssessmentInput] = useState<AssessmentInput | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResults | null>(null);

  const calculateRiskAssessment = (input: AssessmentInput): AssessmentResults => {
    const materialFactors = {
      polymer: 1.2,
      composite: 0.9,
      generic: 1.0,
    };

    const environmentFactors = {
      'open-air': 0.85,
      'enclosed': 1.15,
    };

    const materialFactor = materialFactors[input.materialType as keyof typeof materialFactors] || 1.0;
    const environmentFactor = environmentFactors[input.environment as keyof typeof environmentFactors] || 1.0;

    const tempScore = Math.min((input.temperature / 1000) * 40, 40);
    const timeScore = Math.min((input.exposureTime / 60) * 30, 30);
    const materialScore = materialFactor * 15;
    const environmentScore = environmentFactor * 15;

    let riskScore = Math.round(tempScore + timeScore + materialScore + environmentScore);
    riskScore = Math.min(Math.max(riskScore, 0), 100);

    let riskClass: 'Low' | 'Medium' | 'High';
    if (riskScore < 35) {
      riskClass = 'Low';
    } else if (riskScore < 65) {
      riskClass = 'Medium';
    } else {
      riskClass = 'High';
    }

    const resistanceIndex = Math.round(100 - (riskScore * 0.8));

    const materialNames = {
      polymer: 'polymers',
      composite: 'composite materials',
      generic: 'generic baseline materials',
    };

    const materialName = materialNames[input.materialType as keyof typeof materialNames] || 'materials';

    let comparison = '';
    if (riskClass === 'Low') {
      comparison = `Performs significantly better than baseline ${materialName} under similar thermal conditions. Suitable for applications with moderate fire safety requirements.`;
    } else if (riskClass === 'Medium') {
      comparison = `Performance is comparable to typical ${materialName} at these exposure levels. Additional fire protection measures may be advisable for critical applications.`;
    } else {
      comparison = `Shows elevated risk compared to fire-resistant alternatives. Material degradation likely under these conditions. Consider fire-retardant treatments or alternative materials for safety-critical use.`;
    }

    let interpretation = '';
    if (riskClass === 'Low') {
      interpretation = 'This material demonstrates good fire resistance under the specified conditions. Expected to maintain structural integrity with minimal degradation during the exposure period.';
    } else if (riskClass === 'Medium') {
      interpretation = 'This material shows moderate fire resistance. Some thermal degradation expected, but catastrophic failure is unlikely within the exposure duration. Monitor for signs of weakening.';
    } else {
      interpretation = 'This material exhibits poor fire resistance at these conditions. Significant thermal degradation, potential ignition, or structural failure is likely. Not recommended for use without additional fire protection.';
    }

    return {
      riskScore,
      riskClass,
      resistanceIndex,
      comparison,
      interpretation,
    };
  };

  const handleGetStarted = () => {
    setCurrentScreen('input');
  };

  const handleAnalyze = (input: AssessmentInput) => {
    setAssessmentInput(input);
    const results = calculateRiskAssessment(input);
    setAssessmentResults(results);
    setCurrentScreen('results');
  };

  const handleBackToLanding = () => {
    setCurrentScreen('landing');
    setAssessmentInput(null);
    setAssessmentResults(null);
  };

  const handleBackToInput = () => {
    setCurrentScreen('input');
  };

  const handleViewInsights = () => {
    setCurrentScreen('insights');
  };

  const handleBackToResults = () => {
    setCurrentScreen('results');
  };

  return (
    <>
      {currentScreen === 'landing' && (
        <LandingScreen onGetStarted={handleGetStarted} />
      )}
      {currentScreen === 'input' && (
        <InputScreen onBack={handleBackToLanding} onAnalyze={handleAnalyze} />
      )}
      {currentScreen === 'results' && assessmentInput && assessmentResults && (
        <ResultsScreen
          onBack={handleBackToInput}
          onViewInsights={handleViewInsights}
          input={assessmentInput}
          results={assessmentResults}
        />
      )}
      {currentScreen === 'insights' && assessmentInput && assessmentResults && (
        <InsightsScreen
          onBack={handleBackToResults}
          onReturnHome={handleBackToLanding}
          input={assessmentInput}
          results={assessmentResults}
        />
      )}
    </>
  );
}

export default App;
