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
  Alert,
  CircularProgress
} from '@mui/material';
import { useWebSocket } from '../context/WebSocketContext';

const COMM_SERVICE = 'http://localhost:8003';

function getDeaggSpeed(dutyCycle: number): string {
  if (dutyCycle >= 35) return 'High';
  if (dutyCycle >= 30) return 'Med';
  if (dutyCycle >= 25) return 'Low';
  return 'Off';
}

export default function EquipmentControl() {
  const { state, connected, error } = useWebSocket();
  console.log('EquipmentControl render:', { state, connected, error });

  const controlGas = async (type: 'main' | 'feeder', action: 'valve' | 'flow', value: boolean | number) => {
    if (!connected) return;
    try {
      if (action === 'flow') {
        const response = await fetch(`${COMM_SERVICE}/equipment/gas/${type}/flow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            tag: `gas_control.${type}_flow.setpoint`,
            value: Number(value)
          })
        });
        if (!response.ok) {
          throw new Error(`Failed to set ${type} gas flow: ${response.status}`);
        }
      } else {
        const response = await fetch(`${COMM_SERVICE}/equipment/gas/${type}/valve`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            tag: `valve_control.${type}_gas`,
            value: Boolean(value)
          })
        });
        if (!response.ok) {
          throw new Error(`Failed to control ${type} gas valve: ${response.status}`);
        }
      }
    } catch (err) {
      console.error(`Failed to control ${type} gas ${action}:`, err);
    }
  };

  const controlVacuum = async (component: 'gate' | 'mech' | 'booster' | 'vent', action: boolean) => {
    if (!connected) return;
    try {
      if (component === 'gate') {
        const response = await fetch(`${COMM_SERVICE}/equipment/vacuum/gate`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            tag: 'valve_control.gate_valve.open',
            value: action
          })
        });
        if (!response.ok) {
          throw new Error(`Failed to control gate valve: ${response.status}`);
        }
      } else {
        const pumpType = component === 'mech' ? 'mechanical' : 'booster';
        const response = await fetch(`${COMM_SERVICE}/equipment/vacuum/${pumpType}_pump/state`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            tag: `vacuum_control.${pumpType}_pump.${action ? 'start' : 'stop'}`,
            value: true
          })
        });
        if (!response.ok) {
          throw new Error(`Failed to control ${pumpType} pump: ${response.status}`);
        }
      }
    } catch (err) {
      console.error(`Failed to control ${component}:`, err);
    }
  };

  const controlFeeder = async (id: 1 | 2, action: 'start' | 'stop' | 'frequency', value?: number) => {
    if (!connected) return;
    try {
      if (action === 'frequency') {
        const response = await fetch(`${COMM_SERVICE}/equipment/feeder/${id}/frequency`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            tag: `gas_control.hardware_sets.set${id}.feeder.frequency`,
            value: Number(value)
          })
        });
        if (!response.ok) {
          throw new Error(`Failed to set feeder ${id} frequency: ${response.status}`);
        }
      } else {
        const response = await fetch(`${COMM_SERVICE}/equipment/feeder/${id}/state`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            tag: `gas_control.hardware_sets.set${id}.feeder.running`,
            value: action === 'start'
          })
        });
        if (!response.ok) {
          throw new Error(`Failed to ${action} feeder ${id}: ${response.status}`);
        }
      }
    } catch (err) {
      console.error(`Failed to control feeder ${id}:`, err);
    }
  };

  const controlNozzle = async (action: 'shutter' | 'select', value: boolean | number) => {
    if (!connected) return;
    try {
      if (action === 'shutter') {
        const response = await fetch(`${COMM_SERVICE}/equipment/nozzle/shutter/state`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            tag: 'relay_control.shutter',
            value: Boolean(value)
          })
        });
        if (!response.ok) {
          throw new Error(`Failed to control shutter: ${response.status}`);
        }
      } else {
        const response = await fetch(`${COMM_SERVICE}/equipment/nozzle/select`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            tag: 'gas_control.hardware_sets.nozzle_select',
            value: Number(value) === 2
          })
        });
        if (!response.ok) {
          throw new Error(`Failed to select nozzle: ${response.status}`);
        }
      }
    } catch (err) {
      console.error('Failed to control nozzle:', err);
    }
  };

  const controlDeagglomerator = async (id: 1 | 2, param: 'duty_cycle' | 'frequency', value: number) => {
    if (!connected) return;
    try {
      const response = await fetch(`${COMM_SERVICE}/equipment/deagg/${id}/settings`, {
        method: 'POST',  // POST for setpoints
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tag: `gas_control.hardware_sets.set${id}.deagglomerator.${param}`,
          value: Number(value)
        })
      });
      if (!response.ok) {
        throw new Error(`Failed to set deagglomerator ${id} ${param}: ${response.status}`);
      }
    } catch (err) {
      console.error(`Failed to control deagglomerator ${id}:`, err);
    }
  };

  if (!state) {
    console.log('No state available');
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!state.equipment?.gas || !state.equipment?.vacuum || !state.equipment?.feeder1 || 
      !state.equipment?.feeder2 || !state.equipment?.nozzle || !state.equipment?.pressures) {
    console.error('Invalid state structure:', state);
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Invalid system state received
        </Alert>
      </Box>
    );
  }

  const { equipment, motion, safety } = state;

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

      {!safety.hardware.plc_connected && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          PLC not connected
        </Alert>
      )}

      {safety.safety.emergency_stop && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Emergency Stop Active
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Top Row: Gas, Vacuum, and Nozzle Controls */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Gas Control</Typography>
              
              <Box mt={2}>
                <Typography>Main Gas</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={equipment.gas.main_valve}
                      onChange={(_, checked) => controlGas('main', 'valve', checked)}
                      disabled={!connected || !safety.hardware.plc_connected}
                    />
                  }
                  label="Main Valve"
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography>Setpoint: {equipment.gas.main_flow.toFixed(1)} SLPM</Typography>
                  <Typography>Flow: {equipment.gas.main_flow_measured?.toFixed(1) || '0.0'} SLPM</Typography>
                </Box>
                <Slider
                  value={equipment.gas.main_flow}
                  onChange={(_, value) => controlGas('main', 'flow', value as number)}
                  min={0}
                  max={100}
                  marks={[
                    { value: 0, label: '0' },
                    { value: 25, label: '25' },
                    { value: 50, label: '50' },
                    { value: 75, label: '75' },
                    { value: 100, label: '100' }
                  ]}
                  disabled={!connected || !equipment.gas.main_valve || !safety.hardware.plc_connected}
                />
              </Box>

              <Box mt={2}>
                <Typography>Feeder Gas</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={equipment.gas.feeder_valve}
                      onChange={(_, checked) => controlGas('feeder', 'valve', checked)}
                      disabled={!connected || !safety.hardware.plc_connected}
                    />
                  }
                  label="Feeder Valve"
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography>Setpoint: {equipment.gas.feeder_flow.toFixed(1)} SLPM</Typography>
                  <Typography>Flow: {equipment.gas.feeder_flow_measured?.toFixed(1) || '0.0'} SLPM</Typography>
                </Box>
                <Slider
                  value={equipment.gas.feeder_flow}
                  onChange={(_, value) => controlGas('feeder', 'flow', value as number)}
                  min={0}
                  max={10}
                  marks={[
                    { value: 0, label: '0' },
                    { value: 2.5, label: '2.5' },
                    { value: 5, label: '5' },
                    { value: 7.5, label: '7.5' },
                    { value: 10, label: '10' }
                  ]}
                  disabled={!connected || !equipment.gas.feeder_valve || !safety.hardware.plc_connected}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Vacuum Control</Typography>
              <Typography>Chamber Pressure: {equipment.pressures.chamber.toFixed(2)} Torr</Typography>
              
              <Grid container spacing={2} mt={1}>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={equipment.vacuum.mech_pump}
                        onChange={(_, checked) => controlVacuum('mech', checked)}
                        disabled={!connected || !safety.hardware.plc_connected}
                      />
                    }
                    label="Mechanical Pump"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={equipment.vacuum.booster_pump}
                        onChange={(_, checked) => controlVacuum('booster', checked)}
                        disabled={!connected || !safety.hardware.plc_connected}
                      />
                    }
                    label="Booster Pump"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={equipment.vacuum.gate_valve}
                        onChange={(_, checked) => controlVacuum('gate', checked)}
                        disabled={!connected || !safety.hardware.plc_connected}
                      />
                    }
                    label="Gate Valve"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={equipment.vacuum.vent_valve}
                        onChange={(_, checked) => controlVacuum('vent', checked)}
                        disabled={!connected || !safety.hardware.plc_connected}
                      />
                    }
                    label="Vent Valve"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Nozzle Control</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography>Active Nozzle: {equipment.nozzle.active_nozzle}</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={equipment.nozzle.active_nozzle === 2}
                        onChange={(_, checked) => controlNozzle('select', checked ? 2 : 1)}
                        disabled={!connected || !safety.hardware.plc_connected}
                      />
                    }
                    label="Use Nozzle 2"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography>Pressure: {equipment.pressures.nozzle.toFixed(1)} Torr</Typography>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={equipment.nozzle.shutter_open}
                        onChange={(_, checked) => controlNozzle('shutter', checked)}
                        disabled={!connected || !safety.hardware.plc_connected}
                      />
                    }
                    label="Shutter"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Feeders Control - Full Width */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Feeders Control</Typography>
              <Grid container spacing={6}>
                {[1, 2].map((index) => {
                  const feeder = index === 1 ? equipment.feeder1 : equipment.feeder2;
                  const deagg = index === 1 ? equipment.deagg1 : equipment.deagg2;
                  return (
                    <Grid item xs={12} md={6} key={index}>
                      <Box sx={{ px: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>Feeder {index}</Typography>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={8}>
                            <Typography>Frequency: {feeder.frequency || 200} Hz</Typography>
                            <Slider
                              value={feeder.frequency || 200}
                              onChange={(_, value) => controlFeeder(index as 1 | 2, 'frequency', value as number)}
                              min={200}
                              max={1200}
                              step={200}
                              marks={[
                                { value: 200, label: '200' },
                                { value: 400, label: '400' },
                                { value: 600, label: '600' },
                                { value: 800, label: '800' },
                                { value: 1000, label: '1000' },
                                { value: 1200, label: '1200' }
                              ]}
                              disabled={!connected || !safety.hardware.plc_connected}
                            />
                          </Grid>
                          <Grid item xs={4}>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={feeder.running}
                                  onChange={(_, checked) => controlFeeder(index as 1 | 2, checked ? 'start' : 'stop')}
                                  disabled={!connected || !safety.hardware.plc_connected}
                                />
                              }
                              label={feeder.running ? 'Running' : 'Stopped'}
                            />
                          </Grid>
                        </Grid>

                        <Typography variant="subtitle2" sx={{ mt: 2 }}>Deagglomerator {index}</Typography>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography>Speed: {getDeaggSpeed(deagg.duty_cycle)}</Typography>
                            </Box>
                            <Slider
                              value={deagg.duty_cycle}
                              onChange={(_, value) => controlDeagglomerator(index as 1 | 2, 'duty_cycle', value as number)}
                              step={null}
                              marks={[
                                { value: 20, label: 'Off' },
                                { value: 25, label: 'Low' },
                                { value: 30, label: 'Med' },
                                { value: 35, label: 'High' }
                              ]}
                              min={20}
                              max={35}
                              disabled={!connected || !safety.hardware.plc_connected}
                              scale={(value) => 55 - value}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Motion Status - Full Width */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Motion Status</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography color={motion.status.module_ready ? 'success.main' : 'error.main'}>
                    Motion Controller: {motion.status.module_ready ? 'Ready' : 'Not Ready'}
                  </Typography>
                </Grid>
                {['x', 'y', 'z'].map((axis) => (
                  <Grid item xs={12} md={4} key={axis}>
                    <Typography variant="subtitle1">{axis.toUpperCase()} Axis</Typography>
                    <Typography>Position: {motion.position[axis as 'x' | 'y' | 'z'].toFixed(3)} mm</Typography>
                    <Typography>
                      Status: {motion.status[`${axis}_axis` as 'x_axis' | 'y_axis' | 'z_axis'].moving ? 'Moving' : 'Stopped'}
                    </Typography>
                    <Typography>
                      Homed: {motion.status[`${axis}_axis` as 'x_axis' | 'y_axis' | 'z_axis'].homed ? 'Yes' : 'No'}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 