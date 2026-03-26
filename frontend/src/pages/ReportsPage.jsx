import { useState, useEffect } from 'react';
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';

export default function ReportsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [upcomingData, setUpcomingData] = useState(null);
  const [includePastDue, setIncludePastDue] = useState(true);
  const [openPreview, setOpenPreview] = useState(false);
  const [previewFormat, setPreviewFormat] = useState('html');
  const [reportContent, setReportContent] = useState('');
  const today = new Date();
  const thirtyDaysOut = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Fetch upcoming maintenance on load
  useEffect(() => {
    fetchUpcomingMaintenance();
  }, []);

  const fetchUpcomingMaintenance = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/api/reports/upcoming');
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
      const response = await axios.post(
        '/api/reports/generate',
        { format, includePastDue },
        { responseType: format === 'csv' ? 'blob' : 'arraybuffer' }
      );

      // Create download link
      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : 'text/html',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `maintenance-report-${new Date().toISOString().split('T')[0]}.${format}`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      setError('');
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
      const response = await axios.post('/api/reports/generate', {
        format,
        includePastDue,
      });

      if (format === 'html') {
        setReportContent(response.data);
      } else {
        // For CSV, show the raw text in a readable format
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

  const handleDownload = (format) => {
    generateReport(format);
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

      {/* Report Generation Controls */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Generate Report
        </Typography>

        <Box sx={{ mb: 3 }}>
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
            From: {includePastDue ? 'All past due items' : today.toLocaleDateString()}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            To: {thirtyDaysOut.toLocaleDateString()}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<FileDownloadIcon />}
            onClick={() => handleDownload('html')}
            disabled={loading}
          >
            Download HTML
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<FileDownloadIcon />}
            onClick={() => handleDownload('csv')}
            disabled={loading}
          >
            Download CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            onClick={() => viewReportPreview('html')}
            disabled={loading}
          >
            Preview HTML
          </Button>
          <Button
            variant="outlined"
            onClick={() => viewReportPreview('csv')}
            disabled={loading}
          >
            Preview CSV
          </Button>
        </Box>
      </Paper>

      {/* Summary Cards */}
      {upcomingData && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Scheduled
                </Typography>
                <Typography variant="h5">{upcomingData.scheduleCount}</Typography>
                <Typography variant="caption" color="textSecondary">
                  Next 30 days
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {upcomingData.overdueCount !== undefined && (
            <Grid item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Overdue Items
                  </Typography>
                  <Typography variant="h5" sx={{ color: upcomingData.overdueCount > 0 ? 'error.main' : 'success.main' }}>
                    {upcomingData.overdueCount}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Require immediate attention
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Report Period
                </Typography>
                <Typography variant="h5">{upcomingData.reportPeriodDays} days</Typography>
                <Typography variant="caption" color="textSecondary">
                  {new Date(upcomingData.generatedDate).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Upcoming Maintenance Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : upcomingData && upcomingData.schedules && upcomingData.schedules.length > 0 ? (
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
                    <Chip
                      label={schedule.status}
                      color={getStatusColor(schedule.status)}
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{new Date(schedule.nextDueDate).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Typography>No upcoming maintenance found</Typography>
        </Paper>
      )}

      {/* Report Preview Dialog */}
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
