import api from './api';

export const careerMentorService = {
  /**
   * Fetches the candidate's career trajectory roadmap.
   * @param {boolean} refresh - Force fresh recalculation via Gemini AI
   */
  async getCareerRoadmap(refresh = false) {
    const response = await api.get('/candidates/career-roadmap', {
      params: { refresh },
    });
    return response.data;
  },

  /**
   * Explicitly recalculates career roadmap using latest resume snapshot.
   */
  async refreshCareerRoadmap() {
    const response = await api.post('/candidates/career-roadmap/refresh');
    return response.data;
  },
};

export default careerMentorService;
