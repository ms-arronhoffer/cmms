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
  Chip,
} from '@mui/material';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function MaintenancePage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [formData, setFormData] = useState({
    equipmentId: '',
    maintenanceTaskId: '',
    lastServiceDate: '',
    nextDueDate: '',
    status: 'Upcoming',
    estimatedCost: 0,
    actualCost: 0,
    assignedTo: '',
  });

  const isAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [schedulesRes, equipmentRes, tasksRes] = await Promise.all([
        api.get('/maintenance'),
        api.get('/equipment'),
        api.get('/tasks'),
      ]);
      setSchedules(schedulesRes.data);
      setEquipment(equipmentRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (schedule = null) => {
    if (schedule) {
      setEditingId(schedule._id);
      setFormData({
        equipmentId: schedule.equipmentId._id,
        maintenanceTaskId: schedule.maintenanceTaskId._id,
        lastServiceDate: schedule.lastServiceDate?.split('T')[0] || '',
        nextDueDate: schedule.nextDueDate?.split('T')[0] || '',
        status: schedule.status,
        estimatedCost: schedule.estimatedCost,
        actualCost: schedule.actualCost,
        assignedTo: schedule.assignedTo || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        equipmentId: '',
        maintenanceTaskId: '',
        lastServiceDate: new Date().toISOString().split('T')[0],
        nextDueDate: '',
        status: 'Upcoming',
        estimatedCost: 0,
        actualCost: 0,
        assignedTo: '',
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
      if (!formData.equipmentId || !formData.maintenanceTaskId || !formData.nextDueDate) {
        setError('Equipment, Task, and Due Date are required');
        return;
      }

      if (editingId) {
        await api.put(`/maintenance/${editingId}`, formData);
      } else {
        await api.post('/maintenance', formData);
      }

      handleCloseDialog();
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save schedule');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await api.delete(`/maintenance/${id}`);
        loadData();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete schedule');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'Overdue':
        return 'error';
      case 'InProgress':
        return 'warning';
      default:
        return 'default';
    }
  };

  const filteredSchedules = filterStatus
    ? schedules.filter((s) => s.status === filterStatus)
    : schedules;

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
        <Typography variant="h4">Maintenance Schedules</Typography>
        {isAdmin && (
          <Button variant="contained" onClick={() => handleOpenDialog()}>
            + Assign Task
          </Button>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label="Filter by Status"
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="Upcoming">Upcoming</MenuItem>
            <MenuItem value="Overdue">Overdue</MenuItem>
            <MenuItem value="InProgress">In Progress</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" sx={{ pt: 2 }}>
          Showing {filteredSchedules.length} of {schedules.length} schedules
        </Typography>
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><strong>Equipment</strong></TableCell>
              <TableCell><strong>Task</strong></TableCell>
              <TableCell><strong>Last Service</strong></TableCell>
              <TableCell><strong>Next Due Date</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Assigned To</strong></TableCell>
              <TableCell><strong>Est. Cost</strong></TableCell>
              {isAdmin && <TableCell><strong>Actions</strong></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSchedules.map((schedule) => (
              <TableRow key={schedule._id}>
                <TableCell>{schedule.equipmentId.assetName}</TableCell>
                <TableCell>{schedule.maintenanceTaskId.taskDescription}</TableCell>
                <TableCell>
                  {schedule.lastServiceDate
                    ? new Date(schedule.lastServiceDate).toLocaleDateString()
                    : 'N/A'}
                </TableCell>
                <TableCell>
                  {new Date(schedule.nextDueDate).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Chip
                    label={schedule.status}
                    color={getStatusColor(schedule.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{schedule.assignedTo || '-'}</TableCell>
                <TableCell>${schedule.estimatedCost}</TableCell>
                {isAdmin && (
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => handleOpenDialog(schedule)}
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleDelete(schedule._id)}
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
        <DialogTitle>{editingId ? 'Edit Schedule' : 'Assign Task to Equipment'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Equipment</InputLabel>
              <Select
                value={formData.equipmentId}
                onChange={(e) =>
                  setFormData({ ...formData, equipmentId: e.target.value })
                }
                label="Equipment"
              >
                {equipment.map((eq) => (
                  <MenuItem key={eq._id} value={eq._id}>
                    {eq.assetName} ({eq.assetId})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Maintenance Task</InputLabel>
              <Select
                value={formData.maintenanceTaskId}
                onChange={(e) =>
                  setFormData({ ...formData, maintenanceTaskId: e.target.value })
                }
                label="Maintenance Task"
              >
                {tasks.map((task) => (
                  <MenuItem key={task._id} value={task._id}>
                    {task.taskDescription} ({task.frequencyInterval})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Last Service Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formData.lastServiceDate}
              onChange={(e) =>
                setFormData({ ...formData, lastServiceDate: e.target.value })
              }
            />
            <TextField
              label="Next Due Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formData.nextDueDate}
              onChange={(e) =>
                setFormData({ ...formData, nextDueDate: e.target.value })
              }
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                label="Status"
              >
                <MenuItem value="Upcoming">Upcoming</MenuItem>
                <MenuItem value="InProgress">In Progress</MenuItem>
                <MenuItem value="Overdue">Overdue</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Assigned To"
              fullWidth
              value={formData.assignedTo}
              onChange={(e) =>
                setFormData({ ...formData, assignedTo: e.target.value })
              }
            />
            <TextField
              label="Estimated Cost"
              type="number"
              fullWidth
              value={formData.estimatedCost}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  estimatedCost: parseFloat(e.target.value) || 0,
                })
              }
            />
            <TextField
              label="Actual Cost"
              type="number"
              fullWidth
              value={formData.actualCost}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  actualCost: parseFloat(e.target.value) || 0,
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
