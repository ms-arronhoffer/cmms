import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import NavBar from './components/NavBar';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import EquipmentList from './pages/EquipmentList';
import TasksPage from './pages/TasksPage';
import MaintenancePage from './pages/MaintenancePage';
import ReportsPage from './pages/ReportsPage';
import AdminRecipientsPage from './pages/AdminRecipientsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import NotFound from './pages/NotFound';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <>
                  <NavBar />
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="equipment" element={<EquipmentList />} />
                    <Route path="tasks" element={<TasksPage />} />
                    <Route path="maintenance" element={<MaintenancePage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="admin/recipients" element={<AdminRecipientsPage />} />
                    <Route path="admin/users" element={<AdminUsersPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </>
              }
            />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
