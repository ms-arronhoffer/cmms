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
  Chip,
} from '@mui/material';
import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function EquipmentList() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    assetId: '',
    assetName: '',
    modelNumber: '',
    serialNumber: '',
    physicalLocation: '',
    installationDate: '',
    internalOwner: '',
    serviceProviderName: '',
    primaryContactPerson: '',
    contactPhone: '',
    contactEmail: '',
    vendorAccountNumber: '',
    contractExpirationDate: '',
    estimatedCost: 0,
    actualCost: 0,
  });

  const isAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/equipment');
      setEquipment(response.data.filter((eq) => !eq.isArchived));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (eq = null) => {
    if (eq) {
      setEditingId(eq._id);
      setFormData({
        assetId: eq.assetId,
        assetName: eq.assetName,
        modelNumber: eq.modelNumber || '',
        serialNumber: eq.serialNumber || '',
        physicalLocation: eq.physicalLocation || '',
        installationDate: eq.installationDate?.split('T')[0] || '',
        internalOwner: eq.internalOwner || '',
        serviceProviderName: eq.serviceProviderName || '',
        primaryContactPerson: eq.primaryContactPerson || '',
        contactPhone: eq.contactPhone || '',
        contactEmail: eq.contactEmail || '',
        vendorAccountNumber: eq.vendorAccountNumber || '',
        contractExpirationDate: eq.contractExpirationDate?.split('T')[0] || '',
        estimatedCost: eq.estimatedCost || 0,
        actualCost: eq.actualCost || 0,
      });
    } else {
      setEditingId(null);
      setFormData({
        assetId: '',
        assetName: '',
        modelNumber: '',
        serialNumber: '',
        physicalLocation: '',
        installationDate: new Date().toISOString().split('T')[0],
        internalOwner: '',
        serviceProviderName: '',
        primaryContactPerson: '',
        contactPhone: '',
        contactEmail: '',
        vendorAccountNumber: '',
        contractExpirationDate: '',
        estimatedCost: 0,
        actualCost: 0,
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
      if (!formData.assetId.trim() || !formData.assetName.trim()) {
        setError('Asset ID and Asset Name are required');
        return;
      }

      if (editingId) {
        await api.put(`/equipment/${editingId}`, formData);
      } else {
        await api.post('/equipment', formData);
      }

      handleCloseDialog();
      loadEquipment();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save equipment');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Archive this equipment? It will no longer appear in the main list.')) {
      try {
        await api.delete(`/equipment/${id}`);
        loadEquipment();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete equipment');
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
        <Typography variant="h4">Equipment</Typography>
        {isAdmin && (
          <Button variant="contained" onClick={() => handleOpenDialog()}>
            + Add Equipment
          </Button>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell><strong>Asset ID</strong></TableCell>
              <TableCell><strong>Asset Name</strong></TableCell>
              <TableCell><strong>Location</strong></TableCell>
              <TableCell><strong>Service Provider</strong></TableCell>
              <TableCell><strong>Contact</strong></TableCell>
              <TableCell><strong>Estimated Cost</strong></TableCell>
              {isAdmin && <TableCell><strong>Actions</strong></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {equipment.map((eq) => (
              <TableRow key={eq._id}>
                <TableCell>{eq.assetId}</TableCell>
                <TableCell>{eq.assetName}</TableCell>
                <TableCell>{eq.physicalLocation || '-'}</TableCell>
                <TableCell>{eq.serviceProviderName || '-'}</TableCell>
                <TableCell>
                  <Stack spacing={0.5}>
                    <Typography variant="body2">{eq.primaryContactPerson || '-'}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {eq.contactPhone || eq.contactEmail || '-'}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>${eq.estimatedCost || 0}</TableCell>
                {isAdmin && (
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => handleOpenDialog(eq)}
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleDelete(eq._id)}
                    >
                      Archive
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Equipment' : 'Add New Equipment'}</DialogTitle>
        <DialogContent sx={{ pt: 2, maxHeight: '70vh', overflow: 'auto' }}>
          <Stack spacing={2}>
            <TextField
              label="Asset ID"
              fullWidth
              required
              value={formData.assetId}
              onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
            />
            <TextField
              label="Asset Name"
              fullWidth
              required
              value={formData.assetName}
              onChange={(e) => setFormData({ ...formData, assetName: e.target.value })}
            />
            <TextField
              label="Model Number"
              fullWidth
              value={formData.modelNumber}
              onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
            />
            <TextField
              label="Serial Number"
              fullWidth
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
            />
            <TextField
              label="Physical Location"
              fullWidth
              value={formData.physicalLocation}
              onChange={(e) => setFormData({ ...formData, physicalLocation: e.target.value })}
            />
            <TextField
              label="Installation Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formData.installationDate}
              onChange={(e) =>
                setFormData({ ...formData, installationDate: e.target.value })
              }
            />
            <TextField
              label="Internal Owner"
              fullWidth
              value={formData.internalOwner}
              onChange={(e) => setFormData({ ...formData, internalOwner: e.target.value })}
            />
            <TextField
              label="Service Provider Name"
              fullWidth
              value={formData.serviceProviderName}
              onChange={(e) =>
                setFormData({ ...formData, serviceProviderName: e.target.value })
              }
            />
            <TextField
              label="Primary Contact Person"
              fullWidth
              value={formData.primaryContactPerson}
              onChange={(e) =>
                setFormData({ ...formData, primaryContactPerson: e.target.value })
              }
            />
            <TextField
              label="Contact Phone"
              fullWidth
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
            />
            <TextField
              label="Contact Email"
              type="email"
              fullWidth
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
            />
            <TextField
              label="Vendor Account Number"
              fullWidth
              value={formData.vendorAccountNumber}
              onChange={(e) =>
                setFormData({ ...formData, vendorAccountNumber: e.target.value })
              }
            />
            <TextField
              label="Contract Expiration Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formData.contractExpirationDate}
              onChange={(e) =>
                setFormData({ ...formData, contractExpirationDate: e.target.value })
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
