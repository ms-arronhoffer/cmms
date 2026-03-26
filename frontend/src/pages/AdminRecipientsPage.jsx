import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
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

export default function AdminRecipientsPage() {
  const { user } = useAuth();
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
  });

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    loadRecipients();
  }, []);

  const loadRecipients = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/report-recipients');
      setRecipients(response.data.filter((r) => r.isActive));
    } catch (err) {
      // If endpoint doesn't exist yet, show friendly message
      if (err.response?.status === 404) {
        setRecipients([]);
      } else {
        setError(err.response?.data?.message || 'Failed to load recipients');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (recipient = null) => {
    if (recipient) {
      setEditingId(recipient._id);
      setFormData({
        email: recipient.email,
        name: recipient.name || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        email: '',
        name: '',
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
      if (!formData.email.trim()) {
        setError('Email is required');
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        return;
      }

      if (editingId) {
        await api.put(`/report-recipients/${editingId}`, formData);
      } else {
        await api.post('/report-recipients', formData);
      }

      handleCloseDialog();
      loadRecipients();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save recipient');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Remove this recipient from the mailing list?')) {
      try {
        await api.delete(`/report-recipients/${id}`);
        loadRecipients();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete recipient');
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

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">Report Recipients</Typography>
        <Button variant="contained" onClick={() => handleOpenDialog()}>
          + Add Recipient
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Alert severity="info" sx={{ mb: 3 }}>
        Recipients added here will receive the weekly maintenance report. They can also be manually
        selected when generating on-demand reports.
      </Alert>

      {recipients.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">
            No recipients configured yet. Add one to get started.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell><strong>Email</strong></TableCell>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Added</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recipients.map((recipient) => (
                <TableRow key={recipient._id}>
                  <TableCell>{recipient.email}</TableCell>
                  <TableCell>{recipient.name || '-'}</TableCell>
                  <TableCell>
                    {new Date(recipient.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => handleOpenDialog(recipient)}
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleDelete(recipient._id)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Recipient' : 'Add New Recipient'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Email Address"
              type="email"
              fullWidth
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              helperText="Email address for report delivery"
            />
            <TextField
              label="Name (Optional)"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              helperText="Display name for this recipient"
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
