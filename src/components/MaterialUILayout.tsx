import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton,
  ListItemIcon, 
  ListItemText, 
  Container, 
  CssBaseline,
  Box,
  SvgIcon,
  SvgIconProps
} from '@mui/material';
import FileManagement from './FileManagement';
import ProcessConfiguration from './ProcessConfiguration';

const drawerWidth = 240;

// Custom icon components
const DescriptionIcon = (props: SvgIconProps) => (
  <SvgIcon {...props}>
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
  </SvgIcon>
);

const SettingsIcon = (props: SvgIconProps) => (
  <SvgIcon {...props}>
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </SvgIcon>
);

const PlayArrowIcon = (props: SvgIconProps) => (
  <SvgIcon {...props}>
    <path d="M8 5v14l11-7z" />
  </SvgIcon>
);

export default function MaterialUILayout() {
  const [selectedSection, setSelectedSection] = useState('File Management');

  const renderSection = () => {
    switch (selectedSection) {
      case 'File Management':
        return <FileManagement />;
      case 'Process Configuration':
        return <ProcessConfiguration />;
      case 'Execution':
        return <Typography>Execution section (to be implemented)</Typography>;
      default:
        return <Typography>Select a section</Typography>;
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Micro Cold Spray System
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <List>
          {['File Management', 'Process Configuration', 'Execution'].map((text) => (
            <ListItem key={text} disablePadding>
              <ListItemButton onClick={() => setSelectedSection(text)} selected={selectedSection === text}>
                <ListItemIcon>
                  {text === 'File Management' ? <DescriptionIcon /> : 
                   text === 'Process Configuration' ? <SettingsIcon /> : 
                   <PlayArrowIcon />}
                </ListItemIcon>
                <ListItemText primary={text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Container>
          {renderSection()}
        </Container>
      </Box>
    </Box>
  );
}

