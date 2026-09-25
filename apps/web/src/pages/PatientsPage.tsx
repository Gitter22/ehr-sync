import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  Box,
  Chip,
  Container,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { fetchPatients } from '../api/patients';
import { TablePaginationActions } from '../components/TablePaginationActions';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { formatDateTime } from '../utils/formatDateTime';

const SOURCE_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'HAPI_FHIR', label: 'HAPI FHIR' },
  { value: 'ORACLE_HEALTH', label: 'Oracle Health' },
  { value: 'EPIC', label: 'Epic' },
];

// Fixed-layout column widths (Source, FHIR ID, Full name, Gender, Birth date, Conditions,
// Medications, Last updated, Source last updated) — sum to 100% so the table always fits its
// container; long text wraps instead of forcing a horizontal scrollbar.
const COLUMN_WIDTHS = ['12%', '9%', '13%', '5%', '9%', '10%', '10%', '16%', '16%'];
const WRAP_TEXT_SX = { overflowWrap: 'anywhere' } as const;

export function PatientsPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [fhirId, setFhirId] = useState('');
  const [source, setSource] = useState('');
  const [page, setPage] = useState(0); // MUI TablePagination is 0-indexed
  const [pageSize, setPageSize] = useState(25);

  const debouncedFullName = useDebouncedValue(fullName);
  const debouncedFhirId = useDebouncedValue(fhirId);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['patients', debouncedFullName, debouncedFhirId, source, page, pageSize],
    queryFn: () =>
      fetchPatients(
        {
          fullName: debouncedFullName || undefined,
          fhirId: debouncedFhirId || undefined,
          source: source || undefined,
        },
        { page: page + 1, pageSize },
      ),
    placeholderData: (previous) => previous,
  });

  function resetToFirstPage<T extends (value: string) => void>(setter: T) {
    return (value: string) => {
      setter(value);
      setPage(0);
    };
  }

  return (
    <Container
      maxWidth="lg"
      sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}
    >
      <Typography variant="h4" component="h1" gutterBottom sx={{ flexShrink: 0 }}>
        Patients
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3, flexShrink: 0 }}>
        <TextField
          label="Full name"
          size="small"
          value={fullName}
          onChange={(e) => resetToFirstPage(setFullName)(e.target.value)}
          sx={{ minWidth: 220 }}
        />
        <TextField
          label="FHIR ID"
          size="small"
          value={fhirId}
          onChange={(e) => resetToFirstPage(setFhirId)(e.target.value)}
          sx={{ minWidth: 180 }}
        />
        <TextField
          select
          label="Source"
          size="small"
          value={source}
          onChange={(e) => resetToFirstPage(setSource)(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          {SOURCE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {isError && (
        <Typography color="error" sx={{ mb: 2, flexShrink: 0 }}>
          {error instanceof Error ? error.message : 'Failed to load patients'}
        </Typography>
      )}

      <Paper
        variant="outlined"
        sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        <TableContainer sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
          <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              {COLUMN_WIDTHS.map((width, i) => (
                <col key={i} style={{ width }} />
              ))}
            </colgroup>
            <TableHead>
              <TableRow>
                <TableCell>Source</TableCell>
                <TableCell>FHIR ID</TableCell>
                <TableCell>Full name</TableCell>
                <TableCell>Gender</TableCell>
                <TableCell>Birth date</TableCell>
                <TableCell align="right">Conditions</TableCell>
                <TableCell align="right">Medications</TableCell>
                <TableCell>
                  <Tooltip title="When this app last saved this record">
                    <span>Last updated</span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Tooltip title="When the source system says this record last changed">
                    <span>Source last updated</span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.rows ?? []).map((patient) => (
                <TableRow
                  key={patient.id}
                  hover
                  onClick={() => navigate(`/patients/${patient.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Chip label={patient.source} size="small" />
                  </TableCell>
                  <TableCell sx={WRAP_TEXT_SX}>{patient.fhirId}</TableCell>
                  <TableCell sx={WRAP_TEXT_SX}>{patient.fullName ?? '—'}</TableCell>
                  <TableCell>{patient.gender ?? '—'}</TableCell>
                  <TableCell>
                    {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell align="right">{patient.conditionCount}</TableCell>
                  <TableCell align="right">{patient.medicationRequestCount}</TableCell>
                  <TableCell>{formatDateTime(patient.updatedAt)}</TableCell>
                  <TableCell>{formatDateTime(patient.sourceLastUpdated)}</TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.rows.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={9}>
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <Typography color="text.secondary">No patients found</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={data?.total ?? 0}
          page={page}
          onPageChange={(_e, newPage) => setPage(newPage)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          ActionsComponent={TablePaginationActions}
          sx={{ flexShrink: 0 }}
        />
      </Paper>
    </Container>
  );
}
