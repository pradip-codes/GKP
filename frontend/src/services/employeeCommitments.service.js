import api from './api';

const employeeCommitmentsService = {
  /**
   * Get employee daily attendance & commitments status
   * Returns: { state: "NOT_CHECKED_IN" | "NEEDS_COMMITMENTS" | "UNLOCKED" | "CHECKED_OUT", checkInTime, carryOverTasks[], todayTasks[] }
   */
  async getDayStatus() {
    try {
      const response = await api.get('/employee/day-status');
      return response.data;
    } catch (err) {
      // If 403 DAY_LOCKED, the response contains the current state
      if (err.response?.data?.code === 'DAY_LOCKED' && err.response?.data?.state) {
        return {
          success: true,
          state: err.response.data.state,
          carryOverTasks: [],
          todayTasks: []
        };
      }
      throw err;
    }
  },

  /**
   * Mark attendance Check-In
   */
  async checkIn() {
    const response = await api.post('/employee/attendance/check-in');
    return response.data;
  },

  /**
   * Get today's draft & carried tasks
   */
  async getTodayTasks() {
    const response = await api.get('/employee/tasks/today');
    return response.data;
  },

  /**
   * Add a single draft task
   */
  async addDraftTask(title) {
    const response = await api.post('/employee/tasks', { title });
    return response.data;
  },

  /**
   * Delete a draft task before submit
   */
  async deleteDraftTask(taskId) {
    const response = await api.delete(`/employee/tasks/${taskId}`);
    return response.data;
  },

  /**
   * Submit commitments (locks list and unlocks employee dashboard)
   */
  async submitCommitments() {
    const response = await api.post('/employee/tasks/submit');
    return response.data;
  },

  /**
   * Add an extra completed task during End-of-Day Review
   */
  async addExtraTask(title, isCompleted = true) {
    const response = await api.post('/employee/tasks/extra', { title, isCompleted });
    return response.data;
  },

  /**
   * Check-Out with End-of-Day Review completedTaskIds and mandatory verificationSessionId
   */
  async checkOut(payload = {}) {
    let body = {};
    if (Array.isArray(payload)) {
      body = { completedTaskIds: payload };
    } else {
      body = {
        completedTaskIds: payload.completedTaskIds || [],
        verificationSessionId: payload.verificationSessionId,
        extraTasks: payload.extraTasks || []
      };
    }
    const response = await api.post('/employee/attendance/check-out', body);
    return response.data;
  },

  /**
   * Cancel check-out within 10-minute window
   */
  async cancelCheckOut() {
    const response = await api.post('/employee/attendance/cancel-check-out');
    return response.data;
  }
};

export default employeeCommitmentsService;
