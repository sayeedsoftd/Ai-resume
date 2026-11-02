import api from './api';

export const subscriptionService = {
  // Public / Candidate / Recruiter Endpoints
  async getPlans() {
    const response = await api.get('/subscriptions/plans');
    return response.data;
  },

  async getPaymentMethods() {
    const response = await api.get('/subscriptions/payment-methods');
    return response.data;
  },

  async submitPayment(formData) {
    const response = await api.post('/subscriptions/submit-payment', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getMySubscription() {
    const response = await api.get('/subscriptions/my-subscription');
    return response.data;
  },

  // Super Admin Moderation Endpoints
  async getAdminPayments(statusFilter = '') {
    const params = statusFilter ? { status_filter: statusFilter } : {};
    const response = await api.get('/admin/payments', { params });
    return response.data;
  },

  async approvePayment(id) {
    const response = await api.patch(`/admin/payments/${id}/approve`);
    return response.data;
  },

  async rejectPayment(id, rejectionReason) {
    const response = await api.patch(`/admin/payments/${id}/reject`, {
      rejection_reason: rejectionReason,
    });
    return response.data;
  },

  async getAdminPaymentSettings() {
    const response = await api.get('/admin/settings/payment');
    return response.data;
  },

  async updateAdminPaymentSettings(settingsData) {
    const response = await api.put('/admin/settings/payment', settingsData);
    return response.data;
  },

  async createPlan(planData) {
    const response = await api.post('/admin/plans', planData);
    return response.data;
  },

  async updatePlan(id, planData) {
    const response = await api.put(`/admin/plans/${id}`, planData);
    return response.data;
  },

  async deletePlan(id) {
    const response = await api.delete(`/admin/plans/${id}`);
    return response.data;
  },
};
