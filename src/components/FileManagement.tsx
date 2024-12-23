import React, { useState } from 'react';
import { 
  Typography, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

interface File {
  id: string;
  name: string;
  type: 'nozzle' | 'powder' | 'raster' | 'gas' | 'sequence';
}

export default function FileManagement() {
  const [files, setFiles] = useState<File[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<File['type']>('nozzle');

  const handleAddFile = () => {
    if (newFileName && newFileType) {
      setFiles([...files, { id: Date.now().toString(), name: newFileName, type: newFileType }]);
      setNewFileName('');
      setNewFileType('nozzle');
      setOpenDialog(false);
    }
  };

  const handleDeleteFile = (id: string) => {
    setFiles(files.filter(file => file.id !== id));
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        File Management
      </Typography>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
        Add New File
      </Button>
      <List>
        {files.map((file) => (
          <ListItem key={file.id}>
            <ListItemText primary={file.name} secondary={`Type: ${file.type}`} />
            <ListItemSecondaryAction>
              <IconButton edge="end" aria-label="edit">
                <EditIcon />
              </IconButton>
              <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteFile(file.id)}>
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Add New File</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="File Name"
            type="text"
            fullWidth
            variant="standard"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
          />
          <TextField
            select
            margin="dense"
            id="type"
            label="File Type"
            fullWidth
            variant="standard"
            value={newFileType}
            onChange={(e) => setNewFileType(e.target.value as File['type'])}
            SelectProps={{
              native: true,
            }}
          >
            <option value="nozzle">Nozzle</option>
            <option value="powder">Powder</option>
            <option value="raster">Raster</option>
            <option value="gas">Gas</option>
            <option value="sequence">Sequence</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleAddFile}>Add</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

