import {
  AuthResponse,
  UserProfile,
  PatientDemographics,
  UnifiedChart,
  EncounterItem,
  DoctorProfile,
  PatientSearchCandidate,
  OpdEncounter,
  LabOrder,
  PrescriptionOrder,
  Bill,
  AppNotification,
  UnifiedTimelineEvent
} from '../types';

const API_BASE_URL = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('upv_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('upv_token');
    localStorage.removeItem('upv_user');
    window.dispatchEvent(new Event('auth:unauthorized'));
    const err = await response.json().catch(() => ({ detail: 'Session expired' }));
    throw new Error(err.detail || 'Authentication required');
  }

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (typeof errorData.detail === 'string') {
        errorMessage = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        // Pydantic validation errors come as an array of objects
        errorMessage = errorData.detail
          .map((e: any) => {
            const field = e.loc ? e.loc.filter((l: any) => l !== 'body').join(' → ') : '';
            return field ? `${field}: ${e.msg}` : e.msg;
          })
          .join('; ');
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // response body wasn't JSON — keep the status-based message
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// 1. Auth API
export const authApi = {
  login: (username: string, password: string): Promise<AuthResponse> =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (data: any): Promise<{ message: string; user_id: number; username: string; role: string }> =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  logout: (): Promise<{ message: string }> =>
    request('/auth/logout', { method: 'POST' }),
  getCurrentUser: (): Promise<UserProfile> =>
    request('/auth/me'),
};

// 2. Receptionist & OPD Registration API
export const receptionApi = {
  searchPatients: (query?: string): Promise<PatientDemographics[]> =>
    request(`/reception/patients${query ? `?query=${encodeURIComponent(query)}` : ''}`),
  registerPatient: (data: Partial<PatientDemographics>): Promise<PatientDemographics> =>
    request('/reception/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getPatientDemographics: (patientId: number): Promise<PatientDemographics> =>
    request(`/reception/patients/${patientId}`),
};

export const opdApi = {
  register: (data: {
    master_patient_id: number;
    doctor_id?: number | null;
    department: string;
    visit_type?: string;
    vitals_bp?: string;
    vitals_pulse?: string;
    vitals_temp?: string;
    vitals_spo2?: string;
    chief_complaint?: string;
    consultation_fee?: number;
  }): Promise<OpdEncounter> =>
    request('/opd/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getQueue: (department?: string, statusFilter?: string): Promise<OpdEncounter[]> => {
    const params = new URLSearchParams();
    if (department) params.append('department', department);
    if (statusFilter) params.append('status_filter', statusFilter);
    const qs = params.toString();
    return request(`/opd/queue${qs ? `?${qs}` : ''}`);
  },
  updateStatus: (encounterId: number, status: string, clinicalNotes?: string): Promise<OpdEncounter> =>
    request(`/opd/encounters/${encounterId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, clinical_notes: clinicalNotes }),
    }),
  getSlip: (encounterId: number): Promise<any> =>
    request(`/opd/encounters/${encounterId}/slip`),
};

// 3. Clinical & Doctor API
export const clinicalApi = {
  getAssignedPatients: (): Promise<PatientDemographics[]> =>
    request('/clinical/assigned-patients'),
  getUnifiedChart: (patientId: number, isEmergency: boolean = false): Promise<UnifiedChart> =>
    request(`/clinical/patients/${patientId}/chart?is_emergency=${isEmergency}`),
  getUnifiedTimeline: (
    patientId: number,
    org: string = 'ALL',
    category: string = 'ALL',
    isEmergency: boolean = false
  ): Promise<any[]> =>
    request(`/clinical/patients/${patientId}/timeline?org=${org}&category=${category}&is_emergency=${isEmergency}`),
  getConflicts: (patientId: number): Promise<any[]> =>
    request(`/clinical/patients/${patientId}/conflicts`),
  resolveConflict: (conflictId: number, notes: string): Promise<{ message: string }> =>
    request(`/clinical/conflicts/${conflictId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution_notes: notes }),
    }),
  requestBreakGlassAccess: (patientId: number, reason: string, attestation: boolean = true): Promise<any> =>
    request('/clinical/break-glass-access', {
      method: 'POST',
      body: JSON.stringify({
        patient_id: patientId,
        emergency_reason: reason,
        clinical_attestation: attestation
      }),
    }),
  createEncounter: (patientId: number, data: any): Promise<any> =>
    request(`/clinical/patients/${patientId}/encounters`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const doctorApi = {
  getMyProfile: (): Promise<DoctorProfile> =>
    request('/doctor/profile'),
  getAllProfiles: (): Promise<DoctorProfile[]> =>
    request('/doctor/all-profiles'),
  searchPatients: (q: string): Promise<PatientSearchCandidate[]> =>
    request(`/doctor/search-patients?q=${encodeURIComponent(q)}`),
  completeConsultation: (data: {
    encounter_id: number;
    clinical_notes: string;
    primary_diagnosis?: string;
    icd10_code?: string;
    severity?: string;
    follow_up_days?: number;
    follow_up_reason?: string;
  }): Promise<any> =>
    request('/doctor/consultation/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// 4. Laboratory API
export const labApi = {
  getOrders: (statusFilter?: string, patientId?: number): Promise<LabOrder[]> => {
    const params = new URLSearchParams();
    if (statusFilter) params.append('status_filter', statusFilter);
    if (patientId) params.append('patient_id', patientId.toString());
    const qs = params.toString();
    return request(`/lab/orders${qs ? `?${qs}` : ''}`);
  },
  createOrder: (data: {
    master_patient_id: number;
    encounter_id?: number | null;
    test_name: string;
    priority?: string;
    laboratory_name?: string;
    sample_type?: string;
    clinical_notes?: string;
  }): Promise<LabOrder> =>
    request('/lab/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  collectSample: (orderId: number, data: { sample_type: string; sample_notes?: string }): Promise<LabOrder> =>
    request(`/lab/orders/${orderId}/collect-sample`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  enterResults: (orderId: number, results: any[], notes?: string): Promise<LabOrder> =>
    request(`/lab/orders/${orderId}/enter-results`, {
      method: 'POST',
      body: JSON.stringify({ results, clinical_notes: notes }),
    }),
  verifyAndPublish: (orderId: number): Promise<LabOrder> =>
    request(`/lab/orders/${orderId}/verify-and-publish`, {
      method: 'POST',
    }),
};

// 5. Pharmacy API
export const pharmacyApi = {
  getPrescriptions: (statusFilter?: string, patientId?: number): Promise<PrescriptionOrder[]> => {
    const params = new URLSearchParams();
    if (statusFilter) params.append('status_filter', statusFilter);
    if (patientId) params.append('patient_id', patientId.toString());
    const qs = params.toString();
    return request(`/pharmacy/prescriptions${qs ? `?${qs}` : ''}`);
  },
  createPrescription: (data: {
    master_patient_id: number;
    encounter_id?: number | null;
    medication_name: string;
    strength: string;
    dosage?: string;
    route?: string;
    frequency?: string;
    duration?: string;
    quantity_prescribed?: number;
    instructions?: string;
  }): Promise<PrescriptionOrder> =>
    request('/pharmacy/prescriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  dispense: (prescriptionId: number, data: {
    dispensed_quantity: number;
    batch_number: string;
    counseling_notes?: string;
  }): Promise<PrescriptionOrder> =>
    request(`/pharmacy/prescriptions/${prescriptionId}/dispense`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  requestClarification: (prescriptionId: number, notes: string): Promise<PrescriptionOrder> =>
    request(`/pharmacy/prescriptions/${prescriptionId}/clarification`, {
      method: 'POST',
      body: JSON.stringify({ clarification_notes: notes }),
    }),
};

// 6. Billing & Cashier API
export const billingApi = {
  getBills: (statusFilter?: string, patientId?: number): Promise<Bill[]> => {
    const params = new URLSearchParams();
    if (statusFilter) params.append('status_filter', statusFilter);
    if (patientId) params.append('patient_id', patientId.toString());
    const qs = params.toString();
    return request(`/billing/bills${qs ? `?${qs}` : ''}`);
  },
  createBill: (data: {
    master_patient_id: number;
    encounter_id?: number | null;
    bill_type?: string;
    items: { item_description: string; unit_price: number; quantity: number }[];
    discount_amount?: number;
    tax_amount?: number;
    notes?: string;
  }): Promise<Bill> =>
    request('/billing/bills', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  pay: (data: {
    bill_id: number;
    amount: number;
    payment_method: string;
    notes?: string;
  }): Promise<Bill> =>
    request('/billing/pay', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getReceipt: (receiptNumber: string): Promise<any> =>
    request(`/billing/receipt/${receiptNumber}`),
};

// 7. In-App Notifications API
export const notificationsApi = {
  getAll: (): Promise<AppNotification[]> =>
    request('/notifications'),
  markRead: (id: number): Promise<any> =>
    request(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: (): Promise<any> =>
    request('/notifications/read-all', { method: 'POST' }),
};

// 8. Patient Portal API
export const patientPortalApi = {
  getMyRecords: (): Promise<UnifiedChart> =>
    request('/patient-portal/my-records'),
  getMyEncounters: (): Promise<any[]> =>
    request('/patient-portal/my-encounters'),
  getMyPrescriptions: (): Promise<any[]> =>
    request('/patient-portal/my-prescriptions'),
  getMyLabOrders: (): Promise<any[]> =>
    request('/patient-portal/my-lab-orders'),
  getMyBills: (): Promise<any[]> =>
    request('/patient-portal/my-bills'),
  getMyTimeline: (): Promise<UnifiedTimelineEvent[]> =>
    request('/patient-portal/my-timeline'),
  getMyConsents: (): Promise<any[]> =>
    request('/patient-portal/my-consents'),
  updateConsent: (data: { consent_type: string; notes?: string; organization_id?: number }): Promise<any> =>
    request('/patient-portal/my-consents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMyAccessLog: (): Promise<any[]> =>
    request('/patient-portal/my-access-log'),
};

// 9. Appointments API
export const appointmentApi = {
  getAppointments: (dateFilter?: string, doctorId?: number): Promise<any[]> => {
    const params = new URLSearchParams();
    if (dateFilter) params.append('appt_date', dateFilter);
    if (doctorId) params.append('doctor_id', doctorId.toString());
    const qs = params.toString();
    return request(`/appointments${qs ? `?${qs}` : ''}`);
  },
  createAppointment: (data: any): Promise<any> =>
    request('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStatus: (appointmentId: number, status: string, notes?: string): Promise<any> =>
    request(`/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),
};

// 10. Admin & Integration API
export const adminApi = {
  getStats: (): Promise<any> =>
    request('/admin/stats'),
  getDoctors: (statusFilter?: string): Promise<DoctorProfile[]> => {
    const qs = statusFilter ? `?status_filter=${statusFilter}` : '';
    return request(`/admin/doctors${qs}`);
  },
  verifyDoctor: (doctorId: number, status: string, reviewNotes?: string): Promise<any> =>
    request(`/admin/doctors/${doctorId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ doctor_id: doctorId, status, review_notes: reviewNotes }),
    }),
  getUsers: (): Promise<UserProfile[]> =>
    request('/admin/users'),
  createUser: (data: any): Promise<UserProfile> =>
    request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateUserStatus: (userId: number, isActive: boolean): Promise<any> =>
    request(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    }),
  getAuditLogs: (action?: string, role?: string, outcome?: string): Promise<any[]> => {
    const params = new URLSearchParams();
    if (action) params.append('action', action);
    if (role) params.append('actor_role', role);
    if (outcome) params.append('outcome', outcome);
    const qs = params.toString();
    return request(`/admin/audit-logs${qs ? `?${qs}` : ''}`);
  },
  getMatchCandidates: (): Promise<any[]> =>
    request('/integration/match-candidates'),
  takeMatchAction: (candidateId: number, action: string, reviewNotes: string): Promise<any> =>
    request(`/integration/match-candidates/${candidateId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, review_notes: reviewNotes }),
    }),
  getIntegrationJobs: (): Promise<any[]> =>
    request('/integration/jobs'),
};
