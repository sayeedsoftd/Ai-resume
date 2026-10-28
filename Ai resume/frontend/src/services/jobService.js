import api from './api';

export const jobService = {
  async getJobs(params = {}) {
    const response = await api.get('/jobs/', { params });
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

  async applyToJob(jobId, resumeId) {
    const response = await api.post('/applications/', { job_id: jobId, resume_id: resumeId });
    return response.data;
  },

  async getMyApplications() {
    const response = await api.get('/applications/my-applications');
    return response.data;
  },

  async getJobApplications(jobId) {
    const response = await api.get(`/applications/job/${jobId}`);
    return response.data;
  },

  async updateApplicationStatus(applicationId, status) {
    const response = await api.patch(`/applications/${applicationId}/status`, { status });
    return response.data;
  },

  async getApplicationDossier(applicationId) {
    const response = await api.get(`/applications/${applicationId}/dossier`);
    return response.data;
  },

  async makeRecruiterDecision(applicationId, decisionData) {
    const response = await api.patch(`/applications/${applicationId}/decision`, decisionData);
    return response.data;
  },

  async getMatchedJobs() {
    const response = await api.get('/jobs/matched');
    return response.data;
  },

  async oneClickApply(jobId) {
    const response = await api.post(`/jobs/${jobId}/apply`);
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
};

