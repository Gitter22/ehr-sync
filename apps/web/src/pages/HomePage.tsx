import { useMutation } from '@tanstack/react-query';
import { Alert, Box, Button, Chip, Container, Paper, Stack, Typography } from '@mui/material';
import { runConnectivityCheck } from '../api/connectivity';
import { useConnectivityStore } from '../store/connectivityStore';

export function HomePage() {
  const lastResult = useConnectivityStore((state) => state.lastResult);
  const setLastResult = useConnectivityStore((state) => state.setLastResult);

  const mutation = useMutation({
    mutationFn: runConnectivityCheck,
    onSuccess: setLastResult,
  });

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 6 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          EHR Sync
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Scaffold smoke test: verifies React → Node API → PostgreSQL → Python service → PostgreSQL
          → Node API → React.
        </Typography>

        <Button
          variant="contained"
          size="large"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Running…' : 'Run EHR Sync Connectivity Test'}
        </Button>

        {mutation.isError && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {mutation.error instanceof Error ? mutation.error.message : 'Request failed'}
          </Alert>
        )}

        {lastResult && (
          <Paper variant="outlined" sx={{ mt: 4, p: 3 }}>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="subtitle1">Overall</Typography>
                <Chip
                  label={lastResult.overall}
                  color={lastResult.overall === 'ok' ? 'success' : 'error'}
                  size="small"
                />
              </Stack>

              <Box>
                <Typography variant="subtitle2">Node API</Typography>
                <Typography variant="body2" color="text.secondary">
                  status: {lastResult.api.status} · database: {lastResult.api.database}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2">Python service</Typography>
                <Typography variant="body2" color="text.secondary">
                  status: {lastResult.python.status} · database: {lastResult.python.database}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        )}
      </Box>
    </Container>
  );
}
