import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface GasState {
  main_flow: number;
  main_flow_measured: number;
  feeder_flow: number;
  feeder_flow_measured: number;
  main_valve: boolean;
  feeder_valve: boolean;
}

interface VacuumState {
  chamber_pressure: number;
  gate_valve: boolean;
  mech_pump: boolean;
  booster_pump: boolean;
  vent_valve: boolean;
}

interface FeederState {
  running: boolean;
  frequency: number;
}

interface DeagglomeratorState {
  duty_cycle: number;
  frequency: number;
}

interface NozzleState {
  active_nozzle: 1 | 2;
  shutter_open: boolean;
}

interface PressureState {
  chamber: number;
  feeder: number;
  main_supply: number;
  nozzle: number;
  regulator: number;
}

interface AxisState {
  position: number;
  in_position: boolean;
  moving: boolean;
  error: boolean;
  homed: boolean;
}

interface MotionState {
  position: {
    x: number;
    y: number;
    z: number;
  };
  status: {
    x_axis: AxisState;
    y_axis: AxisState;
    z_axis: AxisState;
    module_ready: boolean;
  };
  parameters: {
    velocity: {
      x: number;
      y: number;
      z: number;
    };
    acceleration: {
      x: number;
      y: number;
      z: number;
    };
    deceleration: {
      x: number;
      y: number;
      z: number;
    };
  };
}

interface SafetyState {
  hardware: {
    motion_enabled: boolean;
    plc_connected: boolean;
    position_valid: boolean;
  };
  process: {
    gas_flow_stable: boolean;
    powder_feed_active: boolean;
    process_ready: boolean;
  };
  safety: {
    emergency_stop: boolean;
    interlocks_ok: boolean;
    limits_ok: boolean;
  };
}

interface SystemState {
  equipment: {
    gas: GasState;
    vacuum: VacuumState;
    feeder1: FeederState;
    feeder2: FeederState;
    deagg1: DeagglomeratorState;
    deagg2: DeagglomeratorState;
    nozzle: NozzleState;
    pressures: PressureState;
  };
  motion: MotionState;
  safety: SafetyState;
}

const INITIAL_STATE: SystemState = {
  equipment: {
    gas: {
      main_flow: 0,
      main_flow_measured: 0,
      feeder_flow: 0,
      feeder_flow_measured: 0,
      main_valve: false,
      feeder_valve: false
    },
    vacuum: {
      chamber_pressure: 0,
      gate_valve: false,
      mech_pump: false,
      booster_pump: false,
      vent_valve: false
    },
    feeder1: {
      running: false,
      frequency: 0
    },
    feeder2: {
      running: false,
      frequency: 0
    },
    deagg1: {
      duty_cycle: 0,
      frequency: 500
    },
    deagg2: {
      duty_cycle: 0,
      frequency: 500
    },
    nozzle: {
      active_nozzle: 1,
      shutter_open: false
    },
    pressures: {
      chamber: 0,
      feeder: 0,
      main_supply: 0,
      nozzle: 0,
      regulator: 0
    }
  },
  motion: {
    position: {
      x: 0,
      y: 0,
      z: 0
    },
    status: {
      x_axis: {
        position: 0,
        in_position: false,
        moving: false,
        error: false,
        homed: false
      },
      y_axis: {
        position: 0,
        in_position: false,
        moving: false,
        error: false,
        homed: false
      },
      z_axis: {
        position: 0,
        in_position: false,
        moving: false,
        error: false,
        homed: false
      },
      module_ready: false
    },
    parameters: {
      velocity: {
        x: 0,
        y: 0,
        z: 0
      },
      acceleration: {
        x: 0,
        y: 0,
        z: 0
      },
      deceleration: {
        x: 0,
        y: 0,
        z: 0
      }
    }
  },
  safety: {
    hardware: {
      motion_enabled: false,
      plc_connected: false,
      position_valid: false
    },
    process: {
      gas_flow_stable: false,
      powder_feed_active: false,
      process_ready: false
    },
    safety: {
      emergency_stop: false,
      interlocks_ok: true,
      limits_ok: true
    }
  }
};

interface WebSocketContextType {
  state: SystemState;
  connected: boolean;
  error: string | null;
}

const WebSocketContext = createContext<WebSocketContextType>({
  state: INITIAL_STATE,
  connected: false,
  error: null
});

function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SystemState>(INITIAL_STATE);
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
          if (!mountedRef.current) {
            console.log('Received message but component unmounted');
            return;
          }
          try {
            console.log('Raw message:', event.data);
            const data = JSON.parse(event.data);
            console.log('Parsed message:', data);
            
            if (data.type === 'state_update') {
              console.log('Updating state with:', data.data);
              setState(prevState => ({
                ...prevState,
                ...data.data
              }));
            } else {
              console.log('Ignoring message - not a state update');
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

export { WebSocketProvider, useWebSocket, type SystemState };