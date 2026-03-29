import { api } from './api';

export const analysisService = {
  predictMaterial: api.predictMaterial,
  optimizeMaterial: api.optimizeMaterial,
  rankMaterials: api.rankMaterials,
  compareMaterials: api.compareMaterials,
  simulateSensitivity: api.simulateSensitivity,
  getRecentAnalyses: api.getRecentAnalyses,
  getAnalysisById: api.getAnalysisById,
  getInteractiveAnalysis: api.getInteractiveAnalysis,
  exportRanking: api.exportRanking,
};
