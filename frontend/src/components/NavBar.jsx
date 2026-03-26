import { AppBar, Box, Button, Container, Menu, MenuItem, Stack, Toolbar, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function NavBar() {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Box
            sx={{
              cursor: 'pointer',
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={() => navigate('/')}
          >
            <Typography variant="h6" component="div">
              CMMS Portal
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button color="inherit" onClick={() => navigate('/')}>
              Dashboard
            </Button>
            <Button color="inherit" onClick={() => navigate('/equipment')}>
              Equipment
            </Button>
            <Button color="inherit" onClick={() => navigate('/tasks')}>
              Tasks
            </Button>
            <Button color="inherit" onClick={() => navigate('/maintenance')}>
              Schedule
            </Button>
            <Button color="inherit" onClick={() => navigate('/reports')}>
              Reports
            </Button>
            {user?.role === 'Admin' && (
              <>
                <Button color="inherit" onClick={() => navigate('/admin/recipients')}>
                  Recipients
                </Button>
                <Button color="inherit" onClick={() => navigate('/admin/users')}>
                  Users
                </Button>
              </>
            )}
          </Stack>

          <Box sx={{ ml: 2 }}>
            <Button
              color="inherit"
              onClick={handleMenu}
              size="small"
            >
              {user?.displayName || user?.username}
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem disabled>
                {user?.role}
              </MenuItem>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default NavBar;
