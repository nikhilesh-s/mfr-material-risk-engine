import { Microscope } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiError, getModelMetadata } from '../lib/api';
import { designSystem } from '../theme/designSystem';
import type { ModelMetadata } from '../types';

let cachedMetadata: ModelMetadata | null = null;
let inflightMetadataRequest: Promise<ModelMetadata> | null = null;

function loadModelMetadata(): Promise<ModelMetadata> {
  if (cachedMetadata) {
    return Promise.resolve(cachedMetadata);
  }
  if (inflightMetadataRequest) {
    return inflightMetadataRequest;
  }

  inflightMetadataRequest = getModelMetadata()
    .then((metadata) => {
      cachedMetadata = metadata;
      return metadata;
    })
    .finally(() => {
      inflightMetadataRequest = null;
    });

  return inflightMetadataRequest;
}

function ProvenanceRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="dravix-panel flex items-center justify-between rounded-2xl px-4 py-3 text-sm">
      <span className="text-[#7c6857]">{label}</span>
      <span className="text-right text-[#231a14]">{value}</span>
    </div>
  );
}

function ModelProvenancePanel() {
  const [metadata, setMetadata] = useState<ModelMetadata | null>(cachedMetadata);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (cachedMetadata) {
      return;
    }

    void loadModelMetadata()
      .then((response) => {
        setMetadata(response);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError || error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('Model provenance is unavailable.');
        }
      });
  }, []);

  return (
    <div className="dravix-card rounded-[2rem] p-7">
      <div className="mb-5 flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl text-[#232422]"
          style={{ background: designSystem.primaryGradient }}
        >
          <Microscope className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-light text-[#231a14]">Dravix Model Provenance</h2>
          <p className="text-sm text-[#5f5042]">Research-style metadata for the deployed screening model.</p>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-[#cc8b60]/30 bg-[#fff1e8] px-4 py-3 text-sm text-[#8b3f14]">
          {errorMessage}
        </div>
      ) : (
        <div className="grid gap-3">
          <ProvenanceRow label="Model Version" value={metadata?.model_version ?? 'Loading'} />
          <ProvenanceRow label="Dataset Version" value={metadata?.dataset_version ?? 'Loading'} />
          <ProvenanceRow
            label="Reference Materials"
            value={metadata ? String(metadata.row_counts.reference_dataset_rows) : 'Loading'}
          />
          <ProvenanceRow
            label="Model Type"
            value={metadata?.model_type?.replace(' pipeline', '') ?? 'Loading'}
          />
          <ProvenanceRow label="Dataset Build" value={metadata?.dataset_build_date ?? 'Loading'} />
          <ProvenanceRow
            label="Deterministic"
            value={metadata ? (metadata.deterministic ? 'Yes' : 'No') : 'Loading'}
          />
        </div>
      )}
    </div>
  );
}

export default ModelProvenancePanel;
