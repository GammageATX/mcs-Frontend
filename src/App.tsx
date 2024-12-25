import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppBar, Toolbar, Typography, Container } from '@mui/material';
import EquipmentControl from './components/EquipmentControl';
import { WebSocketProvider } from './context/WebSocketContext';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    }
  },
});

export default function App() {
  console.log('App rendering');
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <WebSocketProvider>
        <AppBar position="fixed">
          <Toolbar>
            <Typography variant="h6">
              Micro Cold Spray System
            </Typography>
          </Toolbar>
        </AppBar>
        <Container sx={{ mt: 10 }}>
          <EquipmentControl />
        </Container>
      </WebSocketProvider>
    </ThemeProvider>
  );
} 