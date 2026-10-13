import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity, Shield, Lock, User, ArrowRight, AlertCircle, Info, UserPlus, LogIn } from 'lucide-react';

type Tab = 'login' | 'register';

const ROLES = [
  { value: 'patient', label: 'Patient', desc: 'Personal health records & consent management' },
  { value: 'doctor', label: 'Doctor / Physician', desc: 'Clinical access, prescriptions & lab orders' },
  { value: 'receptionist', label: 'Receptionist', desc: 'Patient intake, OPD registration & appointments' },
];

export const LoginPage: React.FC = () => {
  const { login, register, demoLogin, loading, error, clearError } = useAuth();

  const [tab, setTab] = useState<Tab>('login');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState('patient');
  const [regDob, setRegDob] = useState('');
  const [regGender, setRegGender] = useState('OTHER');
  const [regSpecialty, setRegSpecialty] = useState('');
  const [regLicense, setRegLicense] = useState('');
  const [regFacility, setRegFacility] = useState('');
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
    } catch {
      // Error handled in AuthContext
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }
    if (regPassword.length < 8) {
      setRegError('Password must be at least 8 characters.');
      return;
    }

    try {
      const res = await register({
        full_name: regFullName.trim(),
        email: regEmail.trim().toLowerCase(),
        username: regUsername.trim() || undefined,
        password: regPassword,
        role: regRole,
        dob: regDob || undefined,
        gender: regGender,
        specialty: regRole === 'doctor' ? regSpecialty : undefined,
        license_number: regRole === 'doctor' ? regLicense : undefined,
        facility: regRole === 'doctor' ? regFacility : undefined,
      });
      setRegSuccess(
        `Account created! Username: ${res.username}. You can now sign in.`
      );
      // Reset form
      setRegFullName(''); setRegEmail(''); setRegUsername('');
      setRegPassword(''); setRegConfirmPassword('');
      setRegRole('patient'); setRegDob(''); setRegGender('OTHER');
      setRegSpecialty(''); setRegLicense(''); setRegFacility('');
    } catch (err: any) {
      setRegError(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center bg-slate-900 text-white p-2.5 rounded-lg shadow-sm mb-3">
          <Activity className="w-7 h-7 text-sky-400" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          CREATING A UNIFIED VIEW OF A PATIENT ACROSS SYSTEMS
        </h2>
        <p className="mt-1 text-xs text-slate-600 max-w-sm mx-auto">
          Multi-Hospital Electronic Health Record Aggregator & Zero-Trust Access Gateway
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        {/* Tab switcher */}
        <div className="flex border border-slate-200 rounded-t-lg overflow-hidden bg-white">
          <button
            onClick={() => { setTab('login'); clearError(); setRegError(null); setRegSuccess(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition ${
              tab === 'login'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Sign In
          </button>
          <button
            onClick={() => { setTab('register'); clearError(); setRegError(null); setRegSuccess(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition ${
              tab === 'register'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Register
          </button>
        </div>

        <div className="bg-white py-6 px-6 sm:px-8 border border-t-0 border-slate-200 rounded-b-lg shadow-sm">

          {/* ── LOGIN TAB ── */}
          {tab === 'login' && (
            <>
              {error && (
                <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span>{error}</span>
                    <button onClick={clearError} className="block text-[11px] underline mt-1 text-rose-700">Dismiss</button>
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username / Staff Identifier
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. receptionist, doctor_mehta, admin"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded shadow-sm text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Sign in to Healthcare Portal'}
                  <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                </button>
              </form>

              {/* Quick Demo Switcher */}
              <div className="mt-6 border-t border-slate-200 pt-5">
                <div className="flex items-center space-x-1 mb-2">
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700">Quick Demo Role Launcher</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  Click any synthetic persona below to test role-specific security and interface permissions:
                </p>

                <div className="grid grid-cols-1 gap-2">
                  <button type="button" onClick={() => demoLogin('receptionist')}
                    className="text-left px-3 py-2 border border-slate-200 rounded hover:border-amber-400 hover:bg-amber-50 transition bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-800">1. Receptionist / Front Desk</div>
                      <div className="text-[11px] text-slate-500">Intake, registration & appointments (Zero clinical access)</div>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">Recep</span>
                  </button>

                  <button type="button" onClick={() => demoLogin('doctor')}
                    className="text-left px-3 py-2 border border-slate-200 rounded hover:border-sky-400 hover:bg-sky-50 transition bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-800">2. Doctor (Assigned Scope)</div>
                      <div className="text-[11px] text-slate-500">Dr. Arvind Mehta - Attending Cardiologist (Full unified chart)</div>
                    </div>
                    <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded border border-sky-200">MD</span>
                  </button>

                  <button type="button" onClick={() => demoLogin('doctor', 'doctor_unassigned')}
                    className="text-left px-3 py-2 border border-slate-200 rounded hover:border-red-400 hover:bg-red-50 transition bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-800">3. Doctor (Unassigned Scope)</div>
                      <div className="text-[11px] text-slate-500">Dr. Sarah Jenkins - Unassigned physician (Tests 403 scope denial)</div>
                    </div>
                    <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded border border-red-200">Scope Denied</span>
                  </button>

                  <button type="button" onClick={() => demoLogin('patient')}
                    className="text-left px-3 py-2 border border-slate-200 rounded hover:border-emerald-400 hover:bg-emerald-50 transition bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-800">4. Patient (Self-Service Portal)</div>
                      <div className="text-[11px] text-slate-500">Ananya Sharma - Personal health records & sharing consent toggles</div>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">Patient</span>
                  </button>

                  <button type="button" onClick={() => demoLogin('admin')}
                    className="text-left px-3 py-2 border border-slate-200 rounded hover:border-purple-400 hover:bg-purple-50 transition bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-800">5. System Administrator</div>
                      <div className="text-[11px] text-slate-500">Identity matching review, RBAC users, & security audit trail</div>
                    </div>
                    <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded border border-purple-200">Admin</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── REGISTER TAB ── */}
          {tab === 'register' && (
            <>
              {regSuccess && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded flex items-start space-x-2">
                  <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Registration successful!</p>
                    <p className="mt-0.5">{regSuccess}</p>
                    <button onClick={() => { setRegSuccess(null); setTab('login'); }}
                      className="mt-1.5 text-[11px] underline text-emerald-700">Go to Sign In →</button>
                  </div>
                </div>
              )}

              {regError && (
                <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span>{regError}</span>
                    <button onClick={() => setRegError(null)} className="block text-[11px] underline mt-1 text-rose-700">Dismiss</button>
                  </div>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-3">
                {/* Role selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Type *</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {ROLES.map((r) => (
                      <label key={r.value}
                        className={`flex items-start gap-2.5 px-3 py-2 border rounded cursor-pointer transition ${
                          regRole === r.value
                            ? 'border-sky-500 bg-sky-50'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                        }`}>
                        <input type="radio" name="role" value={r.value}
                          checked={regRole === r.value}
                          onChange={() => setRegRole(r.value)}
                          className="mt-0.5 accent-sky-600" />
                        <div>
                          <div className="text-xs font-semibold text-slate-800">{r.label}</div>
                          <div className="text-[11px] text-slate-500">{r.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Full name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input type="text" required value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Priya Verma"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500" />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input type="email" required value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="priya.verma@example.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500" />
                </div>

                {/* Username (optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username <span className="font-normal text-slate-400">(optional — auto-derived from email)</span>
                  </label>
                  <input type="text" value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="priya_verma"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500" />
                </div>

                {/* Password */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                    <input type="password" required value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm Password *</label>
                    <input type="password" required value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500" />
                  </div>
                </div>

                {/* Patient-specific fields */}
                {regRole === 'patient' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                      <input type="date" value={regDob}
                        onChange={(e) => setRegDob(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                      <select value={regGender} onChange={(e) => setRegGender(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 bg-white">
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other / Prefer not to say</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Doctor-specific fields */}
                {regRole === 'doctor' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Specialty</label>
                      <input type="text" value={regSpecialty}
                        onChange={(e) => setRegSpecialty(e.target.value)}
                        placeholder="e.g. Cardiologist, General Physician"
                        className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Medical License No.</label>
                        <input type="text" value={regLicense}
                          onChange={(e) => setRegLicense(e.target.value)}
                          placeholder="e.g. MED-2026-001"
                          className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital / Facility</label>
                        <input type="text" value={regFacility}
                          onChange={(e) => setRegFacility(e.target.value)}
                          placeholder="e.g. Metro General Hospital"
                          className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500" />
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                      ⚠ Doctor accounts require administrator verification before clinical access is granted.
                    </p>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded shadow-sm text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition disabled:opacity-50">
                  {loading ? 'Creating Account...' : 'Create Account'}
                  <UserPlus className="ml-1.5 w-3.5 h-3.5" />
                </button>
              </form>
            </>
          )}
        </div>

        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center">
            <Shield className="w-3 h-3 text-slate-400 mr-1" />
            Backend enforced authorization & indelible audit logging enabled.
          </p>
        </div>
      </div>
    </div>
  );
};
