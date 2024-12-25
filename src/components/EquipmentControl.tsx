import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  Slider,
  Alert
} from '@mui/material';
import { useWebSocket } from '../context/WebSocketContext';

const COMM_SERVICE = 'http://localhost:8003';

export default function EquipmentControl() {
  const { state, connected, error } = useWebSocket();

  const controlGas = async (type: 'main' | 'feeder', action: 'valve' | 'flow', value: boolean | number) => {
    if (!connected) return;
    try {
      if (action === 'flow') {
        await fetch(`${COMM_SERVICE}/equipment/gas/${type}_flow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value })
        });
      } else {
        await fetch(`${COMM_SERVICE}/equipment/gas/${type}_valve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ open: value })
        });
      }
    } catch (err) {
      console.error(`Failed to control ${type} gas ${action}:`, err);
    }
  };

  const controlVacuum = async (component: 'gate' | 'mech' | 'booster', action: boolean) => {
    if (!connected) return;
    try {
      const endpoint = component === 'gate' ? 'gate_valve' : component === 'mech' ? 'mechanical_pump' : 'booster_pump';
      await fetch(`${COMM_SERVICE}/equipment/vacuum/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ on: action })
      });
    } catch (err) {
      console.error(`Failed to control ${component}:`, err);
    }
  };

  const controlFeeder = async (id: 1 | 2, action: 'start' | 'stop' | 'frequency', value?: number) => {
    if (!connected) return;
    try {
      if (action === 'frequency') {
        await fetch(`${COMM_SERVICE}/equipment/feeder${id}/frequency`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value })
        });
      } else {
        await fetch(`${COMM_SERVICE}/equipment/feeder${id}/${action === 'start' ? 'on' : 'off'}`, {
          method: 'POST'
        });
      }
    } catch (err) {
      console.error(`Failed to control feeder ${id}:`, err);
    }
  };

  const controlNozzle = async (action: 'shutter', value: boolean) => {
    if (!connected) return;
    try {
      await fetch(`${COMM_SERVICE}/equipment/nozzle/shutter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ open: value })
      });
    } catch (err) {
      console.error('Failed to control nozzle:', err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5">
          Equipment Control
        </Typography>
        <Typography 
          component="span" 
          sx={{ 
            color: connected ? 'success.main' : 'error.main',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          ● {connected ? 'Connected' : 'Disconnected'}
        </Typography>
      </Box>

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
              
              <Box mt={2}>
                <Typography>Main Gas</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={state.gas.main_valve}
                      onChange={(_, checked) => controlGas('main', 'valve', checked)}
                      disabled={!connected}
                    />
                  }
                  label="Main Valve"
                />
                <Typography>Flow: {state.gas.main_flow} SLPM</Typography>
                <Slider
                  value={state.gas.main_flow}
                  onChange={(_, value) => controlGas('main', 'flow', value as number)}
                  min={0}
                  max={100}
                  disabled={!connected || !state.gas.main_valve}
                />
              </Box>

              <Box mt={2}>
                <Typography>Feeder Gas</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={state.gas.feeder_valve}
                      onChange={(_, checked) => controlGas('feeder', 'valve', checked)}
                      disabled={!connected}
                    />
                  }
                  label="Feeder Valve"
                />
                <Typography>Flow: {state.gas.feeder_flow} SLPM</Typography>
                <Slider
                  value={state.gas.feeder_flow}
                  onChange={(_, value) => controlGas('feeder', 'flow', value as number)}
                  min={0}
                  max={50}
                  disabled={!connected || !state.gas.feeder_valve}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Vacuum Control */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Vacuum Control</Typography>
              <Typography>Chamber Pressure: {state.vacuum.chamber_pressure.toFixed(2)} Torr</Typography>
              
              <Grid container spacing={2} mt={1}>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={state.vacuum.mech_pump}
                        onChange={(_, checked) => controlVacuum('mech', checked)}
                        disabled={!connected}
                      />
                    }
                    label="Mechanical Pump"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={state.vacuum.booster_pump}
                        onChange={(_, checked) => controlVacuum('booster', checked)}
                        disabled={!connected}
                      />
                    }
                    label="Booster Pump"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={state.vacuum.gate_valve}
                        onChange={(_, checked) => controlVacuum('gate', checked)}
                        disabled={!connected}
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
              
              {[state.feeder1, state.feeder2].map((feeder, index) => (
                <Box key={index} mt={index > 0 ? 2 : 0}>
                  <Typography>Feeder {index + 1}</Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={8}>
                      <Typography>Frequency: {feeder.frequency} Hz</Typography>
                      <Slider
                        value={feeder.frequency}
                        onChange={(_, value) => controlFeeder((index + 1) as 1 | 2, 'frequency', value as number)}
                        min={0}
                        max={1000}
                        disabled={!connected}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={feeder.running}
                            onChange={(_, checked) => controlFeeder((index + 1) as 1 | 2, checked ? 'start' : 'stop')}
                            disabled={!connected}
                          />
                        }
                        label={feeder.running ? 'Running' : 'Stopped'}
                      />
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Nozzle Control */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Nozzle Control</Typography>
              <Typography>Active Nozzle: {state.nozzle.active_nozzle}</Typography>
              <Typography>Pressure: {state.nozzle.pressure.toFixed(1)} PSI</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={state.nozzle.shutter_open}
                    onChange={(_, checked) => controlNozzle('shutter', checked)}
                    disabled={!connected}
                  />
                }
                label="Shutter"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 