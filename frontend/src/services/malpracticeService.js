import apiClient from './api';

// Throttle and correlation trackers to eliminate duplicate events across browser APIs
const eventCooldownMap = new Map();
const lastTabSwitchTimes = new Map();

const COOLDOWN_MS = 1200; // 1.2s cooldown per event type for duplicate browser events
const TAB_BLUR_CORRELATION_WINDOW_MS = 1500; // Window blur occurring within 1.5s of tab switch is suppressed

export const malpracticeService = {
  /**
   * Records a malpractice event with intelligent client-side throttling and cross-event deduplication
   */
  async recordMalpracticeEvent({ experimentId, labId, eventType, details = {} }) {
    if (!experimentId || !eventType) return null;

    const now = Date.now();

    // 1. Cross-event deduplication: Tab switch causes window.blur in modern browsers.
    // If a TAB_SWITCH happened recently for this experiment, suppress duplicate WINDOW_BLUR
    if (eventType === 'WINDOW_BLUR') {
      const lastTabSwitch = lastTabSwitchTimes.get(experimentId) || 0;
      if (now - lastTabSwitch < TAB_BLUR_CORRELATION_WINDOW_MS) {
        // Suppress duplicate blur caused by the same tab switch action
        return null;
      }
    }

    if (eventType === 'TAB_SWITCH') {
      lastTabSwitchTimes.set(experimentId, now);
    }

    // 2. Per-event-type cooldown
    const cooldownKey = `${experimentId}_${eventType}`;
    const lastTrigger = eventCooldownMap.get(cooldownKey) || 0;

    if (now - lastTrigger < COOLDOWN_MS) {
      // Event throttled on client
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
      // Non-blocking warning logging
      console.warn('Failed to dispatch malpractice event log:', error);
      return null;
    }
  },

  /**
   * Retrieves malpractice events matching filter parameters (for timeline & student activity)
   */
  async getMalpracticeEvents(params = {}) {
    const response = await apiClient.get('/malpractice/events', { params });
    return response.data || response;
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
  async getMalpracticeSummary(params = {}) {
    const response = await apiClient.get('/malpractice/summary', { params });
    return response.data || response;
  },

  /**
   * Retrieves comprehensive lab-level malpractice overview for teachers & admins
   */
  async getLabMalpracticeOverview(labId, query = {}) {
    const response = await apiClient.get(`/malpractice/labs/${labId}/overview`, {
      params: query
    });
    return response.data || response;
  },

  /**
   * Clears all cooldown and correlation caches (on unmount or experiment switch)
   */
  clearCooldownCache() {
    eventCooldownMap.clear();
    lastTabSwitchTimes.clear();
  }
};

export default malpracticeService;
