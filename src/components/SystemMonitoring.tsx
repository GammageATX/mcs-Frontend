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

const SERVICES = {
  ui: 'http://localhost:8000',
  config: 'http://localhost:8001',
  state: 'http://localhost:8002',
  communication: 'http://localhost:8003',
  process: 'http://localhost:8004',
  dataCollection: 'http://localhost:8005',
  validation: 'http://localhost:8006'
};

const WS_BASE_URL = SERVICES.communication;

export default function SystemMonitoring() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [tagValues, setTagValues] = useState<Record<string, TagValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch system status from all services
  const fetchSystemStatus = useCallback(async () => {
    try {
      const serviceStatuses = await Promise.all(
        Object.entries(SERVICES).map(async ([name, url]) => {
          try {
            const response = await fetch(`${url}/health`);
            const data = await response.json();
            return { name, ...data };
          } catch (err) {
            return { 
              name, 
              status: 'error', 
              error: err instanceof Error ? err.message : 'Connection failed',
              is_running: false 
            };
          }
        })
      );

      const allServices = serviceStatuses.reduce((acc, service) => {
        acc[service.name] = service;
        return acc;
      }, {} as Record<string, any>);

      setSystemStatus(allServices);
      setError(null);
    } catch (err) {
      console.error('System status error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to services');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch tag values from communication service
  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch(`${SERVICES.communication}/communication/tags`);
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
        {/* System Status Cards */}
        {systemStatus && Object.entries(systemStatus).map(([serviceName, status]) => (
          <Grid item xs={12} md={6} key={serviceName}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} Service
                </Typography>
                <Typography>Status: {status.status}</Typography>
                {status.version && <Typography>Version: {status.version}</Typography>}
                {status.uptime && (
                  <Typography>
                    Uptime: {Math.floor(status.uptime / 3600)}h {Math.floor((status.uptime % 3600) / 60)}m
                  </Typography>
                )}
                {status.memory_usage?.used_percent && (
                  <Typography>Memory Usage: {status.memory_usage.used_percent}%</Typography>
                )}
                {status.error && (
                  <Typography color="error">Error: {status.error}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}

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