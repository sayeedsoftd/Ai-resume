import api from './api';

export const kycService = {
  async submitKYC(realName, phoneNumber, nidFile, selfieFile) {
    const formData = new FormData();
    formData.append('real_name', realName);
    formData.append('phone_number', phoneNumber);
    formData.append('nid_document', nidFile);
    formData.append('selfie_image', selfieFile);

    const response = await api.post('/kyc/submit', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getMyKYCHistory() {
    const response = await api.get('/kyc/status');
    return response.data;
  },

  async adminListKYC() {
    const response = await api.get('/admin/kyc/pending');
    return response.data;
  },

  async adminReviewKYC(kycId, status, rejectionReason = null) {
    const response = await api.post(`/admin/kyc/review/${kycId}`, {
      status,
      rejection_reason: rejectionReason,
    });
    return response.data;
  },
};
