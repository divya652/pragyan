import React, { useState } from 'react';
import { RadiologyItem } from '../types';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Sun, 
  Sliders, 
  FileText, 
  Maximize2, 
  Building2, 
  UserCheck, 
  Calendar, 
  ShieldCheck 
} from 'lucide-react';

interface RadiologyViewerModalProps {
  study: RadiologyItem | null;
  patientName: string;
  patientId: string;
  onClose: () => void;
}

export const RadiologyViewerModal: React.FC<RadiologyViewerModalProps> = ({
  study,
  patientName,
  patientId,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);
  const [invert, setInvert] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [brightness, setBrightness] = useState(100);

  if (!study) return null;

  const handleReset = () => {
    setZoom(1);
    setInvert(false);
    setHighContrast(false);
    setBrightness(100);
  };

  const imageFilter = `
    ${invert ? 'invert(100%)' : ''} 
    ${highContrast ? 'contrast(150%)' : 'contrast(100%)'} 
    brightness(${brightness}%)
  `.trim();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-5xl w-full flex flex-col overflow-hidden text-slate-100 max-h-[94vh]">
        
        {/* DICOM PACS Header */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="bg-sky-500/20 text-sky-400 border border-sky-500/40 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              DICOM {study.modality} VIEWER
            </span>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                {study.study_type}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {patientName} ({patientId}) • Series UID: {study.dicom_series_uid || '1.2.840.113619.2.55.1'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block">
              {new Date(study.study_date).toLocaleDateString()}
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DICOM Control Toolbar */}
        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
              className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Zoom In</span>
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
              className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
              <span>Zoom Out</span>
            </button>
            <span className="text-[11px] font-mono text-slate-400 px-1">
              {Math.round(zoom * 100)}%
            </span>

            <div className="h-4 w-px bg-slate-700 mx-1" />

            <button
              onClick={() => setInvert((inv) => !inv)}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded border transition ${
                invert
                  ? 'bg-sky-600 text-white border-sky-500 font-semibold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Toggle Invert Colors (Negative/Positive)"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Invert Gray</span>
            </button>

            <button
              onClick={() => setHighContrast((hc) => !hc)}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded border transition ${
                highContrast
                  ? 'bg-amber-600 text-white border-amber-500 font-semibold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Toggle Enhanced Contrast"
            >
              <Sun className="w-3.5 h-3.5" />
              <span>High Contrast</span>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded border border-slate-700 transition"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <span className="flex items-center">
              <Building2 className="w-3 h-3 mr-1 text-slate-400" />
              {study.provenance.organization_name}
            </span>
          </div>
        </div>

        {/* Main Viewer Body (Image + Diagnostic Report Panel) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden min-h-[460px]">
          
          {/* Medical Image Canvas */}
          <div className="lg:col-span-2 bg-black relative flex items-center justify-center p-4 overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800 select-none">
            
            {/* DICOM OSD (On-Screen Display Metadata) */}
            <div className="absolute top-3 left-3 z-10 pointer-events-none text-[11px] font-mono text-emerald-400/90 leading-relaxed drop-shadow bg-black/40 px-2 py-1 rounded border border-emerald-500/20">
              <div>PATIENT: {patientName.toUpperCase()}</div>
              <div>ID: {patientId}</div>
              <div>MODALITY: {study.modality} ({study.body_region})</div>
            </div>

            <div className="absolute top-3 right-3 z-10 pointer-events-none text-[11px] font-mono text-emerald-400/90 text-right leading-relaxed drop-shadow bg-black/40 px-2 py-1 rounded border border-emerald-500/20">
              <div>ACQUISITION: {new Date(study.study_date).toLocaleDateString()}</div>
              <div>STATUS: {study.status}</div>
              <div>ZOOM: {Math.round(zoom * 100)}%</div>
            </div>

            {/* Diagnostic Image */}
            <div className="overflow-auto max-h-[500px] flex items-center justify-center w-full h-full">
              <img
                src={study.image_url}
                alt={study.study_type}
                style={{
                  transform: `scale(${zoom})`,
                  filter: imageFilter,
                  transition: 'transform 0.15s ease-out, filter 0.15s ease-out',
                }}
                className="max-h-[460px] object-contain rounded shadow-lg"
              />
            </div>

            {/* Bottom Scale / Orientation indicator */}
            <div className="absolute bottom-3 left-3 z-10 pointer-events-none text-[10px] font-mono text-slate-400 bg-black/60 px-2 py-0.5 rounded">
              L: R | WINDOW: LUNG/SOFT-TISSUE | KVP: 120
            </div>
          </div>

          {/* Diagnostic Radiologist Impression & Report */}
          <div className="bg-slate-900 p-5 overflow-y-auto space-y-4 text-xs">
            <div className="border-b border-slate-800 pb-3">
              <div className="text-[11px] uppercase font-bold text-sky-400 tracking-wider">
                Formal Diagnostic Radiology Report
              </div>
              <h4 className="text-sm font-semibold text-white mt-1">
                {study.study_type}
              </h4>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Body Region: <strong className="text-slate-200">{study.body_region}</strong> • Modality: <strong className="text-slate-200">{study.modality}</strong>
              </p>
            </div>

            {/* Performing Details */}
            <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Performing Facility:</span>
                <span className="text-slate-200 font-medium">{study.provenance.organization_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reporting Radiologist:</span>
                <span className="text-slate-200 font-medium">{study.radiologist_name || 'Staff Radiologist'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Exam Timestamp:</span>
                <span className="text-slate-200 font-mono">{new Date(study.study_date).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Verification Status:</span>
                <span className="text-emerald-400 font-semibold">{study.status}</span>
              </div>
            </div>

            {/* Clinical Findings / Summary */}
            <div className="space-y-1.5">
              <h5 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1 text-sky-400" />
                Findings & Description
              </h5>
              <div className="bg-slate-950/70 p-3 rounded border border-slate-800 text-slate-300 leading-relaxed text-[11px] whitespace-pre-line font-sans">
                {study.summary}
              </div>
            </div>

            {/* Diagnostic Impression */}
            <div className="space-y-1.5">
              <h5 className="font-bold text-amber-400 text-xs uppercase tracking-wider flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-amber-400" />
                Radiological Impression
              </h5>
              <div className="bg-amber-950/30 border border-amber-900/50 p-3 rounded text-amber-200 font-medium text-[11px] leading-relaxed">
                {study.impression}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono text-center">
              Signed electronically by {study.radiologist_name || 'Attending Radiologist'} under Digital Signature Act.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-4 py-2.5 border-t border-slate-800 flex justify-between items-center text-xs">
          <span className="text-slate-500 text-[11px]">
            DICOM Standard Compliance • Interoperable Web PACS Viewer
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold transition"
          >
            Close Viewer
          </button>
        </div>

      </div>
    </div>
  );
};
