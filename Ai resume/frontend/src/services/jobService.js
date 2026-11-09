import api from './api';

export const jobService = {
  async getJobs(params = {}) {
    const response = await api.get('/jobs/', { params });
    return response.data;
  },

  async getCategories() {
    const response = await api.get('/jobs/categories');
    return response.data;
  },

  async getJob(jobId) {
    const response = await api.get(`/jobs/${jobId}`);
    return response.data;
  },

  async createJob(jobData) {
    const response = await api.post('/jobs/', jobData);
    return response.data;
  },

  async matchJob(jobId, resumeId) {
    const response = await api.post(`/jobs/${jobId}/match/${resumeId}`);
    return response.data;
  },

  async applyToJob(jobId, resumeId, expectedSalary = null) {
    const payload = { job_id: jobId, resume_id: resumeId };
    if (expectedSalary !== null && expectedSalary !== undefined && expectedSalary !== '') {
      payload.expected_salary = Number(expectedSalary);
    }
    const response = await api.post('/applications/', payload);
    return response.data;
  },

  async getMyApplications() {
    const response = await api.get('/applications/my-applications');
    return response.data;
  },

  async getJobApplications(jobId, blindMode = false) {
    const response = await api.get(`/applications/job/${jobId}`, {
      params: blindMode ? { blind_mode: true } : {},
    });
    return response.data;
  },

  async updateApplicationStatus(applicationId, status) {
    const response = await api.patch(`/applications/${applicationId}/status`, { status });
    return response.data;
  },

  async getApplicationDossier(applicationId, blindMode = false) {
    const response = await api.get(`/applications/${applicationId}/dossier`, {
      params: blindMode ? { blind_mode: true } : {},
    });
    return response.data;
  },

  async auditApplicationProjects(applicationId) {
    const response = await api.post(`/applications/${applicationId}/audit-projects`);
    return response.data;
  },

  async getApplicationIntegrityAudit(applicationId) {
    const response = await api.get(`/applications/${applicationId}/integrity-audit`);
    return response.data;
  },

  async makeRecruiterDecision(applicationId, decisionData) {
    const response = await api.patch(`/applications/${applicationId}/decision`, decisionData);
    return response.data;
  },

  async getShortlistedCandidates(params = {}) {
    const response = await api.get('/recruiter/shortlisted-candidates', { params });
    return response.data;
  },

  async getMatchedJobs() {
    const response = await api.get('/jobs/matched');
    return response.data;
  },

  async oneClickApply(jobId, payload = {}) {
    const response = await api.post(`/jobs/${jobId}/apply`, payload);
    return response.data;
  },

  async getMyPostedJobs() {
    const response = await api.get('/jobs/recruiter/my-posted-jobs');
    return response.data;
  },

  async toggleJobStatus(jobId) {
    const response = await api.patch(`/jobs/${jobId}/toggle-status`);
    return response.data;
  },

  async deleteJob(jobId) {
    const response = await api.delete(`/jobs/${jobId}`);
    return response.data;
  },

  async getAllJobsAdmin() {
    const response = await api.get('/jobs/admin/all');
    return response.data;
  },

  async getJobAssessment(jobId) {
    const response = await api.get(`/jobs/${jobId}/assessment`);
    return response.data;
  },

  async submitJobAssessment(jobId, payload) {
    const response = await api.post(`/jobs/${jobId}/assessment/submit`, payload);
    return response.data;
  },

  async getSubmissionDetail(submissionId) {
    const response = await api.get(`/submissions/${submissionId}`);
    return response.data;
  },

  async updateJob(jobId, jobData) {
    const response = await api.put(`/jobs/${jobId}`, jobData);
    return response.data;
  },

  async getStage2Assessment(jobId) {
    const response = await api.get(`/jobs/${jobId}/stage2-assessment`);
    return response.data;
  },

  async submitStage2Assessment(applicationId, payload) {
    const response = await api.post(`/applications/${applicationId}/stage2-submit`, payload);
    return response.data;
  },

  async submitJobStage2Assessment(jobId, payload) {
    const response = await api.post(`/assessments/jobs/${jobId}/stage2-submit`, payload);
    return response.data;
  },

  async scheduleInterview(applicationId, payload) {
    const response = await api.post(`/applications/${applicationId}/schedule-interview`, payload);
    return response.data;
  },

  async scheduleSmartInterview(payload) {
    const response = await api.post('/recruiter/schedule-interview', payload);
    return response.data;
  },

  async sendCandidateMessage(payload) {
    const response = await api.post('/recruiter/send-message', payload);
    return response.data;
  },

  async getCandidateMessages() {
    const response = await api.get('/candidate/messages');
    return response.data;
  },

  async markCandidateMessageRead(messageId) {
    const response = await api.patch(`/candidate/messages/${messageId}/read`);
    return response.data;
  },

  async replyToRecruiterMessage(payload) {
    const response = await api.post('/candidate/messages/reply', payload);
    return response.data;
  },

  async getCandidateUnreadMessagesCount() {
    const response = await api.get('/candidate/messages/unread-count');
    return response.data;
  },

  // Candidate Inquiries & Official Interview Invites
  async getCandidateInquiries() {
    const response = await api.get('/candidates/inquiries');
    return response.data;
  },

  async getCandidateUnreadInquiriesCount() {
    const response = await api.get('/candidates/inquiries/unread-count');
    return response.data;
  },

  async markCandidateInquiryRead(inquiryId) {
    const response = await api.patch(`/candidates/inquiries/${inquiryId}/read`);
    return response.data;
  },

  async replyToCandidateInquiry(inquiryId, payload) {
    const response = await api.post(`/candidates/inquiries/${inquiryId}/reply`, payload);
    return response.data;
  },

  async actOnCandidateInquiry(inquiryId, payload) {
    const response = await api.post(`/candidates/inquiries/${inquiryId}/action`, payload);
    return response.data;
  },

  async getRecruiterInquiries() {
    const response = await api.get('/recruiter/inquiries');
    return response.data;
  },

  async getRecruiterUnreadInquiriesCount() {
    const response = await api.get('/recruiter/inquiries/unread-count');
    return response.data;
  },

  async markRecruiterInquiryRead(inquiryId) {
    const response = await api.patch(`/recruiter/inquiries/${inquiryId}/read`);
    return response.data;
  },

  async markApplicationViewed(applicationId) {
    const response = await api.post(`/applications/${applicationId}/view`);
    return response.data;
  },

  async runCodeSandbox(payload) {
    const response = await api.post('/assessments/run-code', payload);
    return response.data;
  },

  async submitVivaAudio(jobId, formData) {
    const response = await api.post(`/assessments/${jobId}/submit-viva`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async startAdaptiveExam(payload) {
    const response = await api.post('/assessments/adaptive/start', payload);
    return response.data;
  },

  async submitAdaptiveNext(payload) {
    const response = await api.post('/assessments/adaptive/next', payload);
    return response.data;
  },

  async generateOfferLetterDraft(payload) {
    const response = await api.post('/offer-letters/generate-draft', payload);
    return response.data;
  },

  async sendOfficialOfferLetter(payload) {
    const response = await api.post('/offer-letters/send', payload);
    return response.data;
  },

  async getOfferLetter(applicationId) {
    const response = await api.get(`/offer-letters/${applicationId}`);
    return response.data;
  },

  async respondToOfferLetter(offerId, payload) {
    const response = await api.post(`/offer-letters/${offerId}/respond`, payload);
    return response.data;
  },

  async uploadApplicationVideoPitch(applicationId, formData) {
    const response = await api.post(`/applications/${applicationId}/upload-video-pitch`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async uploadVideoPitch(formData) {
    const response = await api.post('/applications/upload-video-pitch', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getApplicationEvaluations(applicationId) {
    const response = await api.get(`/applications/${applicationId}/evaluations`);
    return response.data;
  },

  async submitApplicationEvaluation(applicationId, payload) {
    const response = await api.post(`/applications/${applicationId}/evaluations`, payload);
    return response.data;
  },

  async deleteApplicationEvaluation(applicationId, noteId) {
    const response = await api.delete(`/applications/${applicationId}/evaluations/${noteId}`);
    return response.data;
  },

  async generateAIJobDescription(payload) {
    const response = await api.post('/jobs/generate-ai-jd', payload);
    return response.data;
  },

  async rejectApplication(applicationId, payload = {}) {
    const response = await api.post(`/applications/${applicationId}/reject`, payload);
    return response.data;
  },

  async getApplicationGrowthFeedback(applicationId) {
    const response = await api.get(`/applications/${applicationId}/growth-feedback`);
    return response.data;
  },

  async searchTalentPool(payload = {}) {
    const response = await api.post('/recruiters/talent-search', payload);
    return response.data;
  },

  async sendInstantCandidateInvite(candidateId, payload) {
    const response = await api.post(`/recruiters/talent-search/${candidateId}/instant-invite`, payload);
    return response.data;
  },
};



