import { api } from './api';

export const systemService = {
  getHealth: api.getHealth,
  getVersion: api.getVersion,
  getRuntimeStatus: api.getRuntimeStatus,
  getModelMetadata: api.getModelMetadata,
  getSchemaStatus: api.getSchemaStatus,
  getDbStatus: api.getDbStatus,
};
