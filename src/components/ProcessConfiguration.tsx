import React, { useState } from 'react';
import { 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  Paper
} from '@mui/material';

interface ProcessParams {
  nozzleDiameter: number;
  gasFlow: number;
  powderFeedRate: number;
  substrateSpeed: number;
}

export default function ProcessConfiguration() {
  const [params, setParams] = useState<ProcessParams>({
    nozzleDiameter: 0,
    gasFlow: 0,
    powderFeedRate: 0,
    substrateSpeed: 0
  });

  const handleParamChange = (param: keyof ProcessParams) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setParams({ ...params, [param]: Number(event.target.value) });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    console.log('Process parameters:', params);
    // Here you would typically send the params to your backend API
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Process Configuration
      </Typography>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Nozzle Diameter (mm)"
              type="number"
              value={params.nozzleDiameter}
              onChange={handleParamChange('nozzleDiameter')}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Gas Flow (L/min)"
              type="number"
              value={params.gasFlow}
              onChange={handleParamChange('gasFlow')}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Powder Feed Rate (g/min)"
              type="number"
              value={params.powderFeedRate}
              onChange={handleParamChange('powderFeedRate')}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Substrate Speed (mm/s)"
              type="number"
              value={params.substrateSpeed}
              onChange={handleParamChange('substrateSpeed')}
              InputProps={{ inputProps: { min: 0 } }}
            />
          </Grid>
          <Grid item xs={12}>
            <Button type="submit" variant="contained" color="primary">
              Save Configuration
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
}

