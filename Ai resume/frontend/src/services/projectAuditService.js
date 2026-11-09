import api from './api';

export const projectAuditService = {
  async auditApplicationProjects(applicationId) {
    const response = await api.post(`/applications/${applicationId}/audit-projects`);
    return response.data;
  },

  async getApplicationIntegrityAudit(applicationId) {
    const response = await api.get(`/applications/${applicationId}/integrity-audit`);
    return response.data;
  },

  async analyzeCustomProjects(payload) {
    const response = await api.post('/project-audit/analyze', payload);
    return response.data;
  },
};

export default projectAuditService;
