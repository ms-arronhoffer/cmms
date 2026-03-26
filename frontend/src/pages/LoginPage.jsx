import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 10 }}>
        <Card elevation={4}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h4" component="h1" gutterBottom>
                  CMMS Portal
                </Typography>
                <Typography color="text.secondary">
                  Sign in to manage equipment, schedules, and reports.
                </Typography>
              </Box>
              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  <TextField
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    fullWidth
                  />
                  <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    fullWidth
                  />
                  {error ? <Alert severity="error">{error}</Alert> : null}
                  <Button type="submit" variant="contained" size="large" disabled={loading}>
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </Stack>
              </Box>
              <Alert severity="info">
                Demo admin: admin / Admin123!
              </Alert>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

export default LoginPage;
