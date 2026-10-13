import React, { useState } from 'react';
import { Activity, Lock, Phone, Clock, Menu, X, ChevronRight, UserPlus, ShieldCheck, Building2 } from 'lucide-react';

interface PublicNavbarProps {
  onOpenAuth: (initialMode?: 'login' | 'register') => void;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({ onOpenAuth }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm font-sans">
      
      {/* 1. Top Information Strip (Traditional Hospital Header Style) */}
      <div className="bg-slate-900 text-slate-300 text-xs border-b border-slate-800 hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex justify-between items-center text-[11px]">
          <div className="flex items-center space-x-5">
            <span className="flex items-center text-slate-300">
              <Clock className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
              <span>Simulated Multi-Hospital Network • 24/7 Interoperability Gateway</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center text-slate-300">
              <Building2 className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
              <span>Metro General Hospital (FHIR) &amp; St. Jude Community Health (EHR)</span>
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-700">
              College Hackathon Demonstration
            </span>
            <span className="text-slate-400 text-[10px]">
              Synthetic Data Protocol
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Hospital Brand & Medical Emblem */}
          <div 
            onClick={() => scrollToSection('hero')} 
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="bg-sky-700 text-white p-2 rounded shadow-sm group-hover:bg-sky-800 transition">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">
                  UNIFIED PATIENT VIEW
                </span>
                <span className="hidden md:inline-block bg-sky-50 text-sky-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-sky-200">
                  HL7 FHIR Interoperable
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal leading-tight">
                Creating a Unified View of a Patient Across Systems
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-7 text-xs font-semibold text-slate-700">
            <button 
              onClick={() => scrollToSection('hero')} 
              className="hover:text-sky-700 transition py-1 text-slate-900"
            >
              Home
            </button>
            <button 
              onClick={() => scrollToSection('services')} 
              className="hover:text-sky-700 transition py-1"
            >
              Services
            </button>
            <button 
              onClick={() => scrollToSection('how-it-works')} 
              className="hover:text-sky-700 transition py-1"
            >
              How It Works
            </button>
            <button 
              onClick={() => scrollToSection('about')} 
              className="hover:text-sky-700 transition py-1"
            >
              About
            </button>
            <button 
              onClick={() => scrollToSection('contact')} 
              className="hover:text-sky-700 transition py-1"
            >
              Contact
            </button>
          </nav>

          {/* Action Buttons: Sign In & Register */}
          <div className="hidden sm:flex items-center space-x-2.5">
            <button
              onClick={() => onOpenAuth('register')}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-sky-800 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded transition flex items-center"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1 text-slate-500" />
              <span>Register</span>
            </button>
            <button
              onClick={() => onOpenAuth('login')}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded shadow-sm transition flex items-center"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              <span>Portal Sign In</span>
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex sm:hidden items-center space-x-2">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-2.5 py-1 text-xs font-semibold text-white bg-sky-700 rounded"
            >
              Sign In
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-2 text-xs font-semibold text-slate-800 shadow-md">
          <button 
            onClick={() => scrollToSection('hero')} 
            className="block w-full text-left py-2 border-b border-slate-100"
          >
            Home
          </button>
          <button 
            onClick={() => scrollToSection('services')} 
            className="block w-full text-left py-2 border-b border-slate-100"
          >
            Services
          </button>
          <button 
            onClick={() => scrollToSection('how-it-works')} 
            className="block w-full text-left py-2 border-b border-slate-100"
          >
            How It Works
          </button>
          <button 
            onClick={() => scrollToSection('about')} 
            className="block w-full text-left py-2 border-b border-slate-100"
          >
            About &amp; Security
          </button>
          <button 
            onClick={() => scrollToSection('contact')} 
            className="block w-full text-left py-2 border-b border-slate-100"
          >
            Contact
          </button>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth('register');
              }}
              className="w-full py-2 text-center text-xs font-semibold bg-slate-100 text-slate-800 rounded border border-slate-300"
            >
              Register New Account
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth('login');
              }}
              className="w-full py-2 text-center text-xs font-semibold bg-sky-700 text-white rounded shadow-sm"
            >
              Sign In to Patient / Staff Portal
            </button>
          </div>
        </div>
      )}

    </header>
  );
};
