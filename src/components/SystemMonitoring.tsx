import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Stack
} from '@mui/material';

interface TagValue {
  value: number | string | boolean;
  timestamp: string;
  detail?: string;
}

interface SystemStatus {
  status: 'ok' | 'error';
  service_name: string;
  version: string;
  is_running: boolean;
  uptime: number;
  memory_usage: Record<string, number>;
  error?: string;
  timestamp: string;
  detail?: string;
}

const API_BASE_URL = 'http://localhost:8000';
const WS_BASE_URL = 'ws://localhost:8000';

export default function SystemMonitoring() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [tagValues, setTagValues] = useState<Record<string, TagValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch system status
  const fetchSystemStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to fetch system status');
      }
      
      setSystemStatus(data);
      setError(null);
    } catch (err) {
      console.error('System status error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch tag values
  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/communication/tags`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to fetch tags');
      }
      
      setTagValues(data);
      setError(null);
    } catch (err) {
      console.error('Tag fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tag values');
    }
  }, []);

  // WebSocket setup
  const setupWebSocket = useCallback(() => {
    const ws = new WebSocket(`${WS_BASE_URL}/ws/communication/tags`);
    console.log('Attempting WebSocket connection...');

    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.detail) {
          console.warn('WebSocket message warning:', data.detail);
          return;
        }
        setTagValues(current => ({...current, ...data}));
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError('WebSocket connection error - Check if the backend server is running');
      setWsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
      // Attempt to reconnect after 5 seconds
      setTimeout(setupWebSocket, 5000);
    };

    return ws;
  }, []);

  // Initialize data fetching
  useEffect(() => {
    fetchSystemStatus();
    fetchTags();
    const statusInterval = setInterval(fetchSystemStatus, 5000);
    
    return () => clearInterval(statusInterval);
  }, [fetchSystemStatus, fetchTags]);

  // Initialize WebSocket
  useEffect(() => {
    const ws = setupWebSocket();
    return () => {
      ws.close();
    };
  }, [setupWebSocket]);

  const handleRetryConnection = () => {
    setIsLoading(true);
    fetchSystemStatus();
    fetchTags();
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <Typography variant="h5">
          System Monitoring
        </Typography>
        {wsConnected ? (
          <Typography component="span" color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
            ● Live
          </Typography>
        ) : (
          <Typography component="span" color="error.main" sx={{ display: 'flex', alignItems: 'center' }}>
            ● Disconnected
          </Typography>
        )}
        <Button 
          variant="outlined" 
          onClick={handleRetryConnection}
          size="small"
        >
          Retry Connection
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* System Status Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              {systemStatus ? (
                <>
                  <Typography>Status: {systemStatus.status}</Typography>
                  <Typography>Version: {systemStatus.version}</Typography>
                  <Typography>Uptime: {Math.floor(systemStatus.uptime / 3600)}h {Math.floor((systemStatus.uptime % 3600) / 60)}m</Typography>
                  <Typography>Memory Usage: {systemStatus.memory_usage.used_percent}%</Typography>
                </>
              ) : (
                <Typography color="error">Unable to fetch system status</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Real-time Tags Table */}
        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tag Name</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Last Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(tagValues).length > 0 ? (
                  Object.entries(tagValues).map(([tagName, { value, timestamp }]) => (
                    <TableRow key={tagName}>
                      <TableCell>{tagName}</TableCell>
                      <TableCell>{value.toString()}</TableCell>
                      <TableCell>{new Date(timestamp).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      No tag values available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
} 