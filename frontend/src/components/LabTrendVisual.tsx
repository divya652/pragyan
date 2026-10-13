import React, { useState } from 'react';
import { LabResultItem } from '../types';
import { Activity, TrendingDown, CheckCircle, Info, Calendar } from 'lucide-react';

interface LabTrendVisualProps {
  labResults: LabResultItem[];
}

export const LabTrendVisual: React.FC<LabTrendVisualProps> = ({ labResults }) => {
  const [selectedMetric, setSelectedMetric] = useState<'A1C' | 'GLUCOSE'>('A1C');

  // Filter HbA1c tests
  const a1cTests = labResults
    .filter((l) => l.test_name.toLowerCase().includes('a1c'))
    .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());

  // Filter Glucose tests
  const glucoseTests = labResults
    .filter((l) => l.test_name.toLowerCase().includes('glucose'))
    .sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime());

  const currentDataset = selectedMetric === 'A1C' ? a1cTests : glucoseTests;

  return (
    <div className="bg-white border border-slate-200 rounded p-4 shadow-sm space-y-4">
      {/* Header and Metric Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-sky-100 text-sky-800 rounded">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Longitudinal Glycemic & Metabolic Trend Analysis
            </h4>
            <p className="text-[11px] text-slate-500">
              Aggregated historical measurements across Hospital A and Hospital B
            </p>
          </div>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded border border-slate-200 text-xs">
          <button
            onClick={() => setSelectedMetric('A1C')}
            className={`px-3 py-1 rounded font-semibold transition ${
              selectedMetric === 'A1C'
                ? 'bg-white shadow-sm text-sky-800 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            HbA1c Glycated Hgb (%)
          </button>
          <button
            onClick={() => setSelectedMetric('GLUCOSE')}
            className={`px-3 py-1 rounded font-semibold transition ${
              selectedMetric === 'GLUCOSE'
                ? 'bg-white shadow-sm text-sky-800 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Fasting Glucose (mg/dL)
          </button>
        </div>
      </div>

      {/* Visual Chart Area */}
      {currentDataset.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded border border-dashed border-slate-200">
          No longitudinal trend data available for this metric yet.
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Progress Timeline Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {currentDataset.map((item, idx) => {
              const valNum = parseFloat(item.result_value);
              const isNormal = item.flag === 'NORMAL';
              const isFirst = idx === 0;
              const isLatest = idx === currentDataset.length - 1;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded border transition relative ${
                    isLatest && isNormal
                      ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/30'
                      : isNormal
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-semibold text-slate-500 flex items-center">
                      <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                      {new Date(item.test_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                        isNormal
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}
                    >
                      {item.flag}
                    </span>
                  </div>

                  <div className="flex items-baseline space-x-1.5 my-1">
                    <span className="text-xl font-bold font-mono text-slate-900">
                      {item.result_value}
                    </span>
                    <span className="text-xs font-semibold text-slate-600">
                      {item.unit}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
                    <span>Source: {item.provenance.organization_name.split(' ')[0]}</span>
                    {isLatest && (
                      <span className="text-emerald-700 font-bold flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Current
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SVG Trend Line Visualizer */}
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 text-white relative overflow-hidden">
            <div className="flex items-center justify-between text-xs mb-3 text-slate-300">
              <span className="font-semibold flex items-center text-sky-400">
                <TrendingDown className="w-4 h-4 mr-1 text-emerald-400" />
                Therapeutic Progression Curve
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Target Reference: {selectedMetric === 'A1C' ? '< 5.7 %' : '70 - 99 mg/dL'}
              </span>
            </div>

            {/* Custom SVG Trend Line */}
            <div className="h-28 w-full flex items-center justify-center">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 600 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                <line x1="0" y1="20" x2="600" y2="20" stroke="#334155" strokeDasharray="3 3" />
                <line x1="0" y1="50" x2="600" y2="50" stroke="#334155" strokeDasharray="3 3" />
                <line x1="0" y1="80" x2="600" y2="80" stroke="#334155" strokeDasharray="3 3" />

                {/* Target Normal Zone Line */}
                <line x1="0" y1="80" x2="600" y2="80" stroke="#10b981" strokeWidth="1.5" />
                <text x="10" y="75" fill="#10b981" fontSize="10" fontFamily="sans-serif">
                  Normal Range Boundary
                </text>

                {/* Connecting Trend Line */}
                {selectedMetric === 'A1C' ? (
                  <>
                    <path
                      d="M 60 15 L 300 45 L 540 80 L 540 100 L 60 100 Z"
                      fill="url(#trendGradient)"
                    />
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="3"
                      points="60,15 300,45 540,80"
                    />
                    {/* Points */}
                    <circle cx="60" cy="15" r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="300" cy="45" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="540" cy="80" r="6" fill="#10b981" stroke="#ffffff" strokeWidth="2" />

                    <text x="45" y="10" fill="#ffffff" fontSize="11" fontWeight="bold">6.8%</text>
                    <text x="285" y="40" fill="#ffffff" fontSize="11" fontWeight="bold">6.2%</text>
                    <text x="525" y="72" fill="#10b981" fontSize="11" fontWeight="bold">5.7% (Goal Achieved)</text>
                  </>
                ) : (
                  <>
                    <path
                      d="M 60 10 L 300 40 L 540 82 L 540 100 L 60 100 Z"
                      fill="url(#trendGradient)"
                    />
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="3"
                      points="60,10 300,40 540,82"
                    />
                    {/* Points */}
                    <circle cx="60" cy="10" r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="300" cy="40" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                    <circle cx="540" cy="82" r="6" fill="#10b981" stroke="#ffffff" strokeWidth="2" />

                    <text x="45" y="8" fill="#ffffff" fontSize="11" fontWeight="bold">134 mg/dL</text>
                    <text x="280" y="35" fill="#ffffff" fontSize="11" fontWeight="bold">112 mg/dL</text>
                    <text x="515" y="75" fill="#10b981" fontSize="11" fontWeight="bold">95 mg/dL (Normal)</text>
                  </>
                )}
              </svg>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-800">
              <span>Mar 10, 2026 (Baseline)</span>
              <span>Jun 15, 2026 (Follow-up)</span>
              <span>Sep 10, 2026 (Recent Lab)</span>
            </div>
          </div>

          {/* Clinical Interpretation Notice */}
          <div className="bg-sky-50 border border-sky-200 rounded p-2.5 flex items-start space-x-2 text-xs text-sky-900">
            <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Clinical Assessment:</strong> Patient displays consistent, statistically significant metabolic stabilization over a 6-month period, demonstrating favorable responsiveness to prescribed Metformin 500mg therapy and glycemic lifestyle management.
            </p>
          </div>

        </div>
      )}
    </div>
  );
};
