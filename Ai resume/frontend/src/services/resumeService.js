import api from './api';

export const resumeService = {
  async uploadResume(file, jobDescription = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (jobDescription && jobDescription.trim()) {
      formData.append('job_description', jobDescription.trim());
    }
    const response = await api.post('/resumes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getResumes() {
    const response = await api.get('/resumes/');
    return response.data;
  },

  async getResume(resumeId) {
    const response = await api.get(`/resumes/${resumeId}`);
    return response.data;
  },

  async getResumeAnalysis(resumeId) {
    const response = await api.get(`/resumes/${resumeId}/analysis`);
    return response.data;
  },

  async saveBuilderResume(payload) {
    const response = await api.post('/resumes/builder/save', payload);
    return response.data;
  },

  async optimizeSummary(payload) {
    const response = await api.post('/resumes/builder/optimize-summary', payload);
    return response.data;
  },

  async analyzeAgainstJob(payload) {
    const response = await api.post('/resumes/analyze-against-job', payload);
    return response.data;
  },
};

