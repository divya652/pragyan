import React from 'react';
import { 
  Activity, 
  ShieldCheck, 
  Database, 
  FileCheck2, 
  ArrowRight, 
  CheckCircle2, 
  Server, 
  Layers, 
  GitMerge, 
  Users, 
  Building2, 
  Lock, 
  Clock, 
  AlertTriangle, 
  HelpCircle,
  FileText,
  Stethoscope,
  HeartPulse,
  Eye,
  Hospital
} from 'lucide-react';

interface HomePageProps {
  onOpenAuth: (initialMode?: 'login' | 'register') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenAuth }) => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white text-slate-800 font-sans min-h-screen">
      
      {/* 3.3 HERO BANNER SECTION */}
      <section id="hero" className="relative bg-slate-50 border-b border-slate-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Content Panel */}
            <div className="lg:col-span-7 z-10 space-y-6">
              
              <div className="inline-flex items-center space-x-2 bg-sky-50 border border-sky-200 text-sky-800 px-3 py-1 rounded-full text-xs font-semibold">
                <Hospital className="w-3.5 h-3.5 text-sky-700" />
                <span>Multi-Hospital Interoperability Demonstration</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Connected Healthcare. <br className="hidden sm:inline" />
                <span className="text-sky-700">One Unified Patient View.</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl font-normal">
                Bring patient information from multiple healthcare systems together into one organized view, helping authorized healthcare professionals understand the patient's medical history while protecting privacy and data integrity.
              </p>

              {/* Action Buttons as requested in Section 3.3 */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                  id="btn-access-portal"
                  onClick={() => onOpenAuth('login')}
                  className="px-6 py-3 bg-sky-700 hover:bg-sky-800 text-white text-sm font-semibold rounded-md shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Access Patient Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  id="btn-explore-system"
                  onClick={() => scrollTo('services')}
                  className="px-6 py-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-sm font-semibold rounded-md transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Explore Our System</span>
                </button>
              </div>

              {/* Connected Facilities Trust Strip */}
              <div className="pt-4 border-t border-slate-200/80">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Simulated Ingestion Endpoints Conforming to HL7 FHIR:
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs">
                    <Building2 className="w-3.5 h-3.5 text-sky-600" />
                    <span className="font-medium text-slate-800">Hospital A: Metro General</span>
                    <span className="text-[10px] text-slate-400 font-mono">(FHIR R4)</span>
                  </div>
                  <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs">
                    <Building2 className="w-3.5 h-3.5 text-teal-600" />
                    <span className="font-medium text-slate-800">Hospital B: St. Jude Community</span>
                    <span className="text-[10px] text-slate-400 font-mono">(EHR SQL)</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Visual Image Panel (High quality clinical photograph) */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-white">
                <img
                  src="/hero_banner.jpg"
                  alt="Clinical professionals reviewing patient records in hospital setting"
                  className="w-full h-80 sm:h-96 object-cover object-center"
                />
                
                {/* Clean medical badge overlay */}
                <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-xs p-3 rounded-lg border border-slate-200 shadow-xs flex items-center space-x-3">
                  <div className="bg-sky-100 text-sky-800 p-2 rounded-md">
                    <HeartPulse className="w-5 h-5 text-sky-700" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Zero-Trust Clinical Access Control
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Strict role separation: Patient, Doctor, Receptionist, &amp; Admin
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3.4 SERVICES SECTION */}
      <section id="services" className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-sky-700 tracking-wider uppercase bg-sky-50 px-2.5 py-1 rounded border border-sky-100">
              Interoperability Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              Consolidated Healthcare Services
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Transforming fragmented records across disparate hospital software into a structured, longitudinal timeline for safe and coordinated clinical care.
            </p>
          </div>

          {/* 4 Service Blocks as mandated by Section 3.4 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Service 1 */}
            <div className="bg-slate-50/70 p-6 rounded-lg border border-slate-200 hover:border-sky-300 hover:shadow-xs transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded bg-sky-100 text-sky-700 flex items-center justify-center mb-4">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">
                  1. Unified Patient Records
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bring relevant records from different healthcare organizations into one consolidated patient view. Eliminates data silos across independent hospital EHR databases.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-semibold text-sky-800 flex items-center">
                <span>HL7 FHIR Normalized</span>
              </div>
            </div>

            {/* Service 2 */}
            <div className="bg-slate-50/70 p-6 rounded-lg border border-slate-200 hover:border-sky-300 hover:shadow-xs transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">
                  2. Clinical History and Reports
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Help authorized clinicians review diagnoses, allergies, medications, laboratory results, radiology DICOM studies, and previous clinical encounters in a unified timeline.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-semibold text-teal-800 flex items-center">
                <span>Interactive PACS &amp; Lab Trends</span>
              </div>
            </div>

            {/* Service 3 */}
            <div className="bg-slate-50/70 p-6 rounded-lg border border-slate-200 hover:border-sky-300 hover:shadow-xs transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">
                  3. Secure Information Access
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Protect medical records using authenticated accounts, role permissions, patient-level authorization, consent directives, and emergency break-glass audit logs.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-semibold text-indigo-800 flex items-center">
                <span>Role-Based Zero-Trust</span>
              </div>
            </div>

            {/* Service 4 */}
            <div className="bg-slate-50/70 p-6 rounded-lg border border-slate-200 hover:border-sky-300 hover:shadow-xs transition flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                  <GitMerge className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">
                  4. Data Accuracy and Traceability
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Identify missing or conflicting information, preserve original record sources with precise timestamps, and support controlled clinical review and reconciliation.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-semibold text-amber-800 flex items-center">
                <span>Full Provenance Tracking</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3.5 HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-slate-700 tracking-wider uppercase bg-white px-2.5 py-1 rounded border border-slate-200">
              Architecture &amp; Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              How The Unified Platform Works
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Four structured phases from multi-source data ingestion to role-governed clinical review:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            
            {/* Step 1 */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center">
                  1
                </span>
                <Server className="w-5 h-5 text-slate-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">
                Multi-Source Ingestion
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Records arrive from <strong>Hospital A</strong> (HL7 FHIR R4), <strong>Hospital B</strong> (Legacy EHR SQL), and external lab feeds without altering original sources.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center">
                  2
                </span>
                <Database className="w-5 h-5 text-slate-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">
                Validation &amp; Normalization
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Incoming payloads are validated for schema conformance, normalized into common FHIR resource schemas, and timestamped for indelible provenance.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center">
                  3
                </span>
                <GitMerge className="w-5 h-5 text-slate-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">
                Identity Matching &amp; Conflict Checks
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Safe deterministic and probabilistic Master Patient Index (MPI) matching is executed. Discrepancies in medications or allergies are flagged for review.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-2xs relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center">
                  4
                </span>
                <ShieldCheck className="w-5 h-5 text-slate-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">
                Authorized Consolidated View
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Authenticated clinicians view the unified medical chart; patients inspect their records; receptionists manage appointments with zero clinical leakage.
              </p>
            </div>

          </div>

          <div className="mt-8 bg-white p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 text-xs text-slate-600">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Safety Principle:</strong> Uncertain matches are never merged automatically based on similar names alone (e.g. father/son demographic disambiguation).
              </span>
            </div>
            <button
              onClick={() => onOpenAuth('login')}
              className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center space-x-1 flex-shrink-0"
            >
              <span>Test Live Interoperability</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

      {/* 3.6 ABOUT SECTION */}
      <section id="about" className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <div className="space-y-4">
              <span className="text-xs font-bold text-sky-700 tracking-wider uppercase bg-sky-50 px-2.5 py-1 rounded border border-sky-100">
                Project Overview
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Addressing Healthcare Fragmentation
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Modern healthcare delivery is profoundly distributed. A single patient frequently undergoes diagnostic tests at an outpatient laboratory, receives specialty cardiovascular care at a tertiary hospital, and fills medications at independent pharmacies.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Without a unified view, clinicians face incomplete patient records, uncoordinated care plans, duplicate radiation exposure, and life-threatening contraindications.
              </p>

              <div className="pt-2 space-y-2.5">
                <div className="flex items-start space-x-2.5 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Holistic Patient Context:</strong> Single source of truth consolidating diagnoses, medications, allergies, and diagnostic imaging.</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Strict Privacy by Design:</strong> Zero-Trust role partitioning ensures front-desk staff have zero access to confidential medical history.</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Emergency Break-Glass Protocol:</strong> Enables unassigned clinicians to access records in critical traumas while mandating written attestation and audit alerts.</span>
                </div>
              </div>
            </div>

            {/* Technical Highlights Box */}
            <div className="bg-slate-50 p-6 sm:p-8 rounded-xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-sky-700" />
                <span>Interoperability Standards &amp; Architecture</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="bg-white p-3 rounded border border-slate-200">
                  <div className="font-semibold text-slate-800">HL7 FHIR R4 Compatibility</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Maps Patient, Condition, MedicationRequest, Observation, Encounter, and DiagnosticReport resources into normalized schema.
                  </div>
                </div>

                <div className="bg-white p-3 rounded border border-slate-200">
                  <div className="font-semibold text-slate-800">Cryptographic Token Authorization</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Stateless JWT tokens with Argon2id password hashing and database-backed permission validation on every endpoint.
                  </div>
                </div>

                <div className="bg-white p-3 rounded border border-slate-200">
                  <div className="font-semibold text-slate-800">Deterministic &amp; Probabilistic MPI</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Jaro-Winkler string similarity, phone/email validation, and National ID verification preventing wrongful record merging.
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onOpenAuth('register')}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded text-center transition"
                >
                  Create Verified Account
                </button>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* CONTACT & SIMULATED FACILITIES SECTION */}
      <section id="contact" className="py-14 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="max-w-3xl mb-8">
            <span className="text-xs font-bold text-sky-700 tracking-wider uppercase bg-sky-50 px-2.5 py-1 rounded border border-sky-100">
              Healthcare Network
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-2">
              Participating Clinical Nodes
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Simulated healthcare institutions connected to the Unified Patient View interoperability network:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Building2 className="w-4 h-4 text-sky-700" />
                <span>Metro General Hospital (Main Campus)</span>
              </div>
              <p className="text-xs text-slate-600">
                Tertiary Care Hospital &amp; Surgical Center. Provides emergency, inpatient cardiology, radiology PACS imaging, and intensive care services.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 flex items-center space-x-3">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Node ID: HOSP-A-METRO</span>
                <span className="text-emerald-700 font-medium">● Simulated Endpoint Active</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <Building2 className="w-4 h-4 text-teal-700" />
                <span>St. Jude Community Health</span>
              </div>
              <p className="text-xs text-slate-600">
                Primary and Outpatient Community Clinic. Provides family practice, outpatient pharmacy prescriptions, routine phlebotomy, and health screenings.
              </p>
              <div className="pt-2 text-[11px] text-slate-500 flex items-center space-x-3">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Node ID: HOSP-B-STJUDE</span>
                <span className="text-emerald-700 font-medium">● Simulated Endpoint Active</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3.6 SIMPLE FOOTER */}
      <footer className="bg-slate-900 text-slate-300 py-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* Col 1: Branding & Summary */}
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center space-x-2">
                <div className="bg-sky-600 text-white p-1.5 rounded">
                  <Activity className="w-4 h-4" />
                </div>
                <span className="font-bold text-white text-sm tracking-tight">
                  UNIFIED PATIENT VIEW
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                Creating a Unified View of a Patient Across Systems. Academic hackathon demonstration of multi-hospital electronic health record aggregation, master patient indexing, and consent-governed clinical access.
              </p>
            </div>

            {/* Col 2: Navigation Links */}
            <div className="md:col-span-3 space-y-2">
              <div className="font-bold text-white text-xs uppercase tracking-wider">
                Quick Navigation
              </div>
              <ul className="space-y-1.5 text-slate-400">
                <li>
                  <button onClick={() => scrollTo('hero')} className="hover:text-white transition">
                    Home
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('services')} className="hover:text-white transition">
                    Services &amp; Capabilities
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('how-it-works')} className="hover:text-white transition">
                    How It Works
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('about')} className="hover:text-white transition">
                    About the Project
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollTo('contact')} className="hover:text-white transition">
                    Connected Facilities
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Role Portals */}
            <div className="md:col-span-4 space-y-2">
              <div className="font-bold text-white text-xs uppercase tracking-wider">
                Authorized Portals
              </div>
              <p className="text-slate-400 text-xs">
                Access is restricted to authorized credentials verified against backend RBAC policies:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] border border-slate-700 transition"
                >
                  Doctor Workspace
                </button>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] border border-slate-700 transition"
                >
                  Patient Self-Service
                </button>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] border border-slate-700 transition"
                >
                  Receptionist Desk
                </button>
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] border border-slate-700 transition"
                >
                  Admin Console
                </button>
              </div>
            </div>

          </div>

          {/* Synthetic Data Disclaimer as mandated by Section 3.6 */}
          <div className="pt-6 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span>Creating a Unified View of a Patient Across Systems</span>
              <span className="mx-2">•</span>
              <span>College Hackathon Interoperability Project</span>
            </div>
            <div className="text-slate-400 text-center sm:text-right">
              <strong>Notice:</strong> All data displayed in this application is entirely synthetic. No real patient health information (PHI) is collected, stored, or processed.
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};
