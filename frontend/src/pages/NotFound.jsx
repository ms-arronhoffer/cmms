import { Container, Box, Typography } from '@mui/material';

function NotFound() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h3" gutterBottom>
          404
        </Typography>
        <Typography variant="h6" color="textSecondary">
          Page not found
        </Typography>
      </Box>
    </Container>
  );
}

export default NotFound;
