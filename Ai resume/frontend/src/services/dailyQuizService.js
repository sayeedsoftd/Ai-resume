import api from './api';

export const dailyQuizService = {
  /**
   * Fetches today's quiz session and candidate's current streak and XP.
   */
  async getTodayQuiz() {
    const response = await api.get('/daily-quiz/today');
    return response.data;
  },

  /**
   * Submits candidate's answers for today's 5-question micro-drill.
   * @param {Object} payload - { session_id: number, answers: number[] }
   */
  async submitTodayQuiz(payload) {
    const response = await api.post('/daily-quiz/submit', payload);
    return response.data;
  },
};

export default dailyQuizService;
