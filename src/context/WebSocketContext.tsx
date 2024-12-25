import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface GasState {
  main_flow: number;
  feeder_flow: number;
  main_pressure: number;
  feeder_pressure: number;
  nozzle_pressure: number;
  regulator_pressure: number;
  main_valve: boolean;
  feeder_valve: boolean;
}

interface VacuumState {
  chamber_pressure: number;
  mech_pump_running: boolean;
  booster_pump_running: boolean;
  vent_valve_open: boolean;
  gate_valve_position: 'open' | 'closed' | 'partial';
}

interface FeederState {
  id: number;
  frequency: number;
  running: boolean;
}

interface DeagglomeratorState {
  id: number;
  duty_cycle: number;
  frequency: number;
  speed: number;
}

interface NozzleState {
  active_id: 1 | 2;
  shutter_engaged: boolean;
}

interface EquipmentState {
  gas: GasState;
  vacuum: VacuumState;
  feeders: FeederState[];
  deagglomerators: DeagglomeratorState[];
  nozzle: NozzleState;
}

const INITIAL_STATE: EquipmentState = {
  gas: {
    main_flow: 0,
    feeder_flow: 0,
    main_pressure: 0,
    feeder_pressure: 0,
    nozzle_pressure: 0,
    regulator_pressure: 0,
    main_valve: false,
    feeder_valve: false
  },
  vacuum: {
    chamber_pressure: 0,
    mech_pump_running: false,
    booster_pump_running: false,
    vent_valve_open: false,
    gate_valve_position: 'closed'
  },
  feeders: [
    { id: 1, frequency: 0, running: false },
    { id: 2, frequency: 0, running: false }
  ],
  deagglomerators: [
    { id: 1, duty_cycle: 0, frequency: 0, speed: 0 },
    { id: 2, duty_cycle: 0, frequency: 0, speed: 0 }
  ],
  nozzle: {
    active_id: 1,
    shutter_engaged: false
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