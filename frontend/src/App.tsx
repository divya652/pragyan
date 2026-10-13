import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { PublicNavbar } from './components/PublicNavbar';
import { AuthModal } from './components/AuthModal';
import { HomePage } from './pages/HomePage';
import { ReceptionistWorkspace } from './pages/ReceptionistWorkspace';
import { DoctorWorkspace } from './pages/DoctorWorkspace';
import { LabWorkspace } from './pages/LabWorkspace';
import { PharmacyWorkspace } from './pages/PharmacyWorkspace';
import { CashierWorkspace } from './pages/CashierWorkspace';
import { PatientPortal } from './pages/PatientPortal';
import { AdminWorkspace } from './pages/AdminWorkspace';

const MainLayout: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleCloseAuth = () => {
    setAuthModalOpen(false);
  };

  // If unauthenticated, show traditional public hospital website with PublicNavbar & AuthModal
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-white flex flex-col font-sans">
        <PublicNavbar onOpenAuth={handleOpenAuth} />
        <main className="flex-1">
          <HomePage onOpenAuth={handleOpenAuth} />
        </main>
        <AuthModal
          isOpen={authModalOpen}
          initialMode={authMode}
          onClose={handleCloseAuth}
        />
      </div>
    );
  }

  // Strictly role-governed workspace rendering
  const renderRoleWorkspace = () => {
    switch (user.role) {
      case 'receptionist':
        return <ReceptionistWorkspace />;
      case 'doctor':
        return <DoctorWorkspace />;
      case 'lab_technician':
        return <LabWorkspace />;
      case 'pharmacist':
        return <PharmacyWorkspace />;
      case 'cashier':
        return <CashierWorkspace />;
      case 'patient':
        return <PatientPortal />;
      case 'admin':
        return <AdminWorkspace />;
      default:
        return (
          <div className="max-w-7xl mx-auto p-8 text-center text-xs text-slate-500">
            Unrecognized role. Contact system administrator.
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 pb-12">
        {renderRoleWorkspace()}
      </main>
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-[11px] text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Creating a Unified View of a Patient Across Systems • Multi-Hospital EHR Aggregator</span>
          <span className="font-mono text-[10px] text-slate-400">
            Simulated Hospital A (HL7 FHIR R4) &amp; Hospital B (Legacy EHR)
          </span>
        </div>
      </footer>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;

