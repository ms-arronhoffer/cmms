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

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'Technician',
  });

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (u = null) => {
    if (u) {
      setEditingId(u._id);
      setFormData({
        username: u.username,
        email: u.email,
        password: '',
        role: u.role,
      });
    } else {
      setEditingId(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        role: 'Technician',
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
      setError('');

      if (!formData.username.trim() || !formData.email.trim()) {
        setError('Username and email are required');
        return;
      }

      if (!editingId && !formData.password.trim()) {
        setError('Password is required for new users');
        return;
      }

      if (formData.password && formData.password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }

      const payload = {
        email: formData.email.toLowerCase(),
        role: formData.role,
        ...(formData.password && { password: formData.password }),
      };

      if (editingId) {
        await api.put(`/users/${editingId}`, payload);
      } else {
        const createPayload = {
          username: formData.username.toLowerCase(),
          ...payload,
        };
        await api.post('/users', createPayload);
      }

      handleCloseDialog();
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleDeactivate = async (id, username) => {
    if (
      window.confirm(
        `Are you sure you want to deactivate ${username}? They will not be able to log in.`
      )
    ) {
      try {
        await api.delete(`/users/${id}`);
        loadUsers();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to deactivate user');
      }
    }
  };

  const handleResetPassword = async (id, username) => {
    if (window.confirm(`Generate a temporary password for ${username}?`)) {
      try {
        const response = await api.put(`/users/${id}/reset-password`);
        const tempPassword = response.data.user.temporaryPassword;
        alert(
          `Temporary password for ${username}: ${tempPassword}\n\nShare this with the user securely.`
        );
        loadUsers();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to reset password');
      }
    }
  };

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You do not have permission to access this page. Admin access required.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const activeUsers = users.filter((u) => u.isActive);
  const inactiveUsers = users.filter((u) => !u.isActive);

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
        <Button variant="contained" onClick={() => handleOpenDialog()}>
          + Add User
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Active Users ({activeUsers.length})
      </Typography>

      {activeUsers.length === 0 ? (
        <Paper sx={{ p: 2, mb: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">No active users found</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 4 }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell><strong>Username</strong></TableCell>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Role</strong></TableCell>
                <TableCell><strong>Last Login</strong></TableCell>
                <TableCell><strong>Created</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeUsers.map((u) => (
                <TableRow key={u._id}>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={u.role}
                      color={u.role === 'Admin' ? 'error' : u.role === 'Manager' ? 'warning' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => handleOpenDialog(u)}
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="warning"
                      onClick={() => handleResetPassword(u._id, u.username)}
                      sx={{ mr: 1 }}
                    >
                      Reset
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleDeactivate(u._id, u.username)}
                    >
                      Deactivate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {inactiveUsers.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mt: 4, mb: 2, color: 'textSecondary' }}>
            Inactive Users ({inactiveUsers.length})
          </Typography>

          <TableContainer component={Paper} sx={{ opacity: 0.6 }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell><strong>Username</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell><strong>Role</strong></TableCell>
                  <TableCell><strong>Deactivated Date</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inactiveUsers.map((u) => (
                  <TableRow key={u._id}>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Chip label={u.role} size="small" />
                    </TableCell>
                    <TableCell>
                      {u.updatedAt ? new Date(u.updatedAt).toLocaleDateString() : 'Unknown'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit User' : 'Add New User'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            {!editingId && (
              <TextField
                label="Username"
                fullWidth
                required
                disabled={!!editingId}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                helperText="Unique username for login"
              />
            )}
            <TextField
              label="Email Address"
              type="email"
              fullWidth
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              helperText="User's email address"
            />
            {!editingId && (
              <TextField
                label="Password"
                type="password"
                fullWidth
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                helperText="Must be at least 8 characters"
              />
            )}
            {editingId && (
              <TextField
                label="New Password (Optional)"
                type="password"
                fullWidth
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                helperText="Leave blank to keep current password. Must be at least 8 characters if provided."
              />
            )}
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                label="Role"
              >
                <MenuItem value="Technician">Technician (View only)</MenuItem>
                <MenuItem value="Manager">Manager (Create/Edit equipment & tasks)</MenuItem>
                <MenuItem value="Admin">Admin (Full access + user management)</MenuItem>
              </Select>
            </FormControl>
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
