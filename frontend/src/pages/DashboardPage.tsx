import { useEffect, useState } from 'react';
import MaterialCard from '../components/MaterialCard';
import PageContainer from '../layout/PageContainer';
import { systemService } from '../services/systemService';
import type { DatabaseStatus, HealthResponse, ModelMetadata, RuntimeStatus, SchemaStatus, VersionInfo } from '../types/index';

function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const [schemaStatus, setSchemaStatus] = useState<SchemaStatus | null>(null);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);

  useEffect(() => {
    void Promise.allSettled([
      systemService.getHealth(),
      systemService.getVersion(),
      systemService.getRuntimeStatus(),
      systemService.getModelMetadata(),
      systemService.getSchemaStatus(),
      systemService.getDbStatus(),
    ]).then(([h, v, r, m, s, d]) => {
      if (h.status === 'fulfilled') setHealth(h.value);
      if (v.status === 'fulfilled') setVersion(v.value);
      if (r.status === 'fulfilled') setRuntime(r.value);
      if (m.status === 'fulfilled') setMetadata(m.value);
      if (s.status === 'fulfilled') setSchemaStatus(s.value);
      if (d.status === 'fulfilled') setDbStatus(d.value);
    });
  }, []);

  return (
    <PageContainer
      eyebrow="System"
      title="Deployment visibility dashboard"
      description="Brand-aligned operations view for runtime health, active model metadata, and database readiness."
    >
      <div className="grid gap-6 xl:grid-cols-3">
        <MaterialCard title="API status">
          <div className="grid gap-3 text-sm">
            <div>Status: {health?.status ?? 'loading'}</div>
            <div>Engine: {health?.engine ?? 'loading'}</div>
            <div>Version: {version?.version ?? 'loading'}</div>
            <div>Dataset: {version?.dataset_version ?? 'loading'}</div>
          </div>
        </MaterialCard>
        <MaterialCard title="Runtime">
          <div className="grid gap-3 text-sm">
            <div>Model loaded: {String(runtime?.model_loaded ?? false)}</div>
            <div>Dataset loaded: {String(runtime?.dataset_loaded ?? false)}</div>
            <div>Materials: {runtime?.materials_count ?? 'loading'}</div>
            <div>Coatings: {runtime?.coatings_count ?? 'loading'}</div>
            <div>Features: {runtime?.feature_count ?? 'loading'}</div>
          </div>
        </MaterialCard>
        <MaterialCard title="Database">
          <div className="grid gap-3 text-sm">
            <div>Connected: {String(dbStatus?.database_connected ?? false)}</div>
            <div>Last model: {dbStatus?.last_model_registered ?? 'unknown'}</div>
            <div>Tables found: {schemaStatus?.tables_found.length ?? 0}</div>
            <div>Tables missing: {schemaStatus?.tables_missing.length ?? 0}</div>
          </div>
        </MaterialCard>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <MaterialCard title="Model metadata">
          <div className="grid gap-3 text-sm">
            <div>Model type: {metadata?.model_type ?? 'loading'}</div>
            <div>Model version: {metadata?.model_version ?? 'loading'}</div>
            <div>Artifact: {metadata?.model_artifact ?? 'loading'}</div>
            <div>Training dataset: {metadata?.training_dataset ?? 'loading'}</div>
            <div>Feature count: {metadata?.feature_count ?? 'loading'}</div>
          </div>
        </MaterialCard>
        <MaterialCard title="Feature list">
          <div className="flex flex-wrap gap-2">
            {(metadata?.feature_names ?? []).map((feature) => (
              <span key={feature} className="rounded-full bg-[#f8f8f8] px-3 py-1 text-xs text-[var(--dravix-ink)]">{feature}</span>
            ))}
          </div>
        </MaterialCard>
      </div>
    </PageContainer>
  );
}

export default DashboardPage;
