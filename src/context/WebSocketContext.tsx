import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface GasState {
  main_flow: number;
  feeder_flow: number;
  main_valve: boolean;
  feeder_valve: boolean;
}

interface VacuumState {
  chamber_pressure: number;
  gate_valve: boolean;
  mech_pump: boolean;
  booster_pump: boolean;
}

interface FeederState {
  running: boolean;
  frequency: number;
}

interface NozzleState {
  active_nozzle: 1 | 2;  // Literal type for 1 or 2
  shutter_open: boolean;
  pressure: number;
}

interface EquipmentState {
  gas: GasState;
  vacuum: VacuumState;
  feeder1: FeederState;
  feeder2: FeederState;
  nozzle: NozzleState;
}

const INITIAL_STATE: EquipmentState = {
  gas: {
    main_flow: 0,
    feeder_flow: 0,
    main_valve: false,
    feeder_valve: false
  },
  vacuum: {
    chamber_pressure: 0,
    gate_valve: false,
    mech_pump: false,
    booster_pump: false
  },
  feeder1: {
    running: false,
    frequency: 0
  },
  feeder2: {
    running: false,
    frequency: 0
  },
  nozzle: {
    active_nozzle: 1,
    shutter_open: false,
    pressure: 0
  }
};

interface WebSocketContextType {
  state: EquipmentState;
  connected: boolean;
  error: string | null;
}

const WebSocketContext = createContext<WebSocketContextType>({
  state: INITIAL_STATE,
  connected: false,
  error: null
});

function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EquipmentState>(INITIAL_STATE);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    console.log('WebSocketProvider mounted');

    const connect = () => {
      if (!mountedRef.current) {
        console.log('Not connecting - component unmounted');
        return;
      }
      
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        return;
      }

      try {
        console.log('Attempting WebSocket connection...');
        wsRef.current = new WebSocket('ws://localhost:8003/ws/state');

        wsRef.current.onopen = () => {
          if (!mountedRef.current) return;
          console.log('WebSocket connection established');
          setConnected(true);
          setError(null);
        };

        wsRef.current.onmessage = (event: MessageEvent) => {
          if (!mountedRef.current) return;
          try {
            const data = JSON.parse(event.data);
            console.log('Received message:', data);
            if (data.type === 'state_update' && data.data?.equipment) {
              console.log('Updating state with:', data.data.equipment);
              setState(data.data.equipment);
            }
          } catch (err) {
            console.error('Failed to parse message:', err);
          }
        };

        wsRef.current.onerror = (event: Event) => {
          if (!mountedRef.current) return;
          console.error('WebSocket error:', event);
          setConnected(false);
          setError('WebSocket connection error');
        };

        wsRef.current.onclose = (event: CloseEvent) => {
          if (!mountedRef.current) return;
          console.log('WebSocket closed:', event.code, event.reason);
          setConnected(false);
          wsRef.current = null;
          
          // Only attempt reconnect if the component is still mounted
          if (mountedRef.current) {
            console.log('Scheduling reconnection attempt...');
            setTimeout(connect, 3000);
          }
        };
      } catch (err) {
        if (!mountedRef.current) return;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Failed to create WebSocket:', errorMessage);
        setConnected(false);
        setError(`Failed to connect: ${errorMessage}`);
        wsRef.current = null;

        if (mountedRef.current) {
          console.log('Scheduling reconnection attempt after error...');
          setTimeout(connect, 3000);
        }
      }
    };

    connect();

    return () => {
      console.log('WebSocketProvider unmounting, cleaning up...');
      mountedRef.current = false;
      if (wsRef.current) {
        console.log('Closing WebSocket connection');
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ state, connected, error }}>
      {children}
    </WebSocketContext.Provider>
  );
}

function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

export { WebSocketProvider, useWebSocket, type EquipmentState };