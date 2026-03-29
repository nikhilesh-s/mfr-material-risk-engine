import { api } from './api';

export const reportsService = {
  getTds: api.getTds,
  downloadTdsPdf: api.downloadTdsPdf,
  downloadReport: api.downloadReport,
};
