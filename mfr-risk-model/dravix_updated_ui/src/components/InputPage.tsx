import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import logoSrc from '../assets/dravix_brand_(1).svg';

export interface AssessmentInput {
  materialType: string;
  temperature: string;
  exposureTime: string;
  environment: string;
}

interface InputPageProps {
  onNavigate: (page: 'home' | 'results') => void;
  onSubmit: (data: AssessmentInput) => void;
}

export default function InputPage({ onNavigate, onSubmit }: InputPageProps) {
  const [formData, setFormData] = useState<AssessmentInput>({
    materialType: 'Polymer',
    temperature: '',
    exposureTime: '',
    environment: 'Open Air'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onNavigate('results');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] to-[#e8eaed]">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 text-[#5c6770] hover:text-[#e26a2c] transition-all mb-10 font-medium hover:gap-3"
        >
          <ArrowLeft size={20} />
          Back to Home
        </button>

        <div className="bg-white rounded-3xl shadow-xl p-10">
          <div className="flex items-center gap-6 mb-10">
            <img src={logoSrc} alt="Dravix" className="h-20 drop-shadow-sm" />
            <div>
              <h1 className="text-4xl font-bold text-[#2c3e50]">
                Material Fire Risk Assessment
              </h1>
              <p className="text-[#a9b1b7] mt-1">Enter material parameters for analysis</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-[#2c3e50] mb-3">
                  Material Type
                </label>
                <select
                  value={formData.materialType}
                  onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
                  className="w-full px-5 py-4 bg-[#f8f9fa] border-2 border-transparent rounded-xl focus:ring-2 focus:ring-[#e26a2c] focus:bg-white focus:border-[#e26a2c] outline-none transition-all text-[#2c3e50] font-medium"
                  required
                >
                  <option value="Polymer">Polymer</option>
                  <option value="Composite">Composite</option>
                  <option value="Generic">Generic</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#2c3e50] mb-3">
                  Environment
                </label>
                <select
                  value={formData.environment}
                  onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                  className="w-full px-5 py-4 bg-[#f8f9fa] border-2 border-transparent rounded-xl focus:ring-2 focus:ring-[#e26a2c] focus:bg-white focus:border-[#e26a2c] outline-none transition-all text-[#2c3e50] font-medium"
                  required
                >
                  <option value="Open Air">Open Air</option>
                  <option value="Enclosed">Enclosed</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-[#2c3e50] mb-3">
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  placeholder="e.g., 450"
                  className="w-full px-5 py-4 bg-[#f8f9fa] border-2 border-transparent rounded-xl focus:ring-2 focus:ring-[#e26a2c] focus:bg-white focus:border-[#e26a2c] outline-none transition-all text-[#2c3e50] font-medium placeholder:text-[#a9b1b7]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#2c3e50] mb-3">
                  Exposure Time (minutes)
                </label>
                <input
                  type="number"
                  value={formData.exposureTime}
                  onChange={(e) => setFormData({ ...formData, exposureTime: e.target.value })}
                  placeholder="e.g., 30"
                  className="w-full px-5 py-4 bg-[#f8f9fa] border-2 border-transparent rounded-xl focus:ring-2 focus:ring-[#e26a2c] focus:bg-white focus:border-[#e26a2c] outline-none transition-all text-[#2c3e50] font-medium placeholder:text-[#a9b1b7]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-5 bg-gradient-to-r from-[#e26a2c] to-[#9e2a2b] text-white font-bold rounded-2xl hover:shadow-xl hover:scale-[1.02] transition-all duration-300 text-lg mt-8"
            >
              Analyze Fire Risk
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
