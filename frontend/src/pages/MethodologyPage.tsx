import { useEffect, useState } from 'react';
import { getModelMetadata, getSchema } from '../lib/api';
import type { FeatureSchemaInfo, ModelMetadata } from '../types';

function MethodologyPage() {
  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const [schema, setSchema] = useState<FeatureSchemaInfo | null>(null);

  useEffect(() => {
    void (async () => {
      const [metadataRes, schemaRes] = await Promise.allSettled([
        getModelMetadata(),
        getSchema(),
      ]);
      if (metadataRes.status === 'fulfilled') {
        setMetadata(metadataRes.value);
      }
      if (schemaRes.status === 'fulfilled') {
        setSchema(schemaRes.value);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#2b2118]/10 bg-white p-8">
        <div className="max-w-4xl">
          <div className="text-xs uppercase tracking-[0.24em] text-[#8b4b1b]">Methodology</div>
          <h1 className="mt-3 text-4xl font-light text-[#231a14]">Interpretability and system boundaries</h1>
          <p className="mt-4 text-base leading-7 text-[#5f5042]">
            Dravix is designed for early-stage materials triage. It ranks or screens candidate materials
            using a deterministic tree-based model, then exposes feature contributions to make the
            screening logic understandable to judges and engineering reviewers.
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-[#2b2118]/10 bg-[#fffaf4] p-7">
          <h2 className="text-2xl font-light text-[#231a14]">Model Metadata</h2>
          <div className="mt-5 grid gap-3 text-sm">
            <div className="rounded-2xl bg-white px-4 py-3">
              <div className="text-[#7c6857]">Model</div>
              <div className="mt-1 text-[#231a14]">{metadata?.model_type ?? 'Loading'}</div>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <div className="text-[#7c6857]">Artifact</div>
              <div className="mt-1 text-[#231a14]">{metadata?.model_artifact ?? 'Loading'}</div>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <div className="text-[#7c6857]">Dataset version</div>
              <div className="mt-1 text-[#231a14]">{metadata?.dataset_version ?? 'Loading'}</div>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <div className="text-[#7c6857]">Deterministic runtime</div>
              <div className="mt-1 text-[#231a14]">{metadata?.deterministic ? 'Yes' : 'Loading'}</div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#2b2118]/10 bg-white p-7">
          <h2 className="text-2xl font-light text-[#231a14]">Feature List</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {(schema?.model_features ?? []).map((feature) => (
              <span key={feature} className="rounded-full bg-[#efe1d1] px-3 py-2 text-sm text-[#4b3928]">
                {feature}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[#2b2118]/10 bg-white p-8">
        <h2 className="text-2xl font-light text-[#231a14]">What Dravix is and is not</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.5rem] bg-[#ecf7ee] p-5">
            <div className="text-sm uppercase tracking-[0.2em] text-[#2a7a3b]">Designed for</div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#215b2c]">
              <li>Single-material fire-risk proxy screening</li>
              <li>Batch prioritization of candidate materials</li>
              <li>What-if exploration on supported descriptors</li>
              <li>Shortlist generation before physical testing</li>
            </ul>
          </div>
          <div className="rounded-[1.5rem] bg-[#fff3e8] p-5">
            <div className="text-sm uppercase tracking-[0.2em] text-[#a65a1f]">Not a replacement for</div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#6f4320]">
              <li>Certification or qualification testing</li>
              <li>ASTM or regulatory signoff</li>
              <li>Autonomous materials approval</li>
              <li>Full-physics fire simulation</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

export default MethodologyPage;
