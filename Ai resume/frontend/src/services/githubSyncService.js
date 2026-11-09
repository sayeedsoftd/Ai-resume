import api from './api';

export const githubSyncService = {
  /**
   * Fetches public GitHub user & repository details, runs Gemini Pro analysis,
   * and synchronizes profile credentials.
   * @param {string} githubUsername - Username or GitHub profile URL
   * @param {boolean} applyToProfile - Whether to persist directly into database UserProfile
   */
  async syncGitHub(githubUsername, applyToProfile = true) {
    const response = await api.post('/candidates/sync-github', {
      github_username: githubUsername,
      apply_to_profile: applyToProfile,
    });
    return response.data;
  },
};
