import React, { createContext, useContext, useEffect, useState } from 'react';
import { stompService } from './stompService';
import { useAuth } from '../context/AuthContext';
import { TOKEN_KEY } from '../services/apiClient';
import { WsConnectionStatus } from '../types/realtime';

const WsStatusContext = createContext<WsConnectionStatus>('DISCONNECTED');

export const useWsStatus = (): WsConnectionStatus => useContext(WsStatusContext);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<WsConnectionStatus>('DISCONNECTED');

  useEffect(() => stompService.onStatus(setStatus), []);

  useEffect(() => {
    if (isAuthenticated) {
      stompService.connect(() => localStorage.getItem(TOKEN_KEY));
    } else {
      stompService.disconnect();
    }
    return () => stompService.disconnect();
  }, [isAuthenticated]);

  return (
    <WsStatusContext.Provider value={status}>
      {children}
    </WsStatusContext.Provider>
  );
}
