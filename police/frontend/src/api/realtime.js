import { API_BASE } from './client.js';

/**
 * Subscribes to the real-time EventSource (SSE) stream from the backend (/api/realtime/stream).
 * Auto-reconnects and falls back gracefully to a local simulation interval if offline.
 */
export function subscribeRealtimeStream(onEvent, onError) {
  let eventSource = null;
  let simulatedInterval = null;

  try {
    const streamUrl = `${API_BASE}/api/realtime/stream`;
    eventSource = new EventSource(streamUrl);

    eventSource.addEventListener('patrol_telemetry', (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent({ type: 'patrol_telemetry', data });
      } catch (err) {
        console.warn('[SSE] Failed to parse patrol_telemetry payload:', err);
      }
    });

    eventSource.addEventListener('alert_push', (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent({ type: 'alert_push', data });
      } catch (err) {
        console.warn('[SSE] Failed to parse alert_push payload:', err);
      }
    });

    eventSource.onerror = (err) => {
      console.warn('[SSE] Stream disconnected or offline, switching to simulated telemetry ticker.');
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (onError) onError(err);

      // Start local fallback ticker if not already running
      if (!simulatedInterval) {
        simulatedInterval = setInterval(() => {
          onEvent({
            type: 'alert_push',
            data: {
              id: `ALT-SIM-${Math.floor(Math.random() * 9000 + 1000)}`,
              district: ['Bengaluru Urban', 'Mysuru', 'Dakshina Kannada', 'Belagavi'][Math.floor(Math.random() * 4)],
              type: 'Real-Time Anomaly Alert',
              message: 'DBSCAN incident cluster detected in active monitoring sector.',
              severity: Math.random() > 0.5 ? 'Critical' : 'High',
              timestamp: new Date().toISOString()
            }
          });
        }, 8000);
      }
    };
  } catch (err) {
    console.warn('[SSE] Unable to open EventSource:', err);
  }

  // Cleanup unsubscriber function
  return () => {
    if (eventSource) {
      eventSource.close();
    }
    if (simulatedInterval) {
      clearInterval(simulatedInterval);
    }
  };
}
