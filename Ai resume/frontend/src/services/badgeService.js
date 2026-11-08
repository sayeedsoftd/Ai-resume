import axios from 'axios';
import api from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const badgeService = {
  /**
   * Fetch all verified badges for the current candidate
   */
  async getCandidateBadges() {
    const response = await api.get('/candidate/badges');
    return response.data;
  },

  /**
   * Public verification check (no auth header, safe for external public visitors)
   */
  async getPublicBadgeVerification(badgeId) {
    const response = await axios.get(`${API_BASE_URL}/public/verify-badge/${encodeURIComponent(badgeId)}`);
    return response.data;
  },

  /**
   * Claim demo verified badge for immediate testing
   */
  async claimSampleBadge() {
    const response = await api.post('/candidate/badges/claim-test-badge');
    return response.data;
  },
};
