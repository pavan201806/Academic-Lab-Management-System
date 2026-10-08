import apiClient from './api';

// Throttle tracker to prevent duplicate malpractice events within cooldown window
const eventCooldownMap = new Map();
const COOLDOWN_MS = 1200; // 1.2s cooldown per event type for duplicate browser events

export const malpracticeService = {
  /**
   * Records a malpractice event with client-side throttling to avoid duplicate API calls
   */
  async recordMalpracticeEvent({ experimentId, labId, eventType, details = {} }) {
    if (!experimentId || !eventType) return null;

    const cooldownKey = `${experimentId}_${eventType}`;
    const now = Date.now();
    const lastTrigger = eventCooldownMap.get(cooldownKey) || 0;

    if (now - lastTrigger < COOLDOWN_MS) {
      // Prohibited action blocked on client, throttled API dispatch
      return null;
    }

    eventCooldownMap.set(cooldownKey, now);

    try {
      const response = await apiClient.post('/malpractice/events', {
        experimentId,
        labId,
        eventType,
        details
      });
      return response.data?.event || response.data || response;
    } catch (error) {
      // Silent error logging so student coding session is not abruptly blocked if network glitches
      console.warn('Failed to dispatch malpractice event log:', error);
      return null;
    }
  },

  /**
   * Retrieves malpractice events for the active student session
   */
  async getStudentMalpracticeEvents(experimentId) {
    const response = await apiClient.get('/malpractice/events', {
      params: { experimentId }
    });
    return response.data || response;
  },

  /**
   * Retrieves summary statistics of malpractice occurrences
   */
  async getMalpracticeSummary(experimentId) {
    const response = await apiClient.get('/malpractice/summary', {
      params: { experimentId }
    });
    return response.data || response;
  },

  /**
   * Clears the cooldown cache (e.g. on unmount or session switch)
   */
  clearCooldownCache() {
    eventCooldownMap.clear();
  }
};

export default malpracticeService;
