import type {
  HealthInfo,
  MaterialsInfo,
  PredictionRequest,
  PredictionResponse,
  VersionInfo,
} from '../types';

const API_BASE_URL = 'https://mfr-material-risk-engine.onrender.com';

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

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      (payload &&
        typeof payload === 'object' &&
        'detail' in payload &&
        typeof (payload as { detail?: unknown }).detail === 'string' &&
        (payload as { detail: string }).detail) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export function getHealth(): Promise<HealthInfo> {
  return requestJson<HealthInfo>('/health');
}

export function getVersion(): Promise<VersionInfo> {
  return requestJson<VersionInfo>('/version');
}

export function getMaterials(): Promise<MaterialsInfo> {
  return requestJson<MaterialsInfo>('/materials');
}

export function predict(payload: PredictionRequest): Promise<PredictionResponse> {
  return requestJson<PredictionResponse>('/predict', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}
