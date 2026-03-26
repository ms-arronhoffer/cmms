import { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Paper,
  Button,
  Box,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Card,
  CardContent,
  Grid,
  TextField,
  Stack,
} from '@mui/material';
import apiClient from '../services/api';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';

function toIsoDate(date) {
  const d = new Date(date);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

function safeDateLabel(value) {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString();
}

export default function ReportsPage() {
  const today = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => toIsoDate(today), [today]);
  const defaultTo = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 30);
    return toIsoDate(d);
  }, [today]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [upcomingData, setUpcomingData] = useState(null);
  const [includePastDue, setIncludePastDue] = useState(true);
  const [openPreview, setOpenPreview] = useState(false);
  const [previewFormat, setPreviewFormat] = useState('html');
  const [reportContent, setReportContent] = useState('');
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [activePreset, setActivePreset] = useState('next30');

  useEffect(() => {
    fetchUpcomingMaintenance();
  }, [fromDate, toDate, includePastDue]);

  const applyPreset = (preset) => {
    const now = new Date();

    if (preset === 'next7') {
      const end = new Date(now);
      end.setDate(end.getDate() + 7);
      setFromDate(toIsoDate(now));
      setToDate(toIsoDate(end));
    }

    if (preset === 'next30') {
      const end = new Date(now);
      end.setDate(end.getDate() + 30);
      setFromDate(toIsoDate(now));
      setToDate(toIsoDate(end));
    }

    if (preset === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFromDate(toIsoDate(start));
      setToDate(toIsoDate(end));
    }

    setActivePreset(preset);
  };

  const fetchUpcomingMaintenance = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get('/reports/upcoming', {
        params: { fromDate, toDate, includePastDue },
      });
      setUpcomingData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch upcoming maintenance');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (format) => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.post(
        '/reports/generate',
        { format, includePastDue, fromDate, toDate },
        { responseType: format === 'csv' ? 'blob' : 'arraybuffer' }
      );

      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : 'text/html',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `maintenance-report-${fromDate}-to-${toDate}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to generate ${format.toUpperCase()} report`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const viewReportPreview = async (format) => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.post('/reports/generate', {
        format,
        includePastDue,
        fromDate,
        toDate,
      });

      if (format === 'html') {
        setReportContent(response.data);
      } else {
        setReportContent(`<pre>${response.data}</pre>`);
      }

      setPreviewFormat(format);
      setOpenPreview(true);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to preview ${format.toUpperCase()} report`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'Overdue') return 'error';
    if (status === 'Upcoming') return 'warning';
    return 'default';
  };

  const getPriorityColor = (priority) => {
    if (priority === 'High') return 'error';
    if (priority === 'Medium') return 'warning';
    return 'success';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Maintenance Reports
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Generate Report
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          <Button variant={activePreset === 'next7' ? 'contained' : 'outlined'} onClick={() => applyPreset('next7')}>
            Next 7 Days
          </Button>
          <Button variant={activePreset === 'next30' ? 'contained' : 'outlined'} onClick={() => applyPreset('next30')}>
            Next 30 Days
          </Button>
          <Button variant={activePreset === 'thisMonth' ? 'contained' : 'outlined'} onClick={() => applyPreset('thisMonth')}>
            This Month
          </Button>
          <Button variant={activePreset === 'custom' ? 'contained' : 'outlined'} onClick={() => setActivePreset('custom')}>
            Custom
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            label="From Date"
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setActivePreset('custom');
            }}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="To Date"
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setActivePreset('custom');
            }}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Stack>

        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={<Checkbox checked={includePastDue} onChange={(e) => setIncludePastDue(e.target.checked)} />}
            label="Include past due items"
          />
        </Box>

        <Box sx={{ mb: 3, p: 2, borderRadius: 1, backgroundColor: '#f8f9fa' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Report Window
          </Typography>
          <Typography variant="body2" color="textSecondary">
            From: {includePastDue ? 'All past due items' : safeDateLabel(fromDate)}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            To: {safeDateLabel(toDate)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="contained" color="success" startIcon={<FileDownloadIcon />} onClick={() => generateReport('html')} disabled={loading}>
            Download HTML
          </Button>
          <Button variant="contained" color="success" startIcon={<FileDownloadIcon />} onClick={() => generateReport('csv')} disabled={loading}>
            Download CSV
          </Button>
          <Button variant="outlined" startIcon={<VisibilityIcon />} onClick={() => viewReportPreview('html')} disabled={loading}>
            Preview HTML
          </Button>
          <Button variant="outlined" onClick={() => viewReportPreview('csv')} disabled={loading}>
            Preview CSV
          </Button>
        </Box>
      </Paper>

      {upcomingData && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Scheduled
                </Typography>
                <Typography variant="h5">{upcomingData.scheduleCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : upcomingData?.schedules?.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Asset Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Task</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Next Due Date</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {upcomingData.schedules.map((schedule) => (
                <TableRow key={schedule._id} hover>
                  <TableCell>{schedule.equipmentId?.assetName || 'N/A'}</TableCell>
                  <TableCell>{schedule.equipmentId?.physicalLocation || 'N/A'}</TableCell>
                  <TableCell>{schedule.maintenanceTaskId?.taskDescription || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip
                      label={schedule.maintenanceTaskId?.priorityLevel || 'Normal'}
                      color={getPriorityColor(schedule.maintenanceTaskId?.priorityLevel)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={schedule.status} color={getStatusColor(schedule.status)} variant="outlined" size="small" />
                  </TableCell>
                  <TableCell>{safeDateLabel(schedule.nextDueDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Typography>No maintenance items found for the selected report window.</Typography>
        </Paper>
      )}

      <Dialog open={openPreview} onClose={() => setOpenPreview(false)} maxWidth="md" fullWidth>
        <DialogTitle>Report Preview - {previewFormat.toUpperCase()}</DialogTitle>
        <DialogContent sx={{ maxHeight: '600px', overflow: 'auto' }}>
          {previewFormat === 'html' ? (
            <div dangerouslySetInnerHTML={{ __html: reportContent }} />
          ) : (
            <Typography component="div" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
              {reportContent}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPreview(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}