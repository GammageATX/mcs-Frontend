import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Slider,
  Alert,
  Paper
} from '@mui/material';

interface EquipmentState {
  gas: {
    main_flow: number;
    feeder_flow: number;
    main_pressure: number;
    feeder_pressure: number;
    nozzle_pressure: number;
    regulator_pressure: number;
  };
  vacuum: {
    chamber_pressure: number;
    mech_pump_running: boolean;
    booster_pump_running: boolean;
    vent_valve_open: boolean;
    gate_valve_open: boolean;
  };
  feeders: Array<{
    id: number;
    frequency: number;
    running: boolean;
  }>;
  deagglomerators: Array<{
    id: number;
    duty_cycle: number;
    frequency: number;
  }>;
  shutter: {
    engaged: boolean;
  };
}

const COMM_SERVICE = 'http://localhost:8003';

export default function EquipmentControl() {
  const [equipmentState, setEquipmentState] = useState<EquipmentState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current equipment state
  const fetchEquipmentState = useCallback(async () => {
    try {
      const response = await fetch(`${COMM_SERVICE}/equipment/state`);
      if (!response.ok) throw new Error('Failed to fetch equipment state');
      const data = await response.json();
      setEquipmentState(data);
      setError(null);
    } catch (err) {
      console.error('Equipment state error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch equipment state');
    } finally {
      setLoading(false);
    }
  }, []);

  // Control functions
  const controlGasFlow = async (type: 'main' | 'feeder', value: number) => {
    try {
      const response = await fetch(`${COMM_SERVICE}/equipment/gas/${type}/flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow_rate: value })
      });
      if (!response.ok) throw new Error(`Failed to set ${type} flow`);
      fetchEquipmentState(); // Refresh state
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to control gas flow');
    }
  };

  const controlFeeder = async (id: number, action: 'start' | 'stop' | 'frequency', value?: number) => {
    try {
      let url = `${COMM_SERVICE}/equipment/feeder/${id}/`;
      let body = {};
      
      if (action === 'frequency') {
        url += 'frequency';
        body = { frequency: value };
      } else {
        url += action;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) throw new Error(`Failed to control feeder ${id}`);
      fetchEquipmentState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to control feeder');
    }
  };

  const controlDeagglomerator = async (id: number, speed: number) => {
    try {
      const response = await fetch(`${COMM_SERVICE}/equipment/deagg/${id}/speed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed })
      });
      if (!response.ok) throw new Error(`Failed to control deagglomerator ${id}`);
      fetchEquipmentState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to control deagglomerator');
    }
  };

  const controlVacuum = async (component: 'vent' | 'mech' | 'booster' | 'gate', action: 'open' | 'close' | 'start' | 'stop') => {
    try {
      const response = await fetch(`${COMM_SERVICE}/equipment/vacuum/${component}/${action}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error(`Failed to control vacuum ${component}`);
      fetchEquipmentState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to control vacuum');
    }
  };

  // Initialize and set up polling
  useEffect(() => {
    fetchEquipmentState();
    const interval = setInterval(fetchEquipmentState, 1000); // Poll every second
    return () => clearInterval(interval);
  }, [fetchEquipmentState]);

  if (loading) {
    return <Typography>Loading equipment state...</Typography>;
  }

  if (!equipmentState) {
    return <Alert severity="error">Failed to load equipment state</Alert>;
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Equipment Control & Monitoring</Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Gas Control */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Gas Control</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography>Main Flow: {equipmentState.gas.main_flow} SLPM</Typography>
                  <Slider
                    value={equipmentState.gas.main_flow}
                    onChange={(_, value) => controlGasFlow('main', value as number)}
                    min={0}
                    max={100}
                    step={1}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography>Feeder Flow: {equipmentState.gas.feeder_flow} SLPM</Typography>
                  <Slider
                    value={equipmentState.gas.feeder_flow}
                    onChange={(_, value) => controlGasFlow('feeder', value as number)}
                    min={0}
                    max={50}
                    step={1}
                    marks
                    valueLabelDisplay="auto"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography>Pressures:</Typography>
                  <Typography variant="body2">Main: {equipmentState.gas.main_pressure} PSI</Typography>
                  <Typography variant="body2">Feeder: {equipmentState.gas.feeder_pressure} PSI</Typography>
                  <Typography variant="body2">Nozzle: {equipmentState.gas.nozzle_pressure} PSI</Typography>
                  <Typography variant="body2">Regulator: {equipmentState.gas.regulator_pressure} PSI</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Vacuum Control */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Vacuum Control</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography>Chamber Pressure: {equipmentState.vacuum.chamber_pressure} Torr</Typography>
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={equipmentState.vacuum.mech_pump_running}
                        onChange={() => controlVacuum('mech', equipmentState.vacuum.mech_pump_running ? 'stop' : 'start')}
                      />
                    }
                    label="Mechanical Pump"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={equipmentState.vacuum.booster_pump_running}
                        onChange={() => controlVacuum('booster', equipmentState.vacuum.booster_pump_running ? 'stop' : 'start')}
                      />
                    }
                    label="Booster Pump"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={equipmentState.vacuum.vent_valve_open}
                        onChange={() => controlVacuum('vent', equipmentState.vacuum.vent_valve_open ? 'close' : 'open')}
                      />
                    }
                    label="Vent Valve"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={equipmentState.vacuum.gate_valve_open}
                        onChange={() => controlVacuum('gate', equipmentState.vacuum.gate_valve_open ? 'close' : 'open')}
                      />
                    }
                    label="Gate Valve"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Feeders Control */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Feeders Control</Typography>
              {equipmentState.feeders.map((feeder) => (
                <Box key={feeder.id} sx={{ mb: 2 }}>
                  <Typography>Feeder {feeder.id}</Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={8}>
                      <Typography>Frequency: {feeder.frequency} Hz</Typography>
                      <Slider
                        value={feeder.frequency}
                        onChange={(_, value) => controlFeeder(feeder.id, 'frequency', value as number)}
                        min={0}
                        max={1000}
                        step={10}
                        valueLabelDisplay="auto"
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <Button
                        variant="contained"
                        color={feeder.running ? "error" : "success"}
                        onClick={() => controlFeeder(feeder.id, feeder.running ? 'stop' : 'start')}
                      >
                        {feeder.running ? 'Stop' : 'Start'}
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Deagglomerators Control */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Deagglomerators Control</Typography>
              {equipmentState.deagglomerators.map((deagg) => (
                <Box key={deagg.id} sx={{ mb: 2 }}>
                  <Typography>Deagglomerator {deagg.id}</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography>Duty Cycle: {deagg.duty_cycle}%</Typography>
                      <Slider
                        value={deagg.duty_cycle}
                        onChange={(_, value) => controlDeagglomerator(deagg.id, value as number)}
                        min={0}
                        max={100}
                        step={5}
                        valueLabelDisplay="auto"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography>Frequency: {deagg.frequency} Hz</Typography>
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Shutter Control */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Shutter Control</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={equipmentState.shutter.engaged}
                    onChange={() => {/* Add shutter control */}}
                  />
                }
                label="Shutter Engaged"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 