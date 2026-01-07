import { useMemo } from 'react';
import { ArrowLeft, Info, TrendingUp } from 'lucide-react';
import logoSrc from '../assets/dravix_brand_(1).svg';
import materialsData from '../data/materials.json';
import { AssessmentInput } from './InputScreen';

interface ResultsScreenProps {
  onBack: () => void;
  input: AssessmentInput;
  results: AssessmentResults;
}

export interface AssessmentResults {
  riskScore: number;
  riskClass: 'Low' | 'Medium' | 'High';
  resistanceIndex: number;
  comparison: string;
  interpretation: string;
}

type MaterialRecord = {
  materialName: string;
  materialType: string;
  heatFlux: number;
  timeToIgn: number;
  flowFactor: number;
  riskScore: number;
};

type SimilarMaterial = {
  materialName: string;
  similarityLevel: 'High' | 'Medium' | 'Low';
  relativeRisk: 'Lower' | 'Similar' | 'Higher';
};

const normalizeValue = (value: number, min: number, max: number) => {
  if (max === min) {
    return 0;
  }
  return (value - min) / (max - min);
};

const getRiskColor = (riskClass: string) => {
  switch (riskClass) {
    case 'Low':
      return 'bg-[#8b5e3c]';
    case 'Medium':
      return 'bg-[#e26a2c]';
    case 'High':
      return 'bg-[#9e2a2b]';
    default:
      return 'bg-[#5c6770]';
  }
};

const getRiskTextColor = (riskClass: string) => {
  switch (riskClass) {
    case 'Low':
      return 'text-[#8b5e3c]';
    case 'Medium':
      return 'text-[#e26a2c]';
    case 'High':
      return 'text-[#9e2a2b]';
    default:
      return 'text-[#5c6770]';
  }
};

const getExposureLevel = (temperature: number) => {
  if (temperature < 400) {
    return 'Low';
  }
  if (temperature < 1000) {
    return 'Moderate';
  }
  return 'High';
};

const getDurationLevel = (time: number) => {
  if (time < 30) {
    return 'Short';
  }
  if (time < 120) {
    return 'Moderate';
  }
  return 'Long';
};

const toTitleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export default function ResultsScreen({ onBack, input, results }: ResultsScreenProps) {
  const { similarMaterials, confidenceLevel, similarityDetail } = useMemo(() => {
    const data = materialsData as {
      minmax: Record<string, [number, number]>;
      records: MaterialRecord[];
    };
    const minmax = data.minmax;
    const records = data.records;

    const flowFactor = input.environment === 'enclosed' ? 1.15 : 0.85;
    const inputVector = [
      normalizeValue(input.temperature, minmax['HEAT FLUX'][0], minmax['HEAT FLUX'][1]),
      normalizeValue(input.exposureTime, minmax['TIME TO IGN'][0], minmax['TIME TO IGN'][1]),
      normalizeValue(flowFactor, minmax['FLOW FACTOR'][0], minmax['FLOW FACTOR'][1]),
    ];

    const maxDistance = Math.sqrt(3);
    const distances = records.map((record) => {
      const recordVector = [
        normalizeValue(record.heatFlux, minmax['HEAT FLUX'][0], minmax['HEAT FLUX'][1]),
        normalizeValue(record.timeToIgn, minmax['TIME TO IGN'][0], minmax['TIME TO IGN'][1]),
        normalizeValue(record.flowFactor, minmax['FLOW FACTOR'][0], minmax['FLOW FACTOR'][1]),
      ];
      const distance = Math.sqrt(
        recordVector.reduce((sum, value, index) => sum + (value - inputVector[index]) ** 2, 0),
      );
      const similarity = Math.max(0, 1 - distance / maxDistance);
      return { record, distance, similarity };
    });

    distances.sort((a, b) => a.distance - b.distance);
    const topMatches = distances.slice(0, 5);

    const similarMaterialsList: SimilarMaterial[] = topMatches.map(({ record, similarity }) => {
      const relativeRisk =
        record.riskScore < results.riskScore - 5
          ? 'Lower'
          : record.riskScore > results.riskScore + 5
            ? 'Higher'
            : 'Similar';

      const similarityLevel: SimilarMaterial['similarityLevel'] =
        similarity >= 0.75 ? 'High' : similarity >= 0.5 ? 'Medium' : 'Low';

      return {
        materialName: record.materialName || 'Material Sample',
        similarityLevel,
        relativeRisk,
      };
    });

    const avgSimilarity =
      topMatches.reduce((sum, item) => sum + item.similarity, 0) / topMatches.length;
    const baseConfidence =
      avgSimilarity >= 0.75 ? 'High' : avgSimilarity >= 0.5 ? 'Moderate' : 'Caution';

    let confidenceLevel: 'High' | 'Moderate' | 'Caution' = baseConfidence;
    if (input.materialType === 'polymer') {
      confidenceLevel = baseConfidence === 'High' ? 'Moderate' : 'Caution';
    }

    const similarityDetail =
      avgSimilarity >= 0.75
        ? 'Closest training samples closely match the provided exposure profile.'
        : avgSimilarity >= 0.5
          ? 'Closest training samples are moderately aligned with the provided exposure profile.'
          : 'Closest training samples are less similar to the provided exposure profile.';

    return {
      similarMaterials: similarMaterialsList,
      confidenceLevel,
      similarityDetail,
    };
  }, [input, results.riskScore]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e8eaed]">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#5c6770] hover:text-[#e26a2c] transition-all mb-10 font-medium hover:gap-3"
        >
          <ArrowLeft size={20} />
          New Assessment
        </button>

        <div className="flex items-center gap-6 mb-10">
          <img src={logoSrc} alt="Dravix" className="h-20 drop-shadow-sm" />
          <div>
            <h1 className="text-5xl font-bold text-[#2c3e50]">Assessment Results</h1>
            <p className="text-[#a9b1b7] mt-2 text-lg">
              Relative fire risk under controlled experimental conditions
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-[#8b5e3c] to-[#6d4a2e] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20" />
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm font-bold text-white/80 uppercase tracking-wide">Risk Score</div>
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="text-6xl font-bold mb-2">{results.riskScore}</div>
              <div className="text-white/70 text-sm font-medium">out of 100</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm font-bold text-[#2c3e50] uppercase tracking-wide">Risk Class</div>
              <div className="w-10 h-10 bg-[#f4f6f7] rounded-full flex items-center justify-center">
                <div className={`w-3 h-3 rounded-full ${getRiskColor(results.riskClass)}`} />
              </div>
            </div>
            <div className={`text-5xl font-bold mb-2 ${getRiskTextColor(results.riskClass)}`}>
              {results.riskClass}
            </div>
            <div className="text-[#a9b1b7] text-sm font-medium">Relative classification</div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm font-bold text-[#2c3e50] uppercase tracking-wide">Resistance Index</div>
              <div className="w-10 h-10 bg-[#f4f6f7] rounded-full flex items-center justify-center">
                <div className="text-[#5c6770] font-bold text-sm">RI</div>
              </div>
            </div>
            <div className="text-5xl font-bold mb-2 text-[#2c3e50]">{results.resistanceIndex}</div>
            <div className="text-[#a9b1b7] text-sm font-medium">Higher indicates more resistance</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold text-[#2c3e50] mb-6">Confidence Indicator</h2>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-[#5c6770]">Reliability</span>
              <span className="text-sm font-bold text-[#2c3e50]">{confidenceLevel}</span>
            </div>
            <p className="text-[#5c6770] leading-relaxed">{similarityDetail}</p>
            <p className="text-sm text-[#a9b1b7] mt-4">
              Polymers show higher variance in the training set; confidence is adjusted accordingly.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold text-[#2c3e50] mb-6">Exposure Severity Breakdown</h2>
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-xl">
                <span className="text-sm font-semibold text-[#5c6770]">Heat Exposure</span>
                <span className="text-sm font-bold text-[#2c3e50]">
                  {getExposureLevel(input.temperature)}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-xl">
                <span className="text-sm font-semibold text-[#5c6770]">Duration</span>
                <span className="text-sm font-bold text-[#2c3e50]">
                  {getDurationLevel(input.exposureTime)}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-xl">
                <span className="text-sm font-semibold text-[#5c6770]">Environment</span>
                <span className="text-sm font-bold text-[#2c3e50]">
                  {input.environment === 'enclosed' ? 'Enclosed' : 'Open'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold text-[#2c3e50] mb-6">Comparable Materials</h2>
            <div className="space-y-3">
              {similarMaterials.map((material) => (
                <div
                  key={`${material.materialName}-${material.similarityLevel}`}
                  className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-xl"
                >
                  <div>
                    <p className="text-[#2c3e50] font-semibold">{material.materialName}</p>
                    <p className="text-sm text-[#a9b1b7]">
                      Similarity: {material.similarityLevel}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#5c6770]">
                    {material.relativeRisk} Risk
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold text-[#2c3e50] mb-6">Explanation</h2>
            <p className="text-[#5c6770] leading-relaxed mb-4">
              {results.interpretation}
            </p>
            <div className="space-y-3 text-sm text-[#5c6770]">
              <p>
                Key drivers include heat exposure intensity, ignition behavior, and the exposure context
                captured by the test environment.
              </p>
              <p className="text-[#a9b1b7]">
                Higher heat exposure and faster ignition generally increase predicted risk.
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold text-[#2c3e50] mb-6">Assessment Inputs</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-xl">
                <span className="text-sm font-bold text-[#a9b1b7]">Material Type</span>
                <span className="text-[#2c3e50] font-semibold">{toTitleCase(input.materialType)}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-xl">
                <span className="text-sm font-bold text-[#a9b1b7]">Temperature</span>
                <span className="text-[#2c3e50] font-semibold">{input.temperature}°C</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-xl">
                <span className="text-sm font-bold text-[#a9b1b7]">Exposure Time</span>
                <span className="text-[#2c3e50] font-semibold">{input.exposureTime} minutes</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-xl">
                <span className="text-sm font-bold text-[#a9b1b7]">Environment</span>
                <span className="text-[#2c3e50] font-semibold">
                  {input.environment === 'enclosed' ? 'Enclosed / Confined' : 'Open Air'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-[#e26a2c] rounded-2xl p-8 flex gap-6 shadow-lg">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-[#e26a2c] bg-opacity-20 rounded-full flex items-center justify-center">
                <Info className="text-[#e26a2c]" size={24} />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-[#2c3e50] mb-3 text-lg">Explicit Limitations</h3>
              <p className="text-[#5c6770] leading-relaxed">
                This is a relative comparison tool, not a certification or fire rating. Outputs are valid only
                under similar experimental conditions and should be interpreted as early-stage guidance.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-[#a9b1b7]">
          Dravix v0.2 — Phase 2 Prototype
        </div>
      </div>
    </div>
  );
}
