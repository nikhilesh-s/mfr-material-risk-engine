import { ArrowRight, CheckCircle2, FileSpreadsheet, FlaskConical } from 'lucide-react';
import { useEffect, useState } from 'react';
import ModelProvenancePanel from '../components/ModelProvenancePanel';
import { getHealth, getVersion } from '../lib/api';
import { designSystem } from '../theme/designSystem';
import type { HealthInfo, VersionInfo } from '../types';
import { USE_CASES } from '../useCases';

const WORKFLOW_STEPS = [
  {
    title: 'Import candidate materials',
    detail: 'Bring in known material names, descriptor rows, or candidate lists for rapid triage.',
    icon: FileSpreadsheet,
  },
  {
    title: 'Run Dravix screening',
    detail: 'Score single materials or ranked batches with deterministic model-backed outputs.',
    icon: FlaskConical,
  },
  {
    title: 'Review shortlist',
    detail: 'Compare ranked low-risk candidates, confidence levels, and top driver explanations.',
    icon: CheckCircle2,
  },
  {
    title: 'Export test candidates',
    detail: 'Generate a shortlist for downstream bench testing, qualification planning, or Conrad demos.',
    icon: ArrowRight,
  },
];

function DashboardPage() {
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [version, setVersion] = useState<VersionInfo | null>(null);

  useEffect(() => {
    void (async () => {
      const [healthRes, versionRes] = await Promise.allSettled([
        getHealth(),
        getVersion(),
      ]);

      if (healthRes.status === 'fulfilled' && healthRes.value && typeof healthRes.value === 'object' && 'status' in healthRes.value) {
        setHealth(healthRes.value as HealthInfo);
      }
      if (versionRes.status === 'fulfilled') {
        setVersion(versionRes.value);
      }
    })();
  }, []);

  return (
    <div className="space-y-8">
      <section className="dravix-hero overflow-hidden rounded-[2rem] border px-8 py-10 text-white shadow-[0_24px_90px_rgba(60,37,20,0.18)]" style={{ borderColor: designSystem.backgroundColors.border }}>
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/70">
              Conrad Phase-3 Platform
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-light leading-tight md:text-5xl">
              Dravix turns materials fire-risk screening into a usable engineering workflow.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-white/78 md:text-lg">
              Screen one material, rank a full shortlist, explore sensitivity, inspect the top drivers,
              and export recommended test candidates with deterministic model-backed outputs.
            </p>
          </div>

          <div className="grid gap-3 rounded-[1.75rem] border border-white/10 bg-white/8 p-5 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-black/10 px-4 py-3">
              <span className="text-white/70">API status</span>
              <span className="font-medium text-[#ffd88c]">{health?.status ?? 'loading'}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-black/10 px-4 py-3">
              <span className="text-white/70">Dataset</span>
              <span className="font-medium">{version?.dataset_version ?? 'unknown'}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-black/10 px-4 py-3">
              <span className="text-white/70">Model artifact</span>
              <span className="font-medium">{version?.model_artifact ?? 'loading'}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-black/10 px-4 py-3">
              <span className="text-white/70">Deterministic</span>
              <span className="font-medium">Yes</span>
            </div>
          </div>
        </div>
      </section>

      <ModelProvenancePanel />

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="dravix-panel rounded-[2rem] p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-[#232422]" style={{ background: designSystem.primaryGradient }}>
              <ArrowRight className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-light text-[#231a14]">Engineering Workflow</h2>
              <p className="text-sm text-[#5f5042]">How Dravix fits into materials development operations.</p>
            </div>
          </div>
          <div className="grid gap-4">
            {WORKFLOW_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="dravix-card grid gap-4 rounded-[1.5rem] px-5 py-5 md:grid-cols-[auto_1fr]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-[#232422]" style={{ background: designSystem.primaryGradient }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em]" style={{ color: designSystem.backgroundColors.accentCoral }}>Step {index + 1}</div>
                    <div className="mt-1 text-lg text-[#231a14]">{step.title}</div>
                    <p className="mt-1 text-sm leading-6 text-[#5f5042]">{step.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="dravix-card rounded-[2rem] p-7">
            <h2 className="text-xl font-light text-[#231a14]">Use-Case Framing</h2>
            <p className="mt-2 text-sm leading-6 text-[#5f5042]">
              Dravix keeps one deterministic model, then frames outputs around the engineering context
              your team is screening for.
            </p>
            <div className="mt-5 grid gap-3">
              {USE_CASES.map((useCase) => (
                <div key={useCase} className="dravix-panel rounded-2xl px-4 py-3 text-sm text-[#231a14]">
                  {useCase}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
