import type {
  CoatingsInfo,
  HealthInfo,
  MaterialsInfo,
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

async function requestJson<T>(
  path: string,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
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
      throw new ApiError('Backend timeout — retry', 408, null, 'TIMEOUT');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

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

export function getCoatings(): Promise<CoatingsInfo> {
  return requestJson<CoatingsInfo>('/coatings');
}

export function predict(payload: PredictionRequest): Promise<PredictionResponse> {
  return requestJson<PredictionResponse>('/predict', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, DEFAULT_TIMEOUT_MS);
}
