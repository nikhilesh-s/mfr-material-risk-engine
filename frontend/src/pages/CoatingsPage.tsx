import { useEffect, useState } from 'react';
import MaterialCard from '../components/MaterialCard';
import PageContainer from '../layout/PageContainer';
import { datasetService } from '../services/datasetService';
import { exampleMaterialNames } from '../styles/tokens';
import type { CoatingAnalysisResponse } from '../types/index';

function CoatingsPage() {
  const [materials] = useState(exampleMaterialNames);
  const [coatings, setCoatings] = useState<string[]>([]);
  const [materialName, setMaterialName] = useState(exampleMaterialNames[0]);
  const [coatingCode, setCoatingCode] = useState('');
  const [result, setResult] = useState<CoatingAnalysisResponse | null>(null);

  useEffect(() => {
    void datasetService.getCoatings().then((res) => {
      setCoatings(res.coatings);
      setCoatingCode(res.coatings[0] ?? '');
    }).catch(() => undefined);
  }, []);

  const run = async () => {
    setResult(await datasetService.analyzeCoating({ base_material: { material_name: materialName }, coating_code: coatingCode }));
  };

  return (
    <PageContainer eyebrow="Coatings" title="Coating compatibility check" description="Evaluate a base material with a coating inside the same clean Dravix analysis language used elsewhere in the app.">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <MaterialCard title="Material + coating">
          <div className="grid gap-4">
            <select value={materialName} onChange={(e) => setMaterialName(e.target.value)} className="rounded-xl border border-[#762123]/10 bg-[#f8f8f8] px-4 py-3 text-sm">
              {materials.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={coatingCode} onChange={(e) => setCoatingCode(e.target.value)} className="rounded-xl border border-[#762123]/10 bg-[#f8f8f8] px-4 py-3 text-sm">
              {coatings.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button onClick={run} className="rounded-full bg-gradient-to-r from-[#784F74] to-[#E8967F] px-4 py-2 text-sm text-white">Analyze coating</button>
          </div>
        </MaterialCard>
        <MaterialCard title="Coating result" subtitle={result?.coating_compatibility_summary ?? 'Run coating analysis to populate this panel.'}>
          <div className="grid gap-3 text-sm">
            <div>Material: {result?.material_name ?? 'n/a'}</div>
            <div>Coating: {result?.coating_code ?? 'n/a'}</div>
            <div>Modifier: {result?.coating_modifier ?? 'n/a'}</div>
            <div>Effective score: {result?.effective_score ?? 'n/a'}</div>
          </div>
        </MaterialCard>
      </div>
    </PageContainer>
  );
}

export default CoatingsPage;
