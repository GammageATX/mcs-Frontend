import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Alert,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stepper,
  Step,
  StepLabel,
  IconButton
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import PauseIcon from '@mui/icons-material/Pause';
import { useWebSocket } from '../context/WebSocketContext';

const PROCESS_SERVICE = 'http://localhost:8004';

interface SequenceFile {
  id: string;
  name: string;
  description?: string;
  steps: any[];
  created_at: string;
  modified_at: string;
}

interface ExecutionStep {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  data?: any;
}

export default function SequenceExecution() {
  const { state, connected, error: wsError } = useWebSocket();
  const [sequences, setSequences] = useState<SequenceFile[]>([]);
  const [selectedSequence, setSelectedSequence] = useState<string>('');
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'running' | 'paused' | 'completed' | 'error'>('idle');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [collectedData, setCollectedData] = useState<Record<string, any>>({});

  // Fetch available sequence files
  useEffect(() => {
    const fetchSequences = async () => {
      try {
        console.log('Fetching sequences from:', `${PROCESS_SERVICE}/process/sequences`);
        const response = await fetch(`${PROCESS_SERVICE}/process/sequences`);
        console.log('Response status:', response.status);
        if (!response.ok) {
          throw new Error(`Failed to fetch sequences: ${response.status}`);
        }
        const data = await response.json();
        console.log('Received sequences:', data);
        setSequences(data);
      } catch (err) {
        console.error('Error fetching sequences:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch sequences');
      }
    };

    fetchSequences();
  }, []);

  // Handle WebSocket updates for execution status and data collection
  useEffect(() => {
    if (state?.execution) {
      const { status, current_step, steps, collected_data } = state.execution;
      setExecutionStatus(status);
      setCurrentStep(current_step);
      if (steps) setExecutionSteps(steps);
      if (collected_data) setCollectedData(collected_data);
    }
  }, [state]);

  const handleStartExecution = async () => {
    if (!selectedSequence || !connected) return;
    
    try {
      // First, get the full sequence details
      const sequenceResponse = await fetch(`${PROCESS_SERVICE}/process/sequences/${selectedSequence}`);
      if (!sequenceResponse.ok) {
        throw new Error('Failed to fetch sequence details');
      }
      const sequenceData = await sequenceResponse.json();
      
      // Start execution with the sequence data
      const response = await fetch(`${PROCESS_SERVICE}/process/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence: sequenceData })
      });
      
      if (!response.ok) {
        throw new Error('Failed to start sequence execution');
      }
      
      setError(null);
    } catch (err) {
      console.error('Error starting execution:', err);
      setError(err instanceof Error ? err.message : 'Failed to start execution');
    }
  };

  const handlePauseExecution = async () => {
    try {
      const response = await fetch(`${PROCESS_SERVICE}/process/pause`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to pause execution');
      }
    } catch (err) {
      console.error('Error pausing execution:', err);
      setError(err instanceof Error ? err.message : 'Failed to pause execution');
    }
  };

  const handleStopExecution = async () => {
    try {
      const response = await fetch(`${PROCESS_SERVICE}/process/stop`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop execution');
      }
    } catch (err) {
      console.error('Error stopping execution:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop execution');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Sequence Execution
      </Typography>

      {(error || wsError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || wsError}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Sequence Selection and Control */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Select Sequence</InputLabel>
                  <Select
                    value={selectedSequence}
                    onChange={(e) => setSelectedSequence(e.target.value)}
                    label="Select Sequence"
                    disabled={executionStatus === 'running' || executionStatus === 'paused'}
                  >
                    {sequences.map((seq) => (
                      <MenuItem key={seq.name} value={seq.name}>
                        {seq.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <IconButton
                  color="primary"
                  onClick={handleStartExecution}
                  disabled={!selectedSequence || executionStatus === 'running' || !connected}
                >
                  <PlayArrowIcon />
                </IconButton>

                <IconButton
                  color="warning"
                  onClick={handlePauseExecution}
                  disabled={executionStatus !== 'running' || !connected}
                >
                  <PauseIcon />
                </IconButton>

                <IconButton
                  color="error"
                  onClick={handleStopExecution}
                  disabled={executionStatus !== 'running' && executionStatus !== 'paused' || !connected}
                >
                  <StopIcon />
                </IconButton>

                <Typography
                  sx={{
                    color: executionStatus === 'running' ? 'success.main' :
                           executionStatus === 'paused' ? 'warning.main' :
                           executionStatus === 'error' ? 'error.main' :
                           'text.secondary'
                  }}
                >
                  Status: {executionStatus.charAt(0).toUpperCase() + executionStatus.slice(1)}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Execution Progress */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Execution Progress
              </Typography>
              <Stepper activeStep={currentStep} sx={{ mb: 3 }}>
                {executionSteps.map((step, index) => (
                  <Step key={index}>
                    <StepLabel error={step.status === 'error'}>
                      {step.name}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
              {executionStatus === 'running' && (
                <LinearProgress sx={{ mb: 2 }} />
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Data Collection */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Collected Data
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Parameter</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>Timestamp</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(collectedData).map(([key, { value, timestamp }]) => (
                      <TableRow key={key}>
                        <TableCell>{key}</TableCell>
                        <TableCell>{value.toString()}</TableCell>
                        <TableCell>{new Date(timestamp).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {Object.keys(collectedData).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          No data collected yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
} 