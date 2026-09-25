import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { isAxiosError } from 'axios';
import type { EhrSource } from '../api/patients';
import {
  ACTIVE_RESET_STATUSES,
  fetchSourceResetPreview,
  fetchSourceResets,
  requestSourceReset,
  type SourceDataCounts,
  type SourceResetAudit,
  type SourceResetStatus,
} from '../api/sourceReset';

const RESETTABLE: { source: EhrSource; label: string }[] = [
  { source: 'HAPI_FHIR', label: 'HAPI FHIR' },
  { source: 'ORACLE_HEALTH', label: 'Oracle Health' },
];

const STATUS_COLOR: Record<SourceResetStatus, 'info' | 'success' | 'error'> = {
  PENDING: 'info',
  RUNNING: 'info',
  COMPLETED: 'success',
  FAILED: 'error',
};

function labelOf(source: EhrSource): string {
  return RESETTABLE.find((r) => r.source === source)?.label ?? source;
}

function errorText(error: unknown): string {
  if (isAxiosError(error) && typeof error.response?.data?.error === 'string') {
    return error.response.data.error;
  }
  return error instanceof Error ? error.message : 'Request failed';
}

function summarize(counts: SourceDataCounts): string {
  return `${counts.patients} patients · ${counts.conditions} conditions · ${counts.medicationRequests} medication requests · ${counts.syncJobs} sync jobs`;
}

function detailLines(counts: SourceDataCounts): string[] {
  return [
    `${counts.patients} patients`,
    `${counts.conditions} conditions`,
    `${counts.medicationRequests} medication requests`,
    `${counts.rawResources} raw FHIR records`,
    `${counts.syncJobs} sync jobs`,
    `${counts.syncTasks} tasks`,
    `${counts.syncClinicalBatches} batches`,
    `${counts.syncJobStats} job stats`,
    `${counts.syncJobEvents} job events`,
    `${counts.syncMissingPatientRefs} missing-patient references`,
  ];
}

function durationText(reset: SourceResetAudit): string {
  if (!reset.startedAt) return '—';
  const end = reset.finishedAt ? new Date(reset.finishedAt) : new Date();
  const seconds = Math.max(
    0,
    Math.round((end.getTime() - new Date(reset.startedAt).getTime()) / 1000),
  );
  return `${seconds}s`;
}

export function SourceResetPanel() {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<EhrSource | null>(null);
  const [typed, setTyped] = useState('');

  const resetsQuery = useQuery({
    queryKey: ['sourceResets'],
    queryFn: fetchSourceResets,
    refetchInterval: (query) =>
      (query.state.data?.resets ?? []).some((r) => ACTIVE_RESET_STATUSES.includes(r.status))
        ? 2500
        : false,
  });
  const resets = resetsQuery.data?.resets ?? [];
  const activeSources = new Set(
    resets.filter((r) => ACTIVE_RESET_STATUSES.includes(r.status)).map((r) => r.source),
  );

  const previewQuery = useQuery({
    queryKey: ['sourceResetPreview', target],
    queryFn: () => fetchSourceResetPreview(target!),
    enabled: target !== null,
    gcTime: 0,
  });

  const resetMutation = useMutation({
    mutationFn: () => requestSourceReset(target!, typed),
    onSuccess: () => {
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['sourceResets'] });
    },
  });

  function closeDialog() {
    setTarget(null);
    setTyped('');
    resetMutation.reset();
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, mt: 3, borderColor: 'error.main' }}>
      <Typography variant="h6" color="error" gutterBottom>
        Danger zone
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Permanently deletes everything held for one source — patients, conditions, medication
        requests, the raw records, and every sync job and task — so it looks like it was never
        synced. Meant for repeatedly demoing a fresh sync. Every reset is recorded in the audit
        trail below.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        {RESETTABLE.map(({ source, label }) => (
          <Button
            key={source}
            variant="outlined"
            color="error"
            disabled={activeSources.has(source)}
            onClick={() => setTarget(source)}
          >
            {activeSources.has(source) ? `Resetting ${label}…` : `Reset ${label} data`}
          </Button>
        ))}
      </Stack>

      {resets.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
            Reset audit trail
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Requested</TableCell>
                <TableCell>Took</TableCell>
                <TableCell>Deleted</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {resets.map((reset) => (
                <TableRow key={reset.id}>
                  <TableCell>{reset.displayId}</TableCell>
                  <TableCell>{labelOf(reset.source)}</TableCell>
                  <TableCell>
                    <Chip label={reset.status} color={STATUS_COLOR[reset.status]} size="small" />
                  </TableCell>
                  <TableCell>{new Date(reset.requestedAt).toLocaleString()}</TableCell>
                  <TableCell>{durationText(reset)}</TableCell>
                  <TableCell>
                    {reset.deleted ? (
                      <Tooltip
                        title={
                          <>
                            {detailLines(reset.deleted.counts).map((line) => (
                              <div key={line}>{line}</div>
                            ))}
                            <div>
                              sync jobs removed: #
                              {reset.deleted.syncJobDisplayIds.join(', #') || '—'}
                            </div>
                          </>
                        }
                      >
                        <span>{summarize(reset.deleted.counts)}</span>
                      </Tooltip>
                    ) : (
                      (reset.errorMessage ?? '—')
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      <Dialog open={target !== null} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Reset {target ? labelOf(target) : ''} data?</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            This is permanent and cannot be undone. It is refused while a sync job is running for
            this source.
          </Alert>
          {previewQuery.isLoading && (
            <Typography color="text.secondary">Counting what would be deleted…</Typography>
          )}
          {previewQuery.data && (
            <>
              <Typography variant="body2" sx={{ mb: 1 }}>
                This will delete:
              </Typography>
              <Stack component="ul" sx={{ m: 0, mb: 2, pl: 3 }}>
                {detailLines(previewQuery.data).map((line) => (
                  <Typography key={line} component="li" variant="body2">
                    {line}
                  </Typography>
                ))}
              </Stack>
            </>
          )}
          {previewQuery.isError && (
            <Alert severity="warning">{errorText(previewQuery.error)}</Alert>
          )}
          <TextField
            label={`Type ${target ?? ''} to confirm`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            size="small"
            fullWidth
            autoComplete="off"
          />
          {resetMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorText(resetMutation.error)}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={typed !== target || resetMutation.isPending}
            onClick={() => resetMutation.mutate()}
          >
            {resetMutation.isPending ? 'Starting…' : 'Delete everything'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
