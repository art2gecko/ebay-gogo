import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = 'ws://127.0.0.1:8888/api/ws';
const RECONNECT_DELAY = 3000;

export function useWebSocket(onMessage) {
  const [connected, setConnected] = useState(false);
  const [lastConnectedAt, setLastConnectedAt] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const onMessageRef = useRef(onMessage);

  // Keep the callback ref up to date
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setConnected(true);
      setLastConnectedAt(Date.now());
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastConnectedAt(Date.now());
        if (onMessageRef.current) {
          onMessageRef.current(data);
        }
      } catch (err) {
        console.error('WebSocket message parse error:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected, reconnecting...');
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      ws.close();
    };

    wsRef.current = ws;
  }, []);

  const reconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent auto-reconnect loop
      wsRef.current.close();
    }
    wsRef.current = null;
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }, []);

  return { connected, send, reconnect, lastConnectedAt };
}
