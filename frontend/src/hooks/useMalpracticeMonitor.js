import { useState, useEffect, useRef, useCallback } from 'react';
import { malpracticeService } from '../services/malpracticeService';

/**
 * Custom hook to monitor student experiment sessions for:
 * 1. Tab switching (Page Visibility API)
 * 2. Window focus loss (window.blur)
 * 3. Fullscreen enforcement and exit detection (Fullscreen API)
 *
 * Provides safe lifecycle management, deduplication, and non-blocking warnings.
 */
export const useMalpracticeMonitor = ({
  experimentId,
  labId,
  enabled = true,
  onWarning = null
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenRequired, setFullscreenRequired] = useState(false);
  const [hasEverEnteredFullscreen, setHasEverEnteredFullscreen] = useState(false);

  // References to keep state consistent across async events and prevent duplicate listener invocations
  const isTabHiddenRef = useRef(false);
  const isWindowBlurredRef = useRef(false);
  const isFullscreenActiveRef = useRef(false);
  const hasEnteredFullscreenRef = useRef(false);
  const warningCallbackRef = useRef(onWarning);

  warningCallbackRef.current = onWarning;

  // Helper to trigger warnings
  const triggerWarning = useCallback((message) => {
    if (warningCallbackRef.current) {
      warningCallbackRef.current(message);
    }
  }, []);

  // Safe check for active fullscreen element across vendor prefixes
  const getFullscreenElement = useCallback(() => {
    return (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      null
    );
  }, []);

  // Request browser fullscreen mode with user-gesture safety
  const requestFullscreen = useCallback(async () => {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
      setIsFullscreen(true);
      isFullscreenActiveRef.current = true;
      setHasEverEnteredFullscreen(true);
      hasEnteredFullscreenRef.current = true;
      setFullscreenRequired(true);
      return true;
    } catch (err) {
      console.warn('Fullscreen request declined or unsupported by browser:', err);
      return false;
    }
  }, []);

  // Exit fullscreen cleanly if needed
  const exitFullscreen = useCallback(async () => {
    try {
      if (getFullscreenElement()) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          await document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
      }
      setIsFullscreen(false);
      isFullscreenActiveRef.current = false;
    } catch (err) {
      console.warn('Exit fullscreen failed:', err);
    }
  }, [getFullscreenElement]);

  useEffect(() => {
    if (!enabled || !experimentId) {
      return;
    }

    // Initialize initial state
    isTabHiddenRef.current = document.visibilityState === 'hidden';
    isFullscreenActiveRef.current = !!getFullscreenElement();
    setIsFullscreen(!!getFullscreenElement());

    // 1. Page Visibility Monitoring (Tab Switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (!isTabHiddenRef.current) {
          isTabHiddenRef.current = true;

          triggerWarning('⚠️ Tab switching is monitored during the lab session.');

          malpracticeService.recordMalpracticeEvent({
            experimentId,
            labId,
            eventType: 'TAB_SWITCH',
            details: {
              visibilityState: 'hidden',
              timestamp: new Date().toISOString()
            }
          });
        }
      } else if (document.visibilityState === 'visible') {
        isTabHiddenRef.current = false;
        // Resume monitoring on tab return (returning is not a malpractice event)
      }
    };

    // 2. Window Focus Monitoring (Blur / Focus)
    const handleWindowBlur = () => {
      // If tab is already hidden, visibilitychange handles the event
      if (isTabHiddenRef.current) {
        return;
      }

      if (!isWindowBlurredRef.current) {
        isWindowBlurredRef.current = true;

        triggerWarning('⚠️ Please keep the lab window active.');

        malpracticeService.recordMalpracticeEvent({
          experimentId,
          labId,
          eventType: 'WINDOW_BLUR',
          details: {
            source: 'window_blur',
            timestamp: new Date().toISOString()
          }
        });
      }
    };

    const handleWindowFocus = () => {
      isWindowBlurredRef.current = false;
      // Focus regained (resumes monitoring, no event recorded)
    };

    // 3. Fullscreen Exit Monitoring
    const handleFullscreenChange = () => {
      const currentFullscreenEl = getFullscreenElement();
      const isNowFullscreen = !!currentFullscreenEl;

      if (isNowFullscreen) {
        setIsFullscreen(true);
        isFullscreenActiveRef.current = true;
        setHasEverEnteredFullscreen(true);
        hasEnteredFullscreenRef.current = true;
        // Entering or re-entering fullscreen does not generate a malpractice record
      } else {
        setIsFullscreen(false);
        // If the session was previously in fullscreen mode, exiting is a violation
        if (isFullscreenActiveRef.current || hasEnteredFullscreenRef.current) {
          isFullscreenActiveRef.current = false;

          triggerWarning('⚠️ Please remain in fullscreen mode during the lab session.');

          malpracticeService.recordMalpracticeEvent({
            experimentId,
            labId,
            eventType: 'FULLSCREEN_EXIT',
            details: {
              fullscreenElementPresent: false,
              timestamp: new Date().toISOString()
            }
          });
        }
      }
    };

    // Register event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Clean up event listeners on unmount or when monitoring is disabled
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);

      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);

      malpracticeService.clearCooldownCache();
    };
  }, [enabled, experimentId, labId, getFullscreenElement, triggerWarning]);

  return {
    isFullscreen,
    fullscreenRequired,
    hasEverEnteredFullscreen,
    requestFullscreen,
    exitFullscreen
  };
};

export default useMalpracticeMonitor;
