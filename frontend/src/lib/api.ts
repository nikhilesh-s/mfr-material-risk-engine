import type {
  CoatingsInfo,
  ExportRequest,
  ExportResponse,
  FeatureSchemaInfo,
  HealthInfo,
  MaterialsInfo,
  ModelMetadata,
  RankRequest,
  RankResponse,
  SimulationRequest,
  SimulationResponse,
  PredictionRequest,
  PredictionResponse,
  VersionInfo,
} from '../types';

const RAW_BASE =
  import.meta.env.VITE_API_BASE_URL || 'https://mfr-material-risk-engine.onrender.com';

const API_BASE_URL = RAW_BASE.endsWith('/')
  ? RAW_BASE.slice(0, -1)
  : RAW_BASE;

const DEFAULT_TIMEOUT_MS = 10000;
const PREDICT_TIMEOUT_MS = 15000;
const SIMULATE_TIMEOUT_MS = 15000;
const RANK_TIMEOUT_MS = 45000;
const EXPORT_TIMEOUT_MS = 45000;

export interface NonJsonSuccessPayload {
  ok: false;
  status: number;
  rawText: string;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;
  code?: string;

  constructor(message: string, status: number, payload: unknown, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.code = code;
  }
}

function parseResponsePayload(text: string, status: number): {
  payload: unknown | NonJsonSuccessPayload | null;
  parseFailed: boolean;
} {
  if (!text.trim()) {
    return { payload: null, parseFailed: false };
  }

  try {
    return { payload: JSON.parse(text), parseFailed: false };
  } catch {
    return {
      payload: {
        ok: false,
        status,
        rawText: text,
      },
      parseFailed: true,
    };
  }
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  timeoutMessage: string = 'Backend timeout — retry',
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(timeoutMessage, 408, null, 'TIMEOUT');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  const text = await response.text();
  const { payload, parseFailed } = parseResponsePayload(text, response.status);

  if (!response.ok) {
    const message = (() => {
      if (
        payload &&
        typeof payload === 'object' &&
        'detail' in payload &&
        typeof (payload as { detail?: unknown }).detail === 'string'
      ) {
        return (payload as { detail: string }).detail;
      }
      if (parseFailed && text.trim()) {
        return `Request failed with status ${response.status} (non-JSON response)`;
      }
      return `Request failed with status ${response.status}`;
    })();
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export function getHealth(): Promise<HealthInfo | NonJsonSuccessPayload | null> {
  return requestJson<HealthInfo | NonJsonSuccessPayload | null>('/health');
}

export function getVersion(): Promise<VersionInfo> {
  return requestJson<VersionInfo>('/version');
}

export function getSchema(): Promise<FeatureSchemaInfo> {
  return requestJson<FeatureSchemaInfo>('/schema');
}

export function getModelMetadata(): Promise<ModelMetadata> {
  return requestJson<ModelMetadata>('/model-metadata');
}

export function getMaterials(): Promise<MaterialsInfo> {
  return requestJson<MaterialsInfo>('/materials');
}

export function getCoatings(): Promise<CoatingsInfo> {
  return requestJson<CoatingsInfo>('/coatings');
}

export function predict(payload: PredictionRequest): Promise<PredictionResponse> {
  return requestJson<PredictionResponse>('/predict', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, PREDICT_TIMEOUT_MS);
}

export function rankMaterials(payload: RankRequest): Promise<RankResponse> {
  return requestJson<RankResponse>('/rank', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, RANK_TIMEOUT_MS, 'Ranking is taking longer than expected. The backend may be cold-starting or processing a larger batch. Please retry shortly.');
}

export function simulateMaterial(payload: SimulationRequest): Promise<SimulationResponse> {
  return requestJson<SimulationResponse>('/simulate', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, SIMULATE_TIMEOUT_MS);
}

export function exportRanking(payload: ExportRequest): Promise<ExportResponse> {
  return requestJson<ExportResponse>('/export/ranking', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, EXPORT_TIMEOUT_MS, 'Export is taking longer than expected. The backend may be generating the shortlist file. Please retry shortly.');
}
