import { useEffect, useState } from 'react';
import ClusterScatterPlot from '../charts/ClusterScatterPlot';
import MaterialCard from '../components/MaterialCard';
import DatasetSearchForm from '../forms/DatasetSearchForm';
import type { DatasetSearchState } from '../forms/DatasetSearchForm';
import DatasetUploadForm from '../forms/DatasetUploadForm';
import PageContainer from '../layout/PageContainer';
import { datasetService } from '../services/datasetService';
import type { ClustersResponse, DatasetExportResponse, DatasetSearchResponse, DatasetUploadResponse } from '../types/index';

const initialSearchState: DatasetSearchState = {
  material_name: 'ABS',
  density_min: '',
  density_max: '',
  melting_point_min: '',
  melting_point_max: '',
};

function DatasetPage() {
  const [clusters, setClusters] = useState<ClustersResponse | null>(null);
  const [searchState, setSearchState] = useState<DatasetSearchState>(initialSearchState);
  const [searchResult, setSearchResult] = useState<DatasetSearchResponse | null>(null);
  const [exportData, setExportData] = useState<DatasetExportResponse | null>(null);
  const [uploadResult, setUploadResult] = useState<DatasetUploadResponse | null>(null);

  useEffect(() => {
    void Promise.allSettled([datasetService.getClusters(), datasetService.exportDataset()]).then(([c, e]) => {
      if (c.status === 'fulfilled') setClusters(c.value);
      if (e.status === 'fulfilled') setExportData(e.value);
    });
  }, []);

  const runSearch = async () => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchState)) {
      if (value.trim()) params.set(key, value.trim());
    }
    setSearchResult(await datasetService.searchDataset(params));
  };

  const runUpload = async (file: File) => {
    setUploadResult(await datasetService.uploadDataset(file));
  };

  return (
    <PageContainer eyebrow="Dataset" title="Dataset explorer" description="Search the in-memory dataset, inspect cluster structure, upload CSV data, and review exportable learning records.">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
        <DatasetSearchForm state={searchState} onChange={setSearchState} onSubmit={runSearch} />
        <DatasetUploadForm onSubmit={runUpload} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <ClusterScatterPlot clusters={clusters?.clusters ?? []} />
        <MaterialCard title="Dataset upload status">
          <pre className="max-h-80 overflow-auto rounded-2xl bg-[var(--dravix-panel)] p-4 text-xs">{JSON.stringify(uploadResult ?? exportData?.counts ?? {}, null, 2)}</pre>
        </MaterialCard>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <MaterialCard title={`Dataset search results (${searchResult?.count ?? 0})`}>
          <pre className="max-h-96 overflow-auto rounded-2xl bg-[var(--dravix-panel)] p-4 text-xs">{JSON.stringify(searchResult?.results?.slice(0, 15) ?? [], null, 2)}</pre>
        </MaterialCard>
        <MaterialCard title="Dataset export">
          <pre className="max-h-96 overflow-auto rounded-2xl bg-[var(--dravix-panel)] p-4 text-xs">{JSON.stringify(exportData ?? {}, null, 2)}</pre>
        </MaterialCard>
      </div>
    </PageContainer>
  );
}

export default DatasetPage;
