import { useEffect, useRef, useState } from 'react';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { useAuth } from '../contexts/AuthContext';

export const useSignalR = (hubUrl: string) => {
  const { token, isAuthenticated, loading } = useAuth();
  const connectionRef = useRef<HubConnection | null>(null);
  const [connectionState, setConnectionState] = useState<HubConnectionState>(HubConnectionState.Disconnected);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (loading || !isAuthenticated || !token) {
      return;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => token })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .build();

    connectionRef.current = connection;
    setConnectionState(connection.state);

    connection.onreconnecting(() => {
      setConnectionState(HubConnectionState.Reconnecting);
      setIsConnected(false);
    });

    connection.onreconnected(() => {
      setConnectionState(HubConnectionState.Connected);
      setIsConnected(true);
    });

    connection.onclose(() => {
      setConnectionState(HubConnectionState.Disconnected);
      setIsConnected(false);
    });

    connection.start()
      .then(() => {
        console.log('SignalR Connected');
        setConnectionState(HubConnectionState.Connected);
        setIsConnected(true);
      })
      .catch(err => {
        console.error('SignalR Error:', err);
        setConnectionState(HubConnectionState.Disconnected);
        setIsConnected(false);
      });

    return () => {
      connection.stop();
      connectionRef.current = null;
      setIsConnected(false);
    };
  }, [hubUrl, token, isAuthenticated, loading]);

  return { connection: connectionRef, connectionState, isConnected };
};