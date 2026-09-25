import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { runConnectivityCheck } from '../api/connectivity';
import {
  ACTIVE_JOB_STATUSES,
  cancelSyncJob,
  fetchSyncJobDetail,
  fetchSyncJobs,
  retrySyncJob,
  startSync,
  type EhrSource,
  type StartSyncOptions,
  type SyncJob,
  type SyncJobStatus,
} from '../api/sync';
import { useConnectivityStore } from '../store/connectivityStore';

const SOURCE_OPTIONS: { value: EhrSource; label: string; available: boolean }[] = [
  { value: 'HAPI_FHIR', label: 'HAPI FHIR', available: true },
  { value: 'ORACLE_HEALTH', label: 'Oracle Health', available: true },
  { value: 'EPIC', label: 'Epic', available: false },
];

type LastUpdatedMode = 'default' | 'full' | 'custom';

const STATUS_COLOR: Record<SyncJobStatus, 'default' | 'info' | 'success' | 'error' | 'warning'> = {
  PENDING: 'info',
  RUNNING: 'info',
  COMPLETED: 'success',
  FAILED: 'error',
  PARTIAL: 'warning',
  CANCELLED: 'default',
};

function hasActiveJob(jobs: SyncJob[] | undefined): boolean {
  return (jobs ?? []).some((job) => ACTIVE_JOB_STATUSES.includes(job.status));
}

export function ControlPanelPage() {
  const queryClient = useQueryClient();
  const [source, setSource] = useState<EhrSource>('HAPI_FHIR');
  const [detailJobId, setDetailJobId] = useState<string | null>(null);
  // "Last updated" is HAPI-only (Oracle's Patient search never supports watermark filtering
  // regardless). "Max records" applies to both HAPI and Oracle — for Oracle it caps the Patient
  // task, which proportionally shrinks the downstream Condition/MedicationRequest batches too.
  const [lastUpdatedMode, setLastUpdatedMode] = useState<LastUpdatedMode>('default');
  const [customDate, setCustomDate] = useState('');
  const [maxRecords, setMaxRecords] = useState('');

  const [startedJob, setStartedJob] = useState<{ jobId: string; displayId: number } | null>(null);

  const jobsQuery = useQuery({
    queryKey: ['syncJobs'],
    queryFn: fetchSyncJobs,
    refetchInterval: (query) => (hasActiveJob(query.state.data?.jobs) ? 2500 : false),
  });

  const jobs = jobsQuery.data?.jobs ?? [];

  // Clears the "started sync job #N" banner once that specific job reaches a terminal status —
  // it otherwise has no reason to ever disappear on its own (mutation state doesn't expire).
  useEffect(() => {
    if (!startedJob) return;
    const job = jobs.find((j) => j.id === startedJob.jobId);
    if (job && !ACTIVE_JOB_STATUSES.includes(job.status)) {
      setStartedJob(null);
    }
  }, [jobs, startedJob]);

  const startMutation = useMutation({
    mutationFn: () => {
      const options: StartSyncOptions = {};
      if (source === 'HAPI_FHIR') {
        if (lastUpdatedMode === 'full') {
          options.lastUpdatedOverride = null;
        } else if (lastUpdatedMode === 'custom' && customDate) {
          options.lastUpdatedOverride = new Date(customDate).toISOString();
        }
      }
      if ((source === 'HAPI_FHIR' || source === 'ORACLE_HEALTH') && maxRecords.trim()) {
        options.maxRecords = Number(maxRecords);
      }
      return startSync(source, options);
    },
    onSuccess: (data) => {
      setStartedJob({ jobId: data.jobId, displayId: data.displayId });
      queryClient.invalidateQueries({ queryKey: ['syncJobs'] });
    },
  });

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => retrySyncJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syncJobs'] });
      queryClient.invalidateQueries({ queryKey: ['syncJobDetail'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (jobId: string) => cancelSyncJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syncJobs'] });
      queryClient.invalidateQueries({ queryKey: ['syncJobDetail'] });
    },
  });

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Control Panel
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Trigger sync
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { sm: 'flex-start' }, flexWrap: 'wrap' }}
        >
          <TextField
            select
            label="Source"
            size="small"
            value={source}
            onChange={(e) => setSource(e.target.value as EhrSource)}
            sx={{ minWidth: 220 }}
          >
            {SOURCE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value} disabled={!option.available}>
                {option.label}
                {!option.available ? ' (not yet available)' : ''}
              </MenuItem>
            ))}
          </TextField>

          {source === 'HAPI_FHIR' && (
            <>
              <TextField
                select
                label="Last updated"
                size="small"
                value={lastUpdatedMode}
                onChange={(e) => setLastUpdatedMode(e.target.value as LastUpdatedMode)}
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="default">Default (since last successful sync)</MenuItem>
                <MenuItem value="full">Full sync (ignore watermark)</MenuItem>
                <MenuItem value="custom">Custom date…</MenuItem>
              </TextField>
              {lastUpdatedMode === 'custom' && (
                <TextField
                  label="Changes since"
                  type="date"
                  size="small"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ minWidth: 180 }}
                />
              )}
            </>
          )}

          {(source === 'HAPI_FHIR' || source === 'ORACLE_HEALTH') && (
            <TextField
              label="Max records"
              type="number"
              size="small"
              value={maxRecords}
              onChange={(e) => setMaxRecords(e.target.value)}
              placeholder="Unbounded"
              sx={{ minWidth: 140 }}
            />
          )}

          <Button
            variant="contained"
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
            sx={{ mt: { xs: 0, sm: '4px' } }}
          >
            {startMutation.isPending ? 'Creating…' : 'Create sync'}
          </Button>
        </Stack>
        {startMutation.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {startMutation.error instanceof Error
              ? startMutation.error.message
              : 'Failed to start sync'}
          </Alert>
        )}
        {startedJob && (
          <Alert severity="success" sx={{ mt: 2 }} onClose={() => setStartedJob(null)}>
            Started sync job #{startedJob.displayId}
          </Alert>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Box sx={{ p: 2, pb: 0 }}>
          <Typography variant="h6">Sync jobs</Typography>
        </Box>
        {/* size="small" rows are ~37px tall; 460px comfortably fits the header plus at least 10
            rows before the table itself needs to scroll. */}
        <TableContainer sx={{ maxHeight: 460, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Job</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Finished</TableCell>
                <TableCell>Stats (fetched / created / updated / failed)</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id} hover>
                  <TableCell>#{job.displayId}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      <Chip label={job.status} size="small" color={STATUS_COLOR[job.status]} />
                      {job.maxRecordsPerTask != null && (
                        <Chip
                          label={`capped ${job.maxRecordsPerTask}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>{job.source}</TableCell>
                  <TableCell>
                    {job.startedAt ? new Date(job.startedAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>
                    {job.finishedAt ? new Date(job.finishedAt).toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      {job.stats.map((stat) => (
                        <Typography key={stat.id} variant="caption" color="text.secondary">
                          {stat.resourceType}: {stat.fetched} / {stat.created} / {stat.updated} /{' '}
                          {stat.failed}
                        </Typography>
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                      <Button size="small" onClick={() => setDetailJobId(job.id)}>
                        Details
                      </Button>
                      {ACTIVE_JOB_STATUSES.includes(job.status) && (
                        <Button
                          size="small"
                          color="warning"
                          onClick={() => cancelMutation.mutate(job.id)}
                          disabled={cancelMutation.isPending}
                        >
                          Cancel
                        </Button>
                      )}
                      {job.status === 'FAILED' || job.status === 'PARTIAL' ? (
                        <Button
                          size="small"
                          onClick={() => retryMutation.mutate(job.id)}
                          disabled={retryMutation.isPending}
                        >
                          Retry
                        </Button>
                      ) : null}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {!jobsQuery.isLoading && jobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <Typography color="text.secondary">No sync jobs yet</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ConnectivityCheckPanel />

      <JobDetailDialog jobId={detailJobId} onClose={() => setDetailJobId(null)} />
    </Container>
  );
}

function JobDetailDialog({ jobId, onClose }: { jobId: string | null; onClose: () => void }) {
  const detailQuery = useQuery({
    queryKey: ['syncJobDetail', jobId],
    queryFn: () => fetchSyncJobDetail(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ACTIVE_JOB_STATUSES.includes(status) ? 2500 : false;
    },
  });

  return (
    <Dialog open={!!jobId} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Job detail
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {detailQuery.isLoading && <Typography color="text.secondary">Loading…</Typography>}
        {detailQuery.data && (
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Tasks
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Resource type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Fetched so far</TableCell>
                    <TableCell>
                      <Tooltip title="Oracle Health only — Condition/MedicationRequest work is split into independent batches of ~10 patients each. Shows how many of this task's batches finished vs. failed.">
                        <span>Batches</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="pg-boss retry count on the task's most recent failed delivery. Resets to 0 once healthy again — this is not a running total of pages/batches processed, so 0 does not mean 'nothing happened'.">
                        <span>Retry attempts</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>Last error</TableCell>
                    <TableCell>
                      <Tooltip title="When this task's row last changed status — not the source record's own 'last updated' timestamp.">
                        <span>Task updated at</span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {detailQuery.data.tasks.map((task) => {
                    const stat = detailQuery.data.stats.find(
                      (s) => s.resourceType === task.resourceType,
                    );
                    const batches = detailQuery.data.clinicalBatches.filter(
                      (b) => b.resourceType === task.resourceType,
                    );
                    const isBatchScoped = batches.length > 0;
                    const failedBatches = batches.filter((b) => b.status === 'FAILED');
                    const completedBatches = batches.filter((b) => b.status === 'COMPLETED');
                    // The parent task's own lastError is only ever set for HAPI's page-walk path —
                    // for Oracle's batch-scoped path, fall back to the most recently failed batch's
                    // error, otherwise this column silently shows "—" even when a batch clearly failed.
                    const mostRecentFailedBatch = [...failedBatches].sort(
                      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
                    )[0];
                    const displayError = task.lastError ?? mostRecentFailedBatch?.lastError ?? null;

                    return (
                      <TableRow key={task.id}>
                        <TableCell>{task.resourceType}</TableCell>
                        <TableCell>{task.status}</TableCell>
                        <TableCell>{stat?.fetched ?? 0}</TableCell>
                        <TableCell>
                          {isBatchScoped ? (
                            <Tooltip
                              title={`${completedBatches.length} completed, ${failedBatches.length} failed, ${
                                batches.length - completedBatches.length - failedBatches.length
                              } in progress, ${batches.length} total`}
                            >
                              <span>
                                {completedBatches.length}/{batches.length} OK
                                {failedBatches.length > 0 ? `, ${failedBatches.length} failed` : ''}
                              </span>
                            </Tooltip>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {isBatchScoped ? (
                            <Tooltip title="Batch-scoped task — see the Batches column instead; pg-boss retries apply per batch, not to this task row.">
                              <span>—</span>
                            </Tooltip>
                          ) : (
                            task.attempts
                          )}
                        </TableCell>
                        <TableCell>{displayError ?? '—'}</TableCell>
                        <TableCell>{new Date(task.updatedAt).toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>

            {detailQuery.data.missingPatients.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Missing patient references
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Patient FHIR ID</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailQuery.data.missingPatients.map((ref) => (
                      <TableRow key={ref.id}>
                        <TableCell>{ref.patientFhirId}</TableCell>
                        <TableCell>{ref.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            <Divider />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Event log
              </Typography>
              <Stack spacing={1} sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {detailQuery.data.events.map((event) => (
                  <Typography key={event.id} variant="caption" color="text.secondary">
                    [{event.level}] {event.message}
                  </Typography>
                ))}
                {detailQuery.data.events.length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    No events logged
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConnectivityCheckPanel() {
  const lastResult = useConnectivityStore((state) => state.lastResult);
  const setLastResult = useConnectivityStore((state) => state.setLastResult);

  const mutation = useMutation({
    mutationFn: runConnectivityCheck,
    onSuccess: setLastResult,
  });

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Connectivity check
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Verifies React → Node API → PostgreSQL → Python service → PostgreSQL → Node API → React.
      </Typography>

      <Button variant="outlined" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? 'Running…' : 'Run connectivity test'}
      </Button>

      {mutation.isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {mutation.error instanceof Error ? mutation.error.message : 'Request failed'}
        </Alert>
      )}

      {lastResult && (
        <Stack spacing={1} sx={{ mt: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="subtitle2">Overall</Typography>
            <Chip
              label={lastResult.overall}
              color={lastResult.overall === 'ok' ? 'success' : 'error'}
              size="small"
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Node API — status: {lastResult.api.status} · database: {lastResult.api.database}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Python service — status: {lastResult.python.status} · database:{' '}
            {lastResult.python.database}
          </Typography>
        </Stack>
      )}
    </Paper>
  );
}
