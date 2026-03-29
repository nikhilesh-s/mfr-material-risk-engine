import { api } from './api';

export const datasetService = {
  getMaterials: api.getMaterials,
  getClusters: api.getClusters,
  searchDataset: api.searchDataset,
  exportDataset: api.exportDataset,
  uploadDataset: api.uploadDataset,
  getCoatings: api.getCoatings,
  analyzeCoating: api.analyzeCoating,
};
