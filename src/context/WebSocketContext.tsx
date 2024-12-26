import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

// State interfaces
interface GasState {
  main_flow: number;           // Setpoint (0-100 SLPM)
  main_flow_measured: number;  // Actual measured value (SLPM)
  feeder_flow: number;         // Setpoint (0-10 SLPM)
  feeder_flow_measured: number;// Actual measured value (SLPM)
  main_valve: boolean;
  feeder_valve: boolean;
}

interface VacuumState {
  chamber_pressure: number;    // torr
  gate_valve: boolean;
  mech_pump: boolean;
  booster_pump: boolean;
  vent_valve: boolean;
}

interface FeederState {
  running: boolean;
  frequency: number;          // Hz (200-1200, steps of 200)
}

interface DeagglomeratorState {
  duty_cycle: number;         // % (20-35, higher = lower speed)
}

interface NozzleState {
  active_nozzle: 1 | 2;
  shutter_open: boolean;
}

interface PressureState {
  chamber: number;            // torr
  feeder: number;            // torr
  main_supply: number;       // torr
  nozzle: number;           // torr
  regulator: number;        // torr
}

interface AxisState {
  position: number;          // mm
  in_position: boolean;      // At target
  moving: boolean;          // Currently moving
  error: boolean;           // Error state
  homed: boolean;           // Has been homed
}

interface MotionState {
  position: {
    x: number;              // mm
    y: number;              // mm
    z: number;              // mm
  };
  status: {
    x_axis: AxisState;
    y_axis: AxisState;
    z_axis: AxisState;
    module_ready: boolean;  // Motion controller ready
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

// Initial state with proper defaults
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
      frequency: 200  // Default to minimum frequency
    },
    feeder2: {
      running: false,
      frequency: 200  // Default to minimum frequency
    },
    deagg1: {
      duty_cycle: 35  // Default to Off (highest duty cycle)
    },
    deagg2: {
      duty_cycle: 35  // Default to Off (highest duty cycle)
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

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SystemState>(INITIAL_STATE);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    console.log('WebSocketProvider mounted');

    const connect = () => {
      if (!mountedRef.current) return;
      
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
            console.log('Raw WebSocket message:', event.data);
            const data = JSON.parse(event.data);
            console.log('Parsed message:', JSON.stringify(data, null, 2));
            
            if (data.type === 'state_update') {
              if (!data.data) {
                console.error('Missing data field in state update');
                return;
              }

              // Validate equipment state
              if (!data.data.equipment) {
                console.error('Missing equipment state:', data.data);
                return;
              }

              const { equipment, motion, safety } = data.data;

              // Validate required equipment fields
              const requiredFields = ['gas', 'vacuum', 'feeder1', 'feeder2', 'deagg1', 'deagg2', 'nozzle', 'pressures'];
              const missingFields = requiredFields.filter(field => !equipment[field]);
              if (missingFields.length > 0) {
                console.error('Missing equipment fields:', missingFields);
                console.error('Received equipment state:', equipment);
                return;
              }

              // Validate motion state
              if (!motion?.position || !motion?.status) {
                console.error('Invalid motion state:', motion);
                return;
              }

              // Validate safety state
              if (!safety?.hardware || !safety?.process || !safety?.safety) {
                console.error('Invalid safety state:', safety);
                return;
              }

              console.log('Valid state update received:', {
                equipment: Object.keys(equipment),
                motion: Object.keys(motion),
                safety: Object.keys(safety)
              });

              setState(prevState => ({
                ...prevState,
                ...data.data
              }));
            }
          } catch (err) {
            console.error('Failed to parse or validate message:', err);
            if (err instanceof Error) {
              setError(`State validation error: ${err.message}`);
            }
          }
        };

        wsRef.current.onerror = (event: Event) => {
          if (!mountedRef.current) return;
          console.error('WebSocket error:', event);
          setConnected(false);
          setError('WebSocket connection error');
        };

        wsRef.current.onclose = () => {
          if (!mountedRef.current) return;
          console.log('WebSocket disconnected');
          setConnected(false);
          wsRef.current = null;
          
          if (mountedRef.current) {
            setTimeout(connect, 3000);
          }
        };
      } catch (err) {
        if (!mountedRef.current) return;
        console.error('Failed to create WebSocket:', err);
        setConnected(false);
        setError('Failed to connect to WebSocket');
        wsRef.current = null;

        if (mountedRef.current) {
          setTimeout(connect, 3000);
        }
      }
    };

    connect();

    return () => {
      console.log('WebSocketProvider unmounting');
      mountedRef.current = false;
      if (wsRef.current) {
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

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

export type { SystemState };