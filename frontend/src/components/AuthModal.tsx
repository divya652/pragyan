import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  Lock, 
  User, 
  Mail, 
  Calendar, 
  Eye, 
  EyeOff, 
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Building2, 
  Stethoscope, 
  UserCheck, 
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  onClose,
}) => {
  const { login, register, demoLogin, loading, error, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Sync mode if initialMode changes
  React.useEffect(() => {
    setMode(initialMode);
    clearError();
  }, [initialMode]);

  // Sign In Form State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Form State
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('FEMALE');
  const [role, setRole] = useState<'patient' | 'doctor' | 'receptionist'>('patient');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  
  // Role-specific fields
  const [patientId, setPatientId] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [facility, setFacility] = useState('Metro General Hospital');
  const [specialty, setSpecialty] = useState('General Medicine');

  // Local feedback & validation
  const [clientError, setClientError] = useState<string | null>(null);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);
    clearError();

    if (!loginIdentifier.trim()) {
      setClientError('Please enter your username, email, or staff ID.');
      return;
    }
    if (!loginPassword) {
      setClientError('Please enter your password.');
      return;
    }

    try {
      await login(loginIdentifier.trim(), loginPassword);
      onClose();
    } catch {
      // Error handled in AuthContext
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);
    setRegSuccessMessage(null);
    clearError();

    // Client-side validations
    if (fullName.trim().length < 2) {
      setClientError('Full name must be at least 2 characters.');
      return;
    }
    // Reject pure numbers or special symbols in name
    if (/^[\d\s\W]+$/.test(fullName.trim())) {
      setClientError('Full name cannot consist exclusively of numbers or symbols.');
      return;
    }

    if (!regEmail.includes('@') || !regEmail.includes('.')) {
      setClientError('Please enter a valid email address.');
      return;
    }

    if (role === 'patient') {
      if (!dob) {
        setClientError('Date of birth is required for patient identity verification.');
        return;
      }
      const dobDate = new Date(dob);
      if (isNaN(dobDate.getTime()) || dobDate > new Date()) {
        setClientError('Please enter a valid date of birth (cannot be in the future).');
        return;
      }
    }

    if (regPassword.length < 8) {
      setClientError('Password must be at least 8 characters in length.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setClientError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      const payload: any = {
        full_name: fullName.trim(),
        email: regEmail.trim().toLowerCase(),
        role: role,
        password: regPassword,
        dob: dob || undefined,
        gender: role === 'patient' ? gender : undefined,
        patient_id: role === 'patient' && patientId.trim() ? patientId.trim() : undefined,
        license_number: role === 'doctor' && licenseNumber.trim() ? licenseNumber.trim() : undefined,
        facility: facility,
        specialty: role === 'doctor' ? specialty : undefined,
      };

      const res = await register(payload);
      setRegSuccessMessage(res.message || 'Registration successful! You may now sign in.');
      setMode('login');
      setLoginIdentifier(regEmail.trim().toLowerCase());
      setLoginPassword('');
    } catch {
      // Error handled in AuthContext
    }
  };

  const handleDemoSelect = async (demoRole: any, variant?: string) => {
    clearError();
    setClientError(null);
    try {
      await demoLogin(demoRole, variant);
      onClose();
    } catch {
      // Error handled
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="bg-sky-600 p-1.5 rounded">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                Healthcare Access Gateway
              </h3>
              <p className="text-[11px] text-slate-300">
                Unified Patient View Across Multi-Hospital Systems
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setClientError(null);
              clearError();
            }}
            className={`flex-1 py-3 text-center transition border-b-2 ${
              mode === 'login'
                ? 'border-sky-600 text-sky-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            Sign In to Portal
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setClientError(null);
              clearError();
            }}
            className={`flex-1 py-3 text-center transition border-b-2 ${
              mode === 'register'
                ? 'border-sky-600 text-sky-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            Register New Account
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          
          {/* Status Banners */}
          {(clientError || error) && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">
                  {clientError ? 'Validation Error' : 'Registration Failed'}
                </p>
                <p className="mt-0.5">{clientError || error}</p>
                <button
                  type="button"
                  onClick={() => { setClientError(null); clearError(); }}
                  className="mt-1 text-[11px] underline text-rose-700"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {regSuccessMessage && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-lg flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{regSuccessMessage}</span>
              </div>
            </div>
          )}

          {/* MODE: SIGN IN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username, Email, or Staff ID <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. doctor_mehta, patient_ananya, or email"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 bg-white text-slate-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password <span className="text-rose-500">*</span>
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 bg-white text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-md shadow-sm text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition disabled:opacity-50"
                >
                  {loading ? 'Verifying Credentials...' : 'Sign In to Protected Portal'}
                  <ArrowRight className="ml-1.5 w-4 h-4" />
                </button>
              </div>

              {/* Quick 1-Click Demo Persona Grid */}
              <div className="mt-4 pt-4 border-t border-slate-200 bg-slate-50 p-3 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Instant Demo Login (7 Roles)
                  </span>
                  <span className="text-[10px] text-teal-700 bg-teal-100 font-semibold px-2 py-0.5 rounded-full">
                    Pre-Seeded Data
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={async () => { await demoLogin('patient', 'patient_ananya'); onClose(); }}
                    className="p-1.5 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded text-left transition"
                  >
                    <div className="font-semibold text-slate-800 text-[11px]">1. Patient (Ananya)</div>
                    <div className="text-[10px] text-slate-500">View own longitudinal EHR</div>
                  </button>
                  <button
                    type="button"
                    onClick={async () => { await demoLogin('doctor', 'doctor_mehta'); onClose(); }}
                    className="p-1.5 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 rounded text-left transition"
                  >
                    <div className="font-semibold text-slate-800 text-[11px]">2. Doctor (Dr. Mehta)</div>
                    <div className="text-[10px] text-slate-500">Cardiology • NMR Verified</div>
                  </button>
                  <button
                    type="button"
                    onClick={async () => { await demoLogin('doctor', 'doctor_gupta'); onClose(); }}
                    className="p-1.5 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded text-left transition"
                  >
                    <div className="font-semibold text-slate-800 text-[11px]">2b. Doctor (Dr. Gupta)</div>
                    <div className="text-[10px] text-slate-500">Gen Med • Pending NMR</div>
                  </button>
                  <button
                    type="button"
                    onClick={async () => { await demoLogin('receptionist'); onClose(); }}
                    className="p-1.5 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded text-left transition"
                  >
                    <div className="font-semibold text-slate-800 text-[11px]">3. Receptionist (Rajesh)</div>
                    <div className="text-[10px] text-slate-500">OPD intake &amp; Token queue</div>
                  </button>
                  <button
                    type="button"
                    onClick={async () => { await demoLogin('lab_technician'); onClose(); }}
                    className="p-1.5 bg-white hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 rounded text-left transition"
                  >
                    <div className="font-semibold text-slate-800 text-[11px]">4. Lab Tech (Vikram)</div>
                    <div className="text-[10px] text-slate-500">Specimens &amp; Lab reports</div>
                  </button>
                  <button
                    type="button"
                    onClick={async () => { await demoLogin('pharmacist'); onClose(); }}
                    className="p-1.5 bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded text-left transition"
                  >
                    <div className="font-semibold text-slate-800 text-[11px]">5. Pharmacist (Sunita)</div>
                    <div className="text-[10px] text-slate-500">Medication dispensing</div>
                  </button>
                  <button
                    type="button"
                    onClick={async () => { await demoLogin('cashier'); onClose(); }}
                    className="p-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded text-left transition"
                  >
                    <div className="font-semibold text-slate-800 text-[11px]">6. Cashier (Amit)</div>
                    <div className="text-[10px] text-slate-500">Billing &amp; Receipts (Paid)</div>
                  </button>
                  <button
                    type="button"
                    onClick={async () => { await demoLogin('admin'); onClose(); }}
                    className="p-1.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded text-left transition"
                  >
                    <div className="font-semibold text-slate-800 text-[11px]">7. Admin (Eleanor)</div>
                    <div className="text-[10px] text-slate-500">Analytics &amp; Verification</div>
                  </button>
                </div>
              </div>

              <div className="text-center pt-2">
                <p className="text-[11px] text-slate-500">
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setClientError(null);
                      clearError();
                    }}
                    className="text-sky-700 font-semibold hover:underline"
                  >
                    Register new account
                  </button>
                </p>
              </div>
            </form>

          )}

          {/* MODE: REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 max-h-[62vh] overflow-y-auto pr-1">
              
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Type / Role <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('patient')}
                    className={`py-2 px-2 rounded border text-center text-xs font-medium transition flex flex-col items-center gap-1 ${
                      role === 'patient'
                        ? 'border-sky-600 bg-sky-50 text-sky-800 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-sky-600" />
                    <span>Patient</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('doctor')}
                    className={`py-2 px-2 rounded border text-center text-xs font-medium transition flex flex-col items-center gap-1 ${
                      role === 'doctor'
                        ? 'border-sky-600 bg-sky-50 text-sky-800 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4 text-sky-600" />
                    <span>Doctor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('receptionist')}
                    className={`py-2 px-2 rounded border text-center text-xs font-medium transition flex flex-col items-center gap-1 ${
                      role === 'receptionist'
                        ? 'border-sky-600 bg-sky-50 text-sky-800 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-sky-600" />
                    <span>Receptionist</span>
                  </button>
                </div>

                {/* Administrator Locked Notice as per requirements */}
                <div className="mt-1.5 flex items-center space-x-1.5 text-[10px] text-slate-500 bg-slate-100 p-1.5 rounded border border-slate-200">
                  <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>
                    <strong>Administrator Notice:</strong> Public admin self-registration is locked by security policy. Provisioning must occur via internal IT consoles.
                  </span>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ananya Sharma or Dr. Arvind Mehta"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* Role-Specific Fields */}
              {role === 'patient' && (
                <div className="grid grid-cols-2 gap-3 bg-sky-50/50 p-2.5 rounded border border-sky-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Date of Birth <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="date"
                        required
                        max={new Date().toISOString().split('T')[0]}
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-900"
                    >
                      <option value="FEMALE">Female</option>
                      <option value="MALE">Male</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Existing National Health / ABHA ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                      placeholder="e.g. ABHA-9921-8842-1092"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-900"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Leave blank to auto-generate a verified cross-system identifier.
                    </p>
                  </div>
                </div>
              )}

              {role === 'doctor' && (
                <div className="grid grid-cols-2 gap-3 bg-sky-50/50 p-2.5 rounded border border-sky-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Medical License #
                    </label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="MCI-REG-8472"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Clinical Specialty
                    </label>
                    <input
                      type="text"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="Cardiology / Internal Med"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-900"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Assigned Facility
                    </label>
                    <select
                      value={facility}
                      onChange={(e) => setFacility(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-900"
                    >
                      <option value="Metro General Hospital">Metro General Hospital (Main Campus)</option>
                      <option value="St. Jude Community Health">St. Jude Community Health</option>
                      <option value="Apex Multi-Speciality Clinic">Apex Multi-Speciality Clinic</option>
                    </select>
                  </div>
                </div>
              )}

              {role === 'receptionist' && (
                <div className="bg-sky-50/50 p-2.5 rounded border border-sky-100">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Front Desk Facility Location
                  </label>
                  <select
                    value={facility}
                    onChange={(e) => setFacility(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-900"
                  >
                    <option value="Metro General Hospital - Intake Desk A">Metro General Hospital - Intake Desk A</option>
                    <option value="St. Jude Outpatient Intake">St. Jude Outpatient Intake</option>
                  </select>
                </div>
              )}

              {/* Password & Confirm */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 8 chars"
                      className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded text-xs bg-white text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-md shadow-sm text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition disabled:opacity-50"
                >
                  {loading ? 'Creating Verified Account...' : 'Complete Account Registration'}
                  <ArrowRight className="ml-1.5 w-4 h-4" />
                </button>
              </div>

              <div className="text-center pt-1">
                <p className="text-[11px] text-slate-500">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setClientError(null);
                      clearError();
                    }}
                    className="text-sky-700 font-semibold hover:underline"
                  >
                    Sign in to portal
                  </button>
                </p>
              </div>

            </form>
          )}

          {/* Collapsible Quick Demo Accounts Section for Evaluators */}
          <div className="mt-5 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={() => setShowDemoDrawer(!showDemoDrawer)}
              className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-600 hover:text-slate-900 py-1"
            >
              <div className="flex items-center space-x-1.5">
                <Info className="w-3.5 h-3.5 text-sky-600" />
                <span>Quick Demo Accounts (Evaluation / Hackathon Testing)</span>
              </div>
              {showDemoDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDemoDrawer && (
              <div className="mt-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5 animate-in fade-in duration-150">
                <p className="text-[10px] text-slate-500 mb-2">
                  1-Click instant sign-in with synthetic clinical personas to test role-based access control:
                </p>

                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDemoSelect('receptionist')}
                    className="w-full text-left px-2.5 py-1.5 bg-white border border-slate-200 rounded hover:border-amber-400 hover:bg-amber-50 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[11px] font-semibold text-slate-800">1. Receptionist / Front Desk</div>
                      <div className="text-[10px] text-slate-500">Intake, registration & appointments (Strictly 0 clinical access)</div>
                    </div>
                    <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">Recep</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoSelect('doctor')}
                    className="w-full text-left px-2.5 py-1.5 bg-white border border-slate-200 rounded hover:border-sky-400 hover:bg-sky-50 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[11px] font-semibold text-slate-800">2. Doctor (Assigned Cardiologist)</div>
                      <div className="text-[10px] text-slate-500">Dr. Arvind Mehta - Attending Cardiologist (Full EHR aggregator & PACS)</div>
                    </div>
                    <span className="text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-mono">MD Assigned</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoSelect('doctor', 'doctor_unassigned')}
                    className="w-full text-left px-2.5 py-1.5 bg-white border border-slate-200 rounded hover:border-rose-400 hover:bg-rose-50 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[11px] font-semibold text-slate-800">3. Doctor (Unassigned Scope Denial & Break-Glass)</div>
                      <div className="text-[10px] text-slate-500">Dr. Sarah Jenkins - Unassigned MD (403 denial + emergency override)</div>
                    </div>
                    <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-mono">MD Unassigned</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoSelect('patient')}
                    className="w-full text-left px-2.5 py-1.5 bg-white border border-slate-200 rounded hover:border-emerald-400 hover:bg-emerald-50 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[11px] font-semibold text-slate-800">4. Patient (Self-Service Portal)</div>
                      <div className="text-[10px] text-slate-500">Ananya Sharma - Personal health records, lab slips, consent directives</div>
                    </div>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">Patient</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoSelect('admin')}
                    className="w-full text-left px-2.5 py-1.5 bg-white border border-slate-200 rounded hover:border-purple-400 hover:bg-purple-50 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[11px] font-semibold text-slate-800">5. System Administrator</div>
                      <div className="text-[10px] text-slate-500">Cross-hospital integration health, MPI match review, audit logs</div>
                    </div>
                    <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-mono">Admin</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer Note */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-2.5 text-center text-[10px] text-slate-500 flex items-center justify-center space-x-1.5">
          <Shield className="w-3 h-3 text-slate-400" />
          <span>Zero-Trust Architecture • Indelible HIPAA-Ready Audit Logging</span>
        </div>

      </div>
    </div>
  );
};
