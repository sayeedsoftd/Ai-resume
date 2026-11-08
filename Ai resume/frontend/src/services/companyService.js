import api from './api';

export const companyService = {
  /**
   * Fetch public employer branding profile and active jobs
   * @param {string|number} companyId - Recruiter User ID or company slug
   */
  async getPublicCompanyProfile(companyId) {
    const response = await api.get(`/companies/${companyId}`);
    return response.data;
  },

  /**
   * Fetch logged-in recruiter's company profile
   */
  async getMyCompanyProfile() {
    const response = await api.get('/companies/recruiter/my-company');
    return response.data;
  },

  /**
   * Update logged-in recruiter's company profile
   * @param {Object} data - { company_name, company_website, company_location, company_description, company_size, company_logo_url }
   */
  async updateMyCompanyProfile(data) {
    const response = await api.put('/companies/recruiter/my-company', data);
    return response.data;
  },

  /**
   * Upload company brand logo
   * @param {File} file - image file
   */
  async uploadCompanyLogo(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/companies/recruiter/upload-logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
