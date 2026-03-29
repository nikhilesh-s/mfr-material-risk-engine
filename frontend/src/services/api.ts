import type {
  AdvisorChatResponse,
  AdvisorResponse,
  AnalysisByIdResponse,
  AnalysisRecentResponse,
  ClustersResponse,
  CoatingAnalysisResponse,
  CoatingsResponse,
  ComparisonResponse,
  DatabaseStatus,
  DatasetExportResponse,
  DatasetSearchResponse,
  DatasetUploadResponse,
  ExportResponse,
  HealthResponse,
  InteractiveAnalysisResponse,
  MaterialsResponse,
  ModelMetadata,
  OptimizationResponse,
  Phase3Input,
  PredictionResponse,
  RankResponse,
  RuntimeStatus,
  SchemaStatus,
  SimulationResponse,
  TdsResponse,
  VersionInfo,
} from '../types/index';

const RAW_BASE = import.meta.env.VITE_API_BASE_URL || 'https://mfr-material-risk-engine.onrender.com';
export const API_BASE_URL = RAW_BASE.endsWith('/') ? RAW_BASE.slice(0, -1) : RAW_BASE;

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'detail' in payload &&
      typeof (payload as { detail?: unknown }).detail === 'string'
        ? String((payload as { detail: string }).detail)
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }
  return payload as T;
}

async function requestBlob(path: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new ApiError(`Request failed with status ${response.status}`, response.status, null);
  }
  return response.blob();
}

export const api = {
  getHealth: () => request<HealthResponse>('/health'),
  getVersion: () => request<VersionInfo>('/version'),
  getRuntimeStatus: () => request<RuntimeStatus>('/runtime-status'),
  getModelMetadata: () => request<ModelMetadata>('/model-metadata'),
  getSchemaStatus: () => request<SchemaStatus>('/db/schema-status'),
  getDbStatus: () => request<DatabaseStatus>('/db-status'),
  predictMaterial: (payload: Phase3Input) =>
    request<PredictionResponse>('/predict', { method: 'POST', body: JSON.stringify(payload) }),
  optimizeMaterial: (payload: Phase3Input) =>
    request<OptimizationResponse>('/optimize', { method: 'POST', body: JSON.stringify(payload) }),
  rankMaterials: (payload: { materials: Phase3Input[]; use_case?: string }) =>
    request<RankResponse>('/rank', { method: 'POST', body: JSON.stringify(payload) }),
  compareMaterials: (payload: { materials: Phase3Input[]; use_case?: string }) =>
    request<ComparisonResponse>('/compare', { method: 'POST', body: JSON.stringify(payload) }),
  simulateSensitivity: (payload: { base_material: Phase3Input; modifications: Record<string, number | string>; use_case?: string }) =>
    request<SimulationResponse>('/simulate', { method: 'POST', body: JSON.stringify(payload) }),
  getRecentAnalyses: () => request<AnalysisRecentResponse>('/analysis/recent'),
  getAnalysisById: (analysisId: string) => request<AnalysisByIdResponse>(`/analysis/${analysisId}`),
  getInteractiveAnalysis: (analysisId: string) =>
    request<InteractiveAnalysisResponse>(`/analysis/${analysisId}/interactive`),
  getMaterials: () => request<MaterialsResponse>('/materials'),
  getClusters: (nClusters = 6) => request<ClustersResponse>(`/clusters?n_clusters=${nClusters}`),
  searchDataset: (query: URLSearchParams) =>
    request<DatasetSearchResponse>(`/dataset/search?${query.toString()}`),
  exportDataset: () => request<DatasetExportResponse>('/dataset/export'),
  uploadDataset: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<DatasetUploadResponse>('/dataset/upload', { method: 'POST', body: form });
  },
  getCoatings: () => request<CoatingsResponse>('/coatings'),
  analyzeCoating: (payload: { base_material: Phase3Input; coating_code: string; use_case?: string }) =>
    request<CoatingAnalysisResponse>('/coatings/analyze', { method: 'POST', body: JSON.stringify(payload) }),
  getAdvisor: (analysisId: string) => request<AdvisorResponse>(`/advisor/${analysisId}`),
  chatAdvisor: (payload: { analysis_id: string; user_question: string }) =>
    request<AdvisorChatResponse>('/advisor/chat', { method: 'POST', body: JSON.stringify(payload) }),
  getTds: (analysisId: string) => request<TdsResponse>(`/tds/${analysisId}`),
  downloadTdsPdf: (analysisId: string) => requestBlob(`/tds/${analysisId}/pdf`),
  downloadReport: (analysisId: string, format = 'json') =>
    request<ExportResponse>(`/export/report/${analysisId}?format=${format}`),
  exportRanking: (payload: { materials: Phase3Input[]; use_case?: string; format: 'csv' | 'json' }) =>
    request<ExportResponse>('/export/ranking', { method: 'POST', body: JSON.stringify(payload) }),
};
