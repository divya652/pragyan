import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  LogOut,
  Activity,
  Bell,
  CheckCircle,
  Building2,
  Users,
  FlaskConical,
  Pill,
  CreditCard,
  UserCheck
} from 'lucide-react';
import { UserRole, AppNotification } from '../types';
import { notificationsApi } from '../api/client';

export const Navbar: React.FC = () => {
  const { user, logout, demoLogin } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  useEffect(() => {
    if (user) {
      notificationsApi.getAll()
        .then(data => setNotifications(data))
        .catch(() => {});
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'receptionist':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs px-2 py-0.5 rounded font-medium">Front Desk Reception</span>;
      case 'doctor':
        return <span className="bg-sky-100 text-sky-800 border border-sky-300 text-xs px-2 py-0.5 rounded font-medium">Attending Clinician (MD)</span>;
      case 'lab_technician':
        return <span className="bg-cyan-100 text-cyan-800 border border-cyan-300 text-xs px-2 py-0.5 rounded font-medium">Laboratory Staff</span>;
      case 'pharmacist':
        return <span className="bg-purple-100 text-purple-800 border border-purple-300 text-xs px-2 py-0.5 rounded font-medium">Licensed Pharmacist</span>;
      case 'cashier':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-2 py-0.5 rounded font-medium">Hospital Billing &amp; Cashier</span>;
      case 'patient':
        return <span className="bg-teal-100 text-teal-800 border border-teal-300 text-xs px-2 py-0.5 rounded font-medium">Verified Patient</span>;
      case 'admin':
        return <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 text-xs px-2 py-0.5 rounded font-medium">Hospital Administrator</span>;
      default:
        return null;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          
          {/* Brand & Interop Indicator */}
          <div className="flex items-center space-x-3">
            <div className="bg-teal-700 text-white p-1.5 rounded-lg shadow-sm">
              <Activity className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 tracking-tight text-sm">CREATING A UNIFIED VIEW OF A PATIENT</span>
                <span className="text-[10px] bg-teal-50 text-teal-800 font-medium px-2 py-0.5 rounded-full border border-teal-200">
                  HL7 FHIR &amp; Legacy Aggregator
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal">Cross-System EHR • 7 Role Interoperable Healthcare Platform</p>
            </div>
          </div>

          {/* Quick Role Switcher (Direct access for paired evaluation) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded flex items-center space-x-1.5 text-slate-700 font-medium transition"
              title="Switch demo persona"
            >
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span>Switch Demo Role ▾</span>
            </button>

            {showRoleSwitcher && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50 text-xs">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  7 Hospital Roles (1-Click Switch)
                </div>
                <button
                  onClick={() => { demoLogin('patient', 'patient_ananya'); setShowRoleSwitcher(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-teal-50 flex items-center justify-between text-slate-700 hover:text-teal-900"
                >
                  <span className="font-medium">1. Patient (Ananya Sharma)</span>
                  <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">Portal</span>
                </button>
                <button
                  onClick={() => { demoLogin('doctor', 'doctor_mehta'); setShowRoleSwitcher(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-50 flex items-center justify-between text-slate-700 hover:text-sky-900"
                >
                  <span className="font-medium">2. Doctor (Dr. Mehta - Verified)</span>
                  <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded">Cardio</span>
                </button>
                <button
                  onClick={() => { demoLogin('doctor', 'doctor_gupta'); setShowRoleSwitcher(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-amber-50 flex items-center justify-between text-slate-700 hover:text-amber-900"
                >
                  <span className="font-medium">2b. Doctor (Dr. Gupta - Pending NMR)</span>
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Gen Med</span>
                </button>
                <button
                  onClick={() => { demoLogin('receptionist'); setShowRoleSwitcher(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-amber-50 flex items-center justify-between text-slate-700 hover:text-amber-900"
                >
                  <span className="font-medium">3. Receptionist (Rajesh Kumar)</span>
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">OPD Desk</span>
                </button>
                <button
                  onClick={() => { demoLogin('lab_technician'); setShowRoleSwitcher(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-cyan-50 flex items-center justify-between text-slate-700 hover:text-cyan-900"
                >
                  <span className="font-medium">4. Lab Tech (Vikram Deshmukh)</span>
                  <span className="text-[10px] bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded">Pathology</span>
                </button>
                <button
                  onClick={() => { demoLogin('pharmacist'); setShowRoleSwitcher(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-purple-50 flex items-center justify-between text-slate-700 hover:text-purple-900"
                >
                  <span className="font-medium">5. Pharmacist (Sunita Rao)</span>
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Dispensing</span>
                </button>
                <button
                  onClick={() => { demoLogin('cashier'); setShowRoleSwitcher(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 flex items-center justify-between text-slate-700 hover:text-emerald-900"
                >
                  <span className="font-medium">6. Cashier (Amit Verma)</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Billing</span>
                </button>
                <button
                  onClick={() => { demoLogin('admin'); setShowRoleSwitcher(false); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 flex items-center justify-between text-slate-700 hover:text-indigo-900"
                >
                  <span className="font-medium">7. Administrator (Eleanor Vance)</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">Hospital Ops</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Section: Notifications & User profile */}
          {user && (
            <div className="flex items-center space-x-4">
              
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifMenu(!showNotifMenu)}
                  className="relative p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
                  title="In-app Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-rose-600 rounded-full animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifMenu && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50 text-xs">
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100">
                      <span className="font-semibold text-slate-800">Notifications ({unreadCount} unread)</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] text-teal-600 hover:underline"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-slate-400">No notifications yet</div>
                      ) : (
                        notifications.slice(0, 10).map(n => (
                          <div
                            key={n.id}
                            onClick={() => handleMarkAsRead(n.id)}
                            className={`p-2.5 cursor-pointer hover:bg-slate-50 transition ${
                              n.is_read ? 'opacity-70' : 'bg-teal-50/40 font-medium'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-teal-800 font-semibold">{n.title}</span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Details */}
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-800">{user.full_name}</div>
                <div className="flex items-center justify-end space-x-1.5 mt-0.5">
                  {getRoleBadge(user.role)}
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="flex items-center space-x-1 text-xs font-medium text-slate-600 hover:text-red-700 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 px-2.5 py-1.5 rounded transition"
                title="Sign out of current account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </header>
  );
};
