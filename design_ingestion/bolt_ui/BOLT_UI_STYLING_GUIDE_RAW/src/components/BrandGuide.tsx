import { Shield, Flame, TrendingUp, Activity, Check, X, AlertTriangle } from 'lucide-react';
import chemistryIcon from '../assets/chemistry-svgrepo-com.svg';

export default function BrandGuide() {
  return (
    <div className="max-w-7xl mx-auto pb-16">
      <div className="mb-12">
        <h1 className="text-5xl font-light text-[#232422] mb-4">Dravix Design System</h1>
        <p className="text-lg text-[#232422]/60">
          Visual language and component library for the Dravix fire risk assessment platform
        </p>
      </div>

      <div className="space-y-12">
        {/* Brand Identity */}
        <section className="bg-[#FEFEFE] rounded-3xl p-8">
          <h2 className="text-3xl font-light text-[#232422] mb-6">Brand Identity</h2>
          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-1 flex items-center justify-center bg-[#24262E] rounded-2xl p-12">
              <img src={chemistryIcon} alt="Dravix Logo" className="w-32 h-32" />
            </div>
            <div className="col-span-2 space-y-4">
              <div>
                <h3 className="text-2xl font-light text-[#232422] mb-2">Dravix</h3>
                <p className="text-[#232422]/60">Fire Risk Assessment Platform</p>
              </div>
              <p className="text-sm text-[#232422]/70 leading-relaxed">
                Dravix provides advanced fire risk assessment through material property analysis and
                predictive modeling, delivering actionable insights for fire safety professionals and engineers.
              </p>
            </div>
          </div>
        </section>

        {/* Color Palette */}
        <section className="bg-[#FEFEFE] rounded-3xl p-8">
          <h2 className="text-3xl font-light text-[#232422] mb-6">Color Palette</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-[#232422]/60 mb-4 uppercase tracking-wide">Primary Colors</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="h-24 bg-gradient-to-r from-[#FFDC6A] to-[#FF8D7C] rounded-xl"></div>
                  <div className="text-sm font-medium text-[#232422]">Primary Gradient</div>
                  <div className="text-xs text-[#232422]/60 font-mono">#FFDC6A → #FF8D7C</div>
                </div>
                <div className="space-y-2">
                  <div className="h-24 bg-[#FFDC6A] rounded-xl"></div>
                  <div className="text-sm font-medium text-[#232422]">Accent Yellow</div>
                  <div className="text-xs text-[#232422]/60 font-mono">#FFDC6A</div>
                </div>
                <div className="space-y-2">
                  <div className="h-24 bg-[#FF8D7C] rounded-xl"></div>
                  <div className="text-sm font-medium text-[#232422]">Accent Coral</div>
                  <div className="text-xs text-[#232422]/60 font-mono">#FF8D7C</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-[#232422]/60 mb-4 uppercase tracking-wide">Neutral Colors</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="h-24 bg-[#232422] rounded-xl"></div>
                  <div className="text-sm font-medium text-[#232422]">Primary Dark</div>
                  <div className="text-xs text-[#232422]/60 font-mono">#232422</div>
                </div>
                <div className="space-y-2">
                  <div className="h-24 bg-[#24262E] rounded-xl"></div>
                  <div className="text-sm font-medium text-[#232422]">Secondary Dark</div>
                  <div className="text-xs text-[#232422]/60 font-mono">#24262E</div>
                </div>
                <div className="space-y-2">
                  <div className="h-24 bg-[#D0C7B5] rounded-xl"></div>
                  <div className="text-sm font-medium text-[#232422]">Surface Warm</div>
                  <div className="text-xs text-[#232422]/60 font-mono">#D0C7B5</div>
                </div>
                <div className="space-y-2">
                  <div className="h-24 bg-[#F5F1EC] rounded-xl"></div>
                  <div className="text-sm font-medium text-[#232422]">Background Light</div>
                  <div className="text-xs text-[#232422]/60 font-mono">#F5F1EC</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-[#232422]/60 mb-4 uppercase tracking-wide">Surface Colors</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="h-24 bg-[#FEFEFE] border-2 border-[#232422]/10 rounded-xl"></div>
                  <div className="text-sm font-medium text-[#232422]">Surface White</div>
                  <div className="text-xs text-[#232422]/60 font-mono">#FEFEFE</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="bg-[#FEFEFE] rounded-3xl p-8">
          <h2 className="text-3xl font-light text-[#232422] mb-6">Typography</h2>
          <div className="space-y-8">
            <div className="pb-6 border-b border-[#232422]/10">
              <div className="text-5xl font-light text-[#232422] mb-2">Heading XL</div>
              <div className="text-sm text-[#232422]/60 font-mono">text-5xl font-light</div>
            </div>
            <div className="pb-6 border-b border-[#232422]/10">
              <div className="text-4xl font-light text-[#232422] mb-2">Heading Large</div>
              <div className="text-sm text-[#232422]/60 font-mono">text-4xl font-light</div>
            </div>
            <div className="pb-6 border-b border-[#232422]/10">
              <div className="text-2xl font-light text-[#232422] mb-2">Section Heading</div>
              <div className="text-sm text-[#232422]/60 font-mono">text-2xl font-light</div>
            </div>
            <div className="pb-6 border-b border-[#232422]/10">
              <div className="text-lg font-light text-[#232422] mb-2">Subsection Heading</div>
              <div className="text-sm text-[#232422]/60 font-mono">text-lg font-light</div>
            </div>
            <div className="pb-6 border-b border-[#232422]/10">
              <div className="text-base text-[#232422] mb-2">Body Text - Regular weight for readable content and general UI text</div>
              <div className="text-sm text-[#232422]/60 font-mono">text-base</div>
            </div>
            <div className="pb-6 border-b border-[#232422]/10">
              <div className="text-sm text-[#232422] mb-2">Small Text - Used for labels, metadata, and secondary information</div>
              <div className="text-sm text-[#232422]/60 font-mono">text-sm</div>
            </div>
            <div className="pb-6 border-b border-[#232422]/10">
              <div className="text-xs text-[#232422]/60 mb-2">Caption Text - Minimal text for hints and helper text</div>
              <div className="text-sm text-[#232422]/60 font-mono">text-xs</div>
            </div>
            <div>
              <div className="text-sm font-mono text-[#232422] mb-2">Monospace Technical Text - #FFDC6A</div>
              <div className="text-sm text-[#232422]/60 font-mono">font-mono</div>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section className="bg-[#FEFEFE] rounded-3xl p-8">
          <h2 className="text-3xl font-light text-[#232422] mb-6">Buttons</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 items-center">
              <button className="px-8 py-3 bg-gradient-to-r from-[#FFDC6A] to-[#FF8D7C] text-[#232422] rounded-full font-medium hover:opacity-90 transition-opacity">
                Primary Button
              </button>
              <div className="col-span-2 text-sm text-[#232422]/60">
                Primary action button with gradient background
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 items-center">
              <button className="px-8 py-3 bg-[#232422] text-[#FEFEFE] rounded-full font-medium hover:bg-[#232422]/90 transition-colors">
                Secondary Button
              </button>
              <div className="col-span-2 text-sm text-[#232422]/60">
                Secondary action with dark background
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 items-center">
              <button className="px-6 py-2.5 bg-[#F5F1EC] text-[#232422] rounded-xl font-medium hover:bg-[#D0C7B5] transition-colors">
                Tertiary Button
              </button>
              <div className="col-span-2 text-sm text-[#232422]/60">
                Subtle action with light background
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 items-center">
              <button className="px-6 py-2.5 bg-[#FEFEFE]/10 text-[#FEFEFE] rounded-xl font-medium border border-[#FEFEFE]/20 hover:bg-[#FEFEFE]/20 transition-colors">
                <span className="text-[#232422]">Ghost Button</span>
              </button>
              <div className="col-span-2 text-sm text-[#232422]/60">
                Transparent button for dark backgrounds
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 items-center">
              <button className="w-12 h-12 bg-[#232422] rounded-2xl flex items-center justify-center hover:opacity-90 transition-opacity">
                <Flame className="w-5 h-5 text-[#FEFEFE]" />
              </button>
              <div className="col-span-2 text-sm text-[#232422]/60">
                Icon button for navigation
              </div>
            </div>
          </div>
        </section>

        {/* Cards and Panels */}
        <section className="bg-[#FEFEFE] rounded-3xl p-8">
          <h2 className="text-3xl font-light text-[#232422] mb-6">Cards and Panels</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-[#FEFEFE] rounded-3xl p-6 border-2 border-[#232422]/10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#FFDC6A] to-[#FF8D7C] rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#FEFEFE]" />
                </div>
                <span className="text-xs text-[#232422]/40">Metric</span>
              </div>
              <div className="text-4xl font-light text-[#232422] mb-1">73.2</div>
              <div className="text-sm text-[#232422]/60">Resistance Score</div>
              <div className="mt-4 h-1.5 bg-[#F5F1EC] rounded-full overflow-hidden">
                <div className="h-full w-[73%] bg-gradient-to-r from-[#FFDC6A] to-[#FF8D7C] rounded-full"></div>
              </div>
            </div>

            <div className="bg-[#24262E] rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-light text-[#FEFEFE]">Dark Card</h3>
                <span className="text-sm text-[#FEFEFE]/60">Info</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#FEFEFE]">Key Driver</span>
                  <span className="text-sm text-[#FFDC6A] font-medium">+28.5%</span>
                </div>
                <div className="h-2 bg-[#FEFEFE]/10 rounded-full overflow-hidden">
                  <div className="h-full w-[85%] bg-gradient-to-r from-[#FFDC6A] to-[#FF8D7C] rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="bg-[#D0C7B5] rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-br from-[#FFDC6A] to-[#FF8D7C] rounded-full blur-3xl opacity-40"></div>
              <div className="relative z-10">
                <h3 className="text-lg font-light text-[#232422] mb-2">Hero Card</h3>
                <p className="text-sm text-[#232422]/60">Warm surface with gradient blob accent</p>
              </div>
            </div>

            <div className="bg-[#F5F1EC] rounded-2xl p-6">
              <h3 className="text-sm font-medium text-[#232422] mb-3">Input Panel</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[#232422]/80 mb-1.5">Property Name</label>
                  <input
                    type="text"
                    placeholder="Enter value"
                    className="w-full px-4 py-2 bg-[#FEFEFE] rounded-xl text-sm text-[#232422] focus:outline-none focus:ring-2 focus:ring-[#FFDC6A]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Form Inputs */}
        <section className="bg-[#FEFEFE] rounded-3xl p-8">
          <h2 className="text-3xl font-light text-[#232422] mb-6">Form Inputs</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-[#232422]/80 mb-2">Text Input</label>
                <input
                  type="text"
                  placeholder="Enter material name"
                  className="w-full px-4 py-2 bg-[#F5F1EC] rounded-xl text-sm text-[#232422] focus:outline-none focus:ring-2 focus:ring-[#FFDC6A]"
                />
              </div>
              <div>
                <label className="block text-sm text-[#232422]/80 mb-2">Number Input</label>
                <input
                  type="text"
                  placeholder="260"
                  className="w-full px-4 py-2 bg-[#F5F1EC] rounded-xl text-sm text-[#232422] text-right focus:outline-none focus:ring-2 focus:ring-[#FFDC6A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-[#24262E] rounded-2xl p-4">
                <h3 className="text-sm font-medium text-[#FEFEFE] mb-3">Toggle Group</h3>
                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFDC6A] to-[#FF8D7C] text-[#232422] text-sm font-medium">
                    Active
                  </button>
                  <button className="flex-1 px-4 py-2 rounded-xl bg-[#FEFEFE]/10 text-[#FEFEFE] text-sm font-medium hover:bg-[#FEFEFE]/20">
                    Inactive
                  </button>
                </div>
              </div>

              <div className="bg-[#F5F1EC] rounded-2xl p-4">
                <h3 className="text-sm font-medium text-[#232422] mb-3">Selection Buttons</h3>
                <div className="grid grid-cols-3 gap-2">
                  <button className="px-3 py-2 bg-[#FEFEFE] rounded-lg text-xs text-[#232422] hover:bg-[#D0C7B5] transition-colors">
                    Option 1
                  </button>
                  <button className="px-3 py-2 bg-[#FEFEFE] rounded-lg text-xs text-[#232422] hover:bg-[#D0C7B5] transition-colors">
                    Option 2
                  </button>
                  <button className="px-3 py-2 bg-[#FEFEFE] rounded-lg text-xs text-[#232422] hover:bg-[#D0C7B5] transition-colors">
                    Option 3
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Metrics */}
        <section className="bg-[#FEFEFE] rounded-3xl p-8">
          <h2 className="text-3xl font-light text-[#232422] mb-6">Dashboard Metrics</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-[#FEFEFE] border-2 border-[#232422]/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#FFDC6A] to-[#FF8D7C] rounded-xl flex items-center justify-center">
                  <Flame className="w-5 h-5 text-[#FEFEFE]" />
                </div>
                <span className="text-xs text-[#232422]/40">Risk</span>
              </div>
              <div className="text-4xl font-light text-[#232422] mb-1">73.2</div>
              <div className="text-sm text-[#232422]/60">Resistance Score</div>
            </div>

            <div className="bg-[#FEFEFE] border-2 border-[#232422]/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#FFDC6A] to-[#FF8D7C] rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-[#FEFEFE]" />
                </div>
                <span className="text-xs text-[#232422]/40">Model</span>
              </div>
              <div className="text-4xl font-light text-[#232422] mb-1">0.87</div>
              <div className="text-sm text-[#232422]/60">Confidence Index</div>
            </div>

            <div className="bg-[#FEFEFE] border-2 border-[#232422]/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#FFDC6A] to-[#FF8D7C] rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#FEFEFE]" />
                </div>
                <span className="text-xs text-[#232422]/40">Impact</span>
              </div>
              <div className="text-4xl font-light text-[#232422] mb-1">+18.3%</div>
              <div className="text-sm text-[#232422]/60">Coating Modifier</div>
            </div>
          </div>
        </section>

        {/* Status Indicators */}
        <section className="bg-[#FEFEFE] rounded-3xl p-8">
          <h2 className="text-3xl font-light text-[#232422] mb-6">Status Indicators</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-[#232422]/60 mb-4 uppercase tracking-wide">Risk Levels</h3>
              <div className="flex gap-4">
                <div className="px-4 py-2 bg-[#FF8D7C] text-[#FEFEFE] text-sm rounded-full font-medium">
                  High Risk
                </div>
                <div className="px-4 py-2 bg-[#FFDC6A] text-[#232422] text-sm rounded-full font-medium">
                  Moderate Risk
                </div>
                <div className="px-4 py-2 bg-[#232422] text-[#FEFEFE] text-sm rounded-full font-medium">
                  Low Risk
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-[#232422]/60 mb-4 uppercase tracking-wide">Confidence Levels</h3>
              <div className="flex gap-4">
                <div className="px-4 py-2 bg-[#232422] text-[#FFDC6A] text-sm rounded-full font-medium">
                  High Confidence
                </div>
                <div className="px-4 py-2 bg-[#232422] text-[#FEFEFE]/60 text-sm rounded-full font-medium">
                  Medium Confidence
                </div>
                <div className="px-4 py-2 bg-[#232422]/20 text-[#232422]/60 text-sm rounded-full font-medium">
                  Low Confidence
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-[#232422]/60 mb-4 uppercase tracking-wide">State Indicators</h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-[#F5F1EC] rounded-xl">
                  <Check className="w-4 h-4 text-[#232422]" />
                  <span className="text-sm text-[#232422]">Validated</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-[#F5F1EC] rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-[#FF8D7C]" />
                  <span className="text-sm text-[#232422]">Warning</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-[#F5F1EC] rounded-xl">
                  <X className="w-4 h-4 text-[#232422]/40" />
                  <span className="text-sm text-[#232422]/60">Not Available</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Layout Grid */}
        <section className="bg-[#FEFEFE] rounded-3xl p-8">
          <h2 className="text-3xl font-light text-[#232422] mb-6">Layout Grid</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-8 bg-[#D0C7B5] rounded-2xl p-6 text-center text-sm text-[#232422]/60">
                col-span-8
              </div>
              <div className="col-span-4 bg-[#F5F1EC] rounded-2xl p-6 text-center text-sm text-[#232422]/60">
                col-span-4
              </div>
            </div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6 bg-[#F5F1EC] rounded-2xl p-6 text-center text-sm text-[#232422]/60">
                col-span-6
              </div>
              <div className="col-span-6 bg-[#F5F1EC] rounded-2xl p-6 text-center text-sm text-[#232422]/60">
                col-span-6
              </div>
            </div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-4 bg-[#F5F1EC] rounded-2xl p-6 text-center text-sm text-[#232422]/60">
                col-span-4
              </div>
              <div className="col-span-4 bg-[#F5F1EC] rounded-2xl p-6 text-center text-sm text-[#232422]/60">
                col-span-4
              </div>
              <div className="col-span-4 bg-[#F5F1EC] rounded-2xl p-6 text-center text-sm text-[#232422]/60">
                col-span-4
              </div>
            </div>
          </div>
          <div className="mt-6 p-4 bg-[#F5F1EC] rounded-xl">
            <p className="text-xs text-[#232422]/60">
              12-column grid system with 6 unit gap (1.5rem). Components use rounded-3xl (1.5rem) for cards and rounded-xl (0.75rem) for inputs.
            </p>
          </div>
        </section>

        {/* Example Screens */}
        <section className="bg-[#FEFEFE] rounded-3xl p-8">
          <h2 className="text-3xl font-light text-[#232422] mb-6">Example Dashboard Compositions</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-[#232422]/60 mb-4 uppercase tracking-wide">Input Panel Example</h3>
              <div className="bg-[#FEFEFE] border-2 border-[#232422]/10 rounded-3xl p-6">
                <h3 className="text-lg font-light text-[#232422] mb-4">Material Properties</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-4">
                    <label className="flex-1 text-sm text-[#232422]/80">Melting Point</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value="260"
                        readOnly
                        className="w-24 px-3 py-2 bg-[#F5F1EC] rounded-xl text-sm text-[#232422] text-right"
                      />
                      <span className="text-xs text-[#232422]/50 w-8">°C</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 text-sm text-[#232422]/80">Density</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value="1.38"
                        readOnly
                        className="w-24 px-3 py-2 bg-[#F5F1EC] rounded-xl text-sm text-[#232422] text-right"
                      />
                      <span className="text-xs text-[#232422]/50 w-8">g/cc</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-[#232422]/60 mb-4 uppercase tracking-wide">Results Panel Example</h3>
              <div className="bg-[#D0C7B5] rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-[#FFDC6A] to-[#FF8D7C] rounded-full blur-3xl opacity-40"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-light text-[#232422]">Fire Resistance</h3>
                    <div className="px-3 py-1.5 bg-[#232422] text-[#FFDC6A] text-xs rounded-full font-medium">
                      High Confidence
                    </div>
                  </div>
                  <div className="text-6xl font-light text-[#232422] mb-2">73.2</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-[#232422]/10 rounded-full overflow-hidden">
                      <div className="h-full w-[73%] bg-gradient-to-r from-[#FFDC6A] to-[#FF8D7C] rounded-full"></div>
                    </div>
                    <span className="text-xs text-[#232422]/70 font-medium">Moderate-High</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-[#232422]/60 mb-4 uppercase tracking-wide">Insights Panel Example</h3>
              <div className="bg-[#24262E] rounded-3xl p-6">
                <h3 className="text-lg font-light text-[#FEFEFE] mb-4">Key Drivers</h3>
                <div className="space-y-3">
                  {[
                    { name: 'LOI (Limiting Oxygen Index)', value: '+28.5%' },
                    { name: 'Char Yield', value: '+22.1%' },
                    { name: 'Coating FR-07B', value: '+18.3%' },
                  ].map((driver, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#FEFEFE]">{driver.name}</span>
                        <span className="text-sm text-[#FFDC6A] font-medium">{driver.value}</span>
                      </div>
                      <div className="h-2 bg-[#FEFEFE]/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#FFDC6A] to-[#FF8D7C] rounded-full"
                             style={{ width: `${(3 - i) * 30}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
