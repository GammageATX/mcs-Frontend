import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  useTheme,
  Alert,
  CircularProgress,
  Divider,
  Button
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';

const MONITORING_SERVICE = 'http://localhost:8000';

interface ComponentStatus {
  status: 'ok' | 'error';
  error?: string;
}

interface ServiceComponents {
  tag_mapping?: ComponentStatus;
  tag_cache?: ComponentStatus;
  equipment?: ComponentStatus;
  motion?: ComponentStatus;
  [key: string]: ComponentStatus | undefined;
}

interface ServiceHealth {
  status: 'ok' | 'error';
  service: string;
  version: string;
  is_running: boolean;
  uptime: number;
  mode?: 'mock' | 'hardware';
  components?: ServiceComponents;
  error?: string;
  timestamp?: string;
}

interface ServicesStatus {
  [key: string]: ServiceHealth;
}

const formatUptime = (seconds: number): string => {
  if (!seconds || seconds < 0) return 'Not available';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const formatServiceName = (name: string): string => {
  return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const getStatusColor = (status: string, theme: any) => {
  switch (status) {
    case 'ok':
      return {
        bg: theme.palette.success.light,
        border: theme.palette.success.main,
        chip: theme.palette.success.main
      };
    case 'error':
      return {
        bg: theme.palette.error.light,
        border: theme.palette.error.main,
        chip: theme.palette.error.main
      };
    default:
      return {
        bg: theme.palette.grey[100],
        border: theme.palette.grey[300],
        chip: theme.palette.grey[500]
      };
  }
};

export default function SystemMonitoring() {
  const [services, setServices] = useState<ServicesStatus>({});
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  const fetchServices = async () => {
    try {
      const response = await fetch(`${MONITORING_SERVICE}/monitoring/services/status`);
      if (!response.ok) {
        throw new Error(`Failed to fetch services status: ${response.status}`);
      }
      const data = await response.json();
      setServices(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch services status');
    }
  };

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 5000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          icon={<ErrorIcon />}
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
        <Button 
          variant="contained" 
          onClick={fetchServices}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  if (Object.keys(services).length === 0) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '50vh',
        gap: 2
      }}>
        <CircularProgress />
        <Typography color="text.secondary">
          Loading service status...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          System Services Status
        </Typography>
        <Button 
          variant="outlined" 
          onClick={fetchServices}
          startIcon={<RefreshIcon />}
        >
          Refresh
        </Button>
      </Box>
      
      <Grid container spacing={3}>
        {Object.entries(services).map(([name, service]) => {
          const colors = getStatusColor(service.status, theme);
          
          return (
            <Grid item xs={12} md={6} lg={4} key={name}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  border: `2px solid ${colors.border}`,
                  bgcolor: colors.bg,
                  height: '100%'
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 2
                }}>
                  <Typography variant="h6" component="h3">
                    {formatServiceName(name)}
                  </Typography>
                  <Chip
                    label={service.status.toUpperCase()}
                    sx={{
                      bgcolor: colors.chip,
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                    size="small"
                  />
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Version:</strong> {service.version || 'Not available'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Running:</strong> {service.is_running ? 'Yes' : 'No'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Uptime:</strong> {formatUptime(service.uptime)}
                  </Typography>
                  {service.mode && (
                    <Typography variant="body2">
                      <strong>Mode:</strong> {service.mode}
                    </Typography>
                  )}
                  {service.error && (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: theme.palette.error.main,
                        mt: 1
                      }}
                    >
                      <strong>Error:</strong> {service.error}
                    </Typography>
                  )}
                  
                  {service.components && Object.keys(service.components).length > 0 && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Components
                      </Typography>
                      {Object.entries(service.components).map(([compName, comp]) => (
                        <Box key={compName} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2">
                            {formatServiceName(compName)}
                          </Typography>
                          {comp && (
                            <Chip
                              label={comp.status.toUpperCase()}
                              size="small"
                              sx={{
                                bgcolor: getStatusColor(comp.status, theme).chip,
                                color: 'white',
                                fontSize: '0.7rem'
                              }}
                            />
                          )}
                        </Box>
                      ))}
                    </>
                  )}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
} 