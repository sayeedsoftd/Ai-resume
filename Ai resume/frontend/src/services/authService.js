import api from './api';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  async register(userData) {
    const response = await api.post('/auth/register', {
      email: userData.email,
      password: userData.password,
      full_name: userData.full_name || userData.name,
    });
    return response.data;
  },

  async googleLogin(credentialOrToken) {
    const response = await api.post('/auth/google', {
      credential: credentialOrToken,
      token: credentialOrToken,
    });
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/profile/me');
    return response.data;
  },

  async updateProfile(profileData) {
    const response = await api.put('/profile/me', profileData);
    return response.data;
  },

  async uploadPhoto(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/profile/upload-photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
