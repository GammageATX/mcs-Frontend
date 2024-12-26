import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';

const COMM_SERVICE = 'http://localhost:8003';

interface FileData {
  name: string;
  content: string;
  type: 'nozzle' | 'powder' | 'pattern' | 'sequence';
  created_at: string;
  modified_at: string;
}

export default function FileManagement() {
  const [files, setFiles] = useState<Record<string, FileData[]>>({
    nozzle: [],
    powder: [],
    pattern: [],
    sequence: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');
  const [editContent, setEditContent] = useState('');

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${COMM_SERVICE}/files`);
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      const data = await response.json();
      setFiles(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleCreateFile = async (type: string, content: string) => {
    try {
      const response = await fetch(`${COMM_SERVICE}/files/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create file');
      }
      
      await fetchFiles();
      setOpenDialog(false);
      setSelectedFile(null);
      setEditContent('');
    } catch (err) {
      console.error('Error creating file:', err);
      setError(err instanceof Error ? err.message : 'Failed to create file');
    }
  };

  const handleUpdateFile = async (type: string, name: string, content: string) => {
    try {
      const response = await fetch(`${COMM_SERVICE}/files/${type}/${name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update file');
      }
      
      await fetchFiles();
      setOpenDialog(false);
      setSelectedFile(null);
      setEditContent('');
    } catch (err) {
      console.error('Error updating file:', err);
      setError(err instanceof Error ? err.message : 'Failed to update file');
    }
  };

  const handleDeleteFile = async (type: string, name: string) => {
    try {
      const response = await fetch(`${COMM_SERVICE}/files/${type}/${name}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete file');
      }
      
      await fetchFiles();
    } catch (err) {
      console.error('Error deleting file:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  const handleEdit = (file: FileData, type: string) => {
    setSelectedFile(file);
    setSelectedType(type);
    setEditContent(file.content);
    setOpenDialog(true);
  };

  const handleAdd = (type: string) => {
    setSelectedFile(null);
    setSelectedType(type);
    setEditContent('');
    setOpenDialog(true);
  };

  const handleSave = () => {
    if (selectedFile) {
      handleUpdateFile(selectedType, selectedFile.name, editContent);
    } else {
      handleCreateFile(selectedType, editContent);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        File Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {Object.entries(files).map(([type, fileList]) => (
          <Grid item xs={12} md={6} key={type}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    {type.charAt(0).toUpperCase() + type.slice(1)} Files
                  </Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => handleAdd(type)}
                    variant="contained"
                    size="small"
                  >
                    Add
                  </Button>
                </Box>
                
                <List>
                  {fileList.map((file) => (
                    <ListItem key={file.name}>
                      <ListItemText
                        primary={file.name}
                        secondary={`Modified: ${new Date(file.modified_at).toLocaleString()}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          aria-label="edit"
                          onClick={() => handleEdit(file, type)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          aria-label="delete"
                          onClick={() => handleDeleteFile(type, file.name)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                  {fileList.length === 0 && (
                    <ListItem>
                      <ListItemText primary="No files" />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedFile ? `Edit ${selectedFile.name}` : `New ${selectedType} File`}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            rows={10}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            fullWidth
            variant="outlined"
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 