import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/client';
import { 
  UserProfile, 
  MatchCandidate, 
  AuditLogItem, 
  AdminStats 
} from '../types';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { 
  Users, 
  UserPlus, 
  GitMerge, 
  ShieldCheck, 
  ShieldAlert, 
  Database, 
  Search, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Building2,
  Lock,
  RefreshCw
} from 'lucide-react';

export const AdminWorkspace: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [matchCandidates, setMatchCandidates] = useState<MatchCandidate[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [integrationJobs, setIntegrationJobs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'matching' | 'users' | 'audit' | 'integration'>('matching');
  const [loading, setLoading] = useState(true);

  // Filters for Audit Logs
  const [actionFilter, setActionFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');

  // Modals
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isMatchReviewOpen, setIsMatchReviewOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<MatchCandidate | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // New user form
  const [newUserData, setNewUserData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'receptionist',
    department: 'General Staff',
    license_number: '',
    specialty: '',
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, candidatesData, logsData, jobsData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers(),
        adminApi.getMatchCandidates(),
        adminApi.getAuditLogs(actionFilter, roleFilter, outcomeFilter),
        adminApi.getIntegrationJobs(),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setMatchCandidates(candidatesData);
      setAuditLogs(logsData);
      setIntegrationJobs(jobsData);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load admin console' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFilterAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const logs = await adminApi.getAuditLogs(actionFilter, roleFilter, outcomeFilter);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createUser(newUserData);
      setMessage({ type: 'success', text: `User account '${newUserData.username}' created successfully.` });
      setIsAddUserOpen(false);
      setNewUserData({
        username: '',
        email: '',
        full_name: '',
        password: '',
        role: 'receptionist',
        department: 'General Staff',
        license_number: '',
        specialty: '',
      });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create user' });
    }
  };

  const handleToggleUserStatus = async (userId: number, currentActive: boolean) => {
    try {
      await adminApi.updateUserStatus(userId, !currentActive);
      setMessage({ type: 'success', text: 'User status successfully modified.' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update user' });
    }
  };

  const handleMatchAction = async (action: 'APPROVE_LINK' | 'REJECT_LINK') => {
    if (!selectedCandidate) return;
    try {
      await adminApi.takeMatchAction(selectedCandidate.id, action, reviewNotes);
      setMessage({
        type: 'success',
        text: action === 'APPROVE_LINK' ? 'Patient records safely linked.' : 'Match rejected; records kept as distinct entities.',
      });
      setIsMatchReviewOpen(false);
      setReviewNotes('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Administrator Header & Scope Banner */}
      <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded-r shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-purple-700 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                System Administrator Console — Identity Resolution & Security Oversight
              </h4>
              <p className="text-xs text-purple-900 mt-0.5">
                Responsible for identity matching decisions, user accounts, and audit log analysis. <strong>Clinical health records are segregated by backend security policies; administrators cannot browse patient medical charts without explicit clinician credentials.</strong>
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="text-xs px-2.5 py-1 bg-white border border-purple-200 text-purple-800 rounded hover:bg-purple-100 flex items-center transition"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded border text-xs flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="underline text-[11px] ml-4">Dismiss</button>
        </div>
      )}

      {/* Database Statistics Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3 border border-slate-200 rounded shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">System Users</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{stats.users_count}</div>
          </div>
          <div className="bg-white p-3 border border-slate-200 rounded shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Master Patients</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{stats.patients_count}</div>
          </div>
          <div className="bg-white p-3 border border-slate-200 rounded shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Appointments</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{stats.appointments_count}</div>
          </div>
          <div className="bg-white p-3 border border-amber-200 bg-amber-50/30 rounded shadow-sm">
            <div className="text-[11px] font-semibold text-amber-800 uppercase">Pending Matches</div>
            <div className="text-xl font-bold text-amber-700 mt-1">{stats.pending_matches_count}</div>
          </div>
          <div className="bg-white p-3 border border-slate-200 rounded shadow-sm">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Open Conflicts</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{stats.open_conflicts_count}</div>
          </div>
          <div className="bg-white p-3 border border-rose-200 bg-rose-50/30 rounded shadow-sm">
            <div className="text-[11px] font-semibold text-rose-800 uppercase">Denied Attempts</div>
            <div className="text-xl font-bold text-rose-700 mt-1">{stats.unauthorized_attempts_count}</div>
          </div>
        </div>
      )}

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200 pb-1 gap-2 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('matching')}
          className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'matching'
              ? 'border-purple-600 text-purple-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Identity Matching Review Queue ({matchCandidates.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-purple-600 text-purple-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Staff & User RBAC Management ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-purple-600 text-purple-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Security Audit Forensics ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('integration')}
          className={`px-3 py-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'integration'
              ? 'border-purple-600 text-purple-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Integration Jobs & Hospital Sync ({integrationJobs.length})
        </button>
      </div>

      {/* Tab 1: Identity Matching Queue */}
      {activeTab === 'matching' && (
        <div className="space-y-4">
          <div className="bg-white p-4 border border-slate-200 rounded text-xs space-y-1">
            <div className="font-bold text-slate-900 flex items-center">
              <GitMerge className="w-4 h-4 mr-1.5 text-purple-600" />
              Patient Identity Resolution Queue (Anti-False-Merge Control)
            </div>
            <p className="text-slate-600">
              When an incoming record possesses ambiguous congruence (e.g. similar names or matching DOB but different phones), our matching engine flags it as <strong>UNCERTAIN (PENDING_REVIEW)</strong>. Automated merging on name alone is prohibited to safeguard patient safety.
            </p>
          </div>

          <div className="clinical-card overflow-hidden">
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Incoming Source Record</th>
                    <th>Candidate Master Record</th>
                    <th>Congruence Score</th>
                    <th>Explainable Criteria Breakdown</th>
                    <th>Status</th>
                    <th className="text-right">HIM Action</th>
                  </tr>
                </thead>
                <tbody>
                  {matchCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                        No uncertain identity match candidates currently awaiting review.
                      </td>
                    </tr>
                  ) : (
                    matchCandidates.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div className="font-bold text-slate-900">
                            {c.source_demographics.first_name} {c.source_demographics.last_name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            DOB: {c.source_demographics.dob} • Phone: {c.source_demographics.phone || 'N/A'}
                          </div>
                          <div className="text-[10px] text-teal-800 font-medium">
                            Origin: {c.source_organization_name} ({c.source_patient_id})
                          </div>
                        </td>
                        <td>
                          <div className="font-bold text-slate-900">{c.candidate_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {c.candidate_national_health_id}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            DOB: {c.candidate_dob} • Phone: {c.candidate_phone || 'N/A'}
                          </div>
                        </td>
                        <td>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold font-mono ${
                            c.match_score >= 0.8
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-800 border border-slate-300'
                          }`}>
                            {(c.match_score * 100).toFixed(1)}% Match
                          </span>
                        </td>
                        <td className="text-[11px] text-slate-600 max-w-xs font-mono">
                          {JSON.stringify(c.match_criteria)}
                        </td>
                        <td><StatusBadge status={c.status} /></td>
                        <td className="text-right">
                          <button
                            onClick={() => {
                              setSelectedCandidate(c);
                              setIsMatchReviewOpen(true);
                            }}
                            className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-semibold rounded shadow-sm transition"
                          >
                            Review & Decide
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: User RBAC Management */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-700">System Staff Accounts & Active Roles</span>
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="inline-flex items-center px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded shadow-sm transition"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              Add System User
            </button>
          </div>

          <div className="clinical-card overflow-hidden">
            <table>
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Assigned Role</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-mono text-xs text-slate-500">#{u.id}</td>
                    <td className="font-semibold text-slate-900">{u.username}</td>
                    <td className="text-slate-800">{u.full_name}</td>
                    <td className="text-slate-600 text-xs">{u.email}</td>
                    <td>
                      <span className="text-xs font-medium bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td><StatusBadge status={u.is_active ? 'ACTIVE' : 'DEACTIVATED'} /></td>
                    <td className="text-right">
                      <button
                        onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                        className={`text-[11px] px-2 py-0.5 rounded border transition ${
                          u.is_active
                            ? 'text-rose-700 border-rose-200 hover:bg-rose-50'
                            : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Security Audit Forensics */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          
          {/* Audit Filters */}
          <form onSubmit={handleFilterAudit} className="bg-slate-50 p-3 rounded border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="font-medium text-slate-600">Action:</span>
              <input
                type="text"
                placeholder="e.g. CLINICAL, LOGIN"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 bg-white text-xs"
              />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="font-medium text-slate-600">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 bg-white text-xs"
              >
                <option value="">All Roles</option>
                <option value="receptionist">Receptionist</option>
                <option value="doctor">Doctor</option>
                <option value="patient">Patient</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="font-medium text-slate-600">Outcome:</span>
              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1 bg-white text-xs"
              >
                <option value="">All Outcomes</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="DENIED">DENIED</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-3 py-1 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 text-xs"
            >
              Filter Logs
            </button>
          </form>

          {/* Audit Log Table */}
          <div className="clinical-card overflow-hidden">
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Actor User</th>
                    <th>Role</th>
                    <th>Resource Target</th>
                    <th>Outcome</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className={log.outcome === 'DENIED' ? 'bg-rose-50/40' : ''}>
                      <td className="font-mono text-[11px] text-slate-600">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="font-semibold text-slate-900 text-xs">{log.action}</td>
                      <td className="text-slate-800 text-xs">{log.actor_username}</td>
                      <td>
                        <span className="text-[11px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          {log.actor_role}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-slate-600">{log.resource_type}: {log.resource_id || 'N/A'}</td>
                      <td>
                        <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded border uppercase ${
                          log.outcome === 'DENIED'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {log.outcome}
                        </span>
                      </td>
                      <td className="font-mono text-[11px] text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Integration Jobs */}
      {activeTab === 'integration' && (
        <div className="clinical-card p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Multi-Hospital Ingestion Batch History
          </h3>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Originating Organization</th>
                  <th>Ingestion Standard</th>
                  <th>Records Processed</th>
                  <th>Matched Entities</th>
                  <th>Status</th>
                  <th>Execution Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {integrationJobs.map((j) => (
                  <tr key={j.id}>
                    <td className="font-mono text-xs">JOB-#{j.id}</td>
                    <td className="font-semibold text-slate-900">{j.organization_name}</td>
                    <td className="font-mono text-xs text-slate-600">{j.job_type}</td>
                    <td className="text-slate-800 font-medium">{j.records_processed}</td>
                    <td className="text-slate-800 font-medium">{j.records_matched}</td>
                    <td><StatusBadge status={j.status} /></td>
                    <td className="font-mono text-xs text-slate-500">
                      {new Date(j.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Add User */}
      <Modal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Admin: Create New User Account with Approved Role"
      >
        <form onSubmit={handleCreateUser} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username *</label>
              <input
                type="text"
                required
                value={newUserData.username}
                onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role *</label>
              <select
                value={newUserData.role}
                onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
              >
                <option value="receptionist">Receptionist / Front Desk</option>
                <option value="doctor">Doctor / Clinician</option>
                <option value="patient">Patient</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={newUserData.full_name}
                onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
            <input
              type="password"
              required
              value={newUserData.password}
              onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
            />
          </div>

          {newUserData.role === 'doctor' && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Cardiology"
                  value={newUserData.department}
                  onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Medical License #</label>
                <input
                  type="text"
                  placeholder="e.g. LIC-99201"
                  value={newUserData.license_number}
                  onChange={(e) => setNewUserData({ ...newUserData, license_number: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddUserOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-sm transition"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Review Match Candidate */}
      <Modal
        isOpen={isMatchReviewOpen}
        onClose={() => setIsMatchReviewOpen(false)}
        title="HIM Identity Resolution: Authorize or Reject Patient Link"
      >
        {selectedCandidate && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded border border-slate-200">
              <div>
                <span className="font-bold text-teal-800 block">Incoming Source Record:</span>
                <span className="font-semibold block">{selectedCandidate.source_demographics.first_name} {selectedCandidate.source_demographics.last_name}</span>
                <span className="block text-slate-600">DOB: {selectedCandidate.source_demographics.dob}</span>
                <span className="block text-slate-600">Phone: {selectedCandidate.source_demographics.phone || 'N/A'}</span>
                <span className="block text-[10px] text-slate-400 mt-1">Facility: {selectedCandidate.source_organization_name}</span>
              </div>
              <div>
                <span className="font-bold text-blue-800 block">Candidate Master Patient:</span>
                <span className="font-semibold block">{selectedCandidate.candidate_name}</span>
                <span className="font-mono text-[11px] block text-sky-800">{selectedCandidate.candidate_national_health_id}</span>
                <span className="block text-slate-600">DOB: {selectedCandidate.candidate_dob}</span>
                <span className="block text-slate-600">Phone: {selectedCandidate.candidate_phone || 'N/A'}</span>
              </div>
            </div>

            <div className="bg-amber-50 p-3 rounded border border-amber-200 text-xs">
              <span className="font-bold text-amber-900 block mb-1">
                Congruence Score: {(selectedCandidate.match_score * 100).toFixed(1)}% (Uncertain Threshold)
              </span>
              <p className="text-amber-800">
                Rule Check: Never merge solely on similar names. Review the detailed demographic criteria above. If these represent the same individual, provide an audited explanation to approve linking. If distinct individuals, reject the link to preserve separation.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Audited Review Justification *
              </label>
              <textarea
                rows={2}
                required
                placeholder="e.g. Verified by phone and address with patient; or Identified as distinct individual with similar name."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsMatchReviewOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <div className="space-x-2">
                <button
                  onClick={() => handleMatchAction('REJECT_LINK')}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-rose-100 text-slate-800 hover:text-rose-800 rounded text-xs font-semibold transition"
                >
                  Reject Link (Keep Distinct)
                </button>
                <button
                  onClick={() => handleMatchAction('APPROVE_LINK')}
                  className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded text-xs font-semibold shadow-sm transition"
                >
                  Authorize Identity Merge
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
