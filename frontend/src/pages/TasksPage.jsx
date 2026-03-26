import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    maintenanceType: 'Preventative',
    frequencyInterval: 'Monthly',
    taskDescription: '',
    standardOperatingProcedureLink: '',
    priorityLevel: 'Medium',
    estimatedDowntimeHours: 0,
  });

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/tasks');
      setTasks(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (task = null) => {
    if (task) {
      setEditingId(task._id);
      setFormData({
        maintenanceType: task.maintenanceType,
        frequencyInterval: task.frequencyInterval,
        taskDescription: task.taskDescription,
        standardOperatingProcedureLink: task.standardOperatingProcedureLink || '',
        priorityLevel: task.priorityLevel,
        estimatedDowntimeHours: task.estimatedDowntimeHours,
      });
    } else {
      setEditingId(null);
      setFormData({
        maintenanceType: 'Preventative',
        frequencyInterval: 'Monthly',
        taskDescription: '',
        standardOperatingProcedureLink: '',
        priorityLevel: 'Medium',
        estimatedDowntimeHours: 0,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    try {
      if (!formData.taskDescription.trim()) {
        setError('Task description is required');
        return;
      }

      if (editingId) {
        await api.put(`/tasks/${editingId}`, formData);
      } else {
        await api.post('/tasks', formData);
      }

      handleCloseDialog();
      loadTasks();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save task');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await api.delete(`/tasks/${id}`);
        loadTasks();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete task');
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">Maintenance Tasks</Typography>
        {isAdmin && (
          <Button variant="contained" onClick={() => handleOpenDialog()}>
            + Add Task
          </Button>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><strong>Task Description</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              <TableCell><strong>Frequency</strong></TableCell>
              <TableCell><strong>Priority</strong></TableCell>
              <TableCell><strong>Downtime (hrs)</strong></TableCell>
              {isAdmin && <TableCell><strong>Actions</strong></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task._id}>
                <TableCell>{task.taskDescription}</TableCell>
                <TableCell>{task.maintenanceType}</TableCell>
                <TableCell>{task.frequencyInterval}</TableCell>
                <TableCell>{task.priorityLevel}</TableCell>
                <TableCell>{task.estimatedDowntimeHours}</TableCell>
                {isAdmin && (
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => handleOpenDialog(task)}
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleDelete(task._id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Task' : 'Add New Task'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Task Description"
              fullWidth
              multiline
              rows={3}
              value={formData.taskDescription}
              onChange={(e) =>
                setFormData({ ...formData, taskDescription: e.target.value })
              }
            />
            <FormControl fullWidth>
              <InputLabel>Maintenance Type</InputLabel>
              <Select
                value={formData.maintenanceType}
                onChange={(e) =>
                  setFormData({ ...formData, maintenanceType: e.target.value })
                }
                label="Maintenance Type"
              >
                <MenuItem value="Preventative">Preventative</MenuItem>
                <MenuItem value="Corrective">Corrective</MenuItem>
                <MenuItem value="Predictive">Predictive</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Frequency</InputLabel>
              <Select
                value={formData.frequencyInterval}
                onChange={(e) =>
                  setFormData({ ...formData, frequencyInterval: e.target.value })
                }
                label="Frequency"
              >
                <MenuItem value="Daily">Daily</MenuItem>
                <MenuItem value="Weekly">Weekly</MenuItem>
                <MenuItem value="Monthly">Monthly</MenuItem>
                <MenuItem value="Quarterly">Quarterly</MenuItem>
                <MenuItem value="Annual">Annual</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Priority Level</InputLabel>
              <Select
                value={formData.priorityLevel}
                onChange={(e) =>
                  setFormData({ ...formData, priorityLevel: e.target.value })
                }
                label="Priority Level"
              >
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Estimated Downtime (hours)"
              type="number"
              fullWidth
              value={formData.estimatedDowntimeHours}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  estimatedDowntimeHours: parseFloat(e.target.value) || 0,
                })
              }
            />
            <TextField
              label="SOP Link (optional)"
              fullWidth
              value={formData.standardOperatingProcedureLink}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  standardOperatingProcedureLink: e.target.value,
                })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
