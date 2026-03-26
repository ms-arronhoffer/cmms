import {
  Alert,
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import apiClient from '../services/api';

function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [dueSoon, setDueSoon] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [equipmentResponse, overdueResponse, dueSoonResponse] = await Promise.all([
          apiClient.get('/equipment'),
          apiClient.get('/maintenance/overdue'),
          apiClient.get('/maintenance/due-soon'),
        ]);

        setEquipment(equipmentResponse.data);
        setOverdue(overdueResponse.data);
        setDueSoon(dueSoonResponse.data);
      } catch (loadError) {
        setError(loadError.response?.data?.error?.message || 'Failed to load dashboard data');
      }
    }

    loadData();
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Maintenance Dashboard
            </Typography>
            <Typography variant="body1">
              Welcome, {user?.displayName || user?.username}.
            </Typography>
          </Box>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="overline">Tracked Equipment</Typography>
                  <Typography variant="h3">{equipment.length}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="overline">Overdue Activities</Typography>
                  <Typography variant="h3" color="error.main">{overdue.length}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="overline">Due In 30 Days</Typography>
                  <Typography variant="h3">{dueSoon.length}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Overdue Work
                  </Typography>
                  <List dense>
                    {overdue.map((item) => (
                      <ListItem key={item._id} disableGutters>
                        <ListItemText
                          primary={item.maintenanceTaskId?.taskDescription}
                          secondary={`${item.equipmentId?.assetName} • Due ${new Date(item.nextDueDate).toLocaleDateString()}`}
                        />
                      </ListItem>
                    ))}
                    {overdue.length === 0 ? <ListItem disableGutters><ListItemText primary="No overdue maintenance." /></ListItem> : null}
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Upcoming Work
                  </Typography>
                  <List dense>
                    {dueSoon.map((item) => (
                      <ListItem key={item._id} disableGutters>
                        <ListItemText
                          primary={item.maintenanceTaskId?.taskDescription}
                          secondary={`${item.equipmentId?.assetName} • Due ${new Date(item.nextDueDate).toLocaleDateString()}`}
                        />
                      </ListItem>
                    ))}
                    {dueSoon.length === 0 ? <ListItem disableGutters><ListItemText primary="No upcoming maintenance in the next 30 days." /></ListItem> : null}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </Box>
    </Container>
  );
}

export default Dashboard;
