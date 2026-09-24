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
  Typography,
} from '@mui/material';
import { fetchPatients } from '../api/patients';
import { TablePaginationActions } from '../components/TablePaginationActions';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const SOURCE_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'HAPI_FHIR', label: 'HAPI FHIR' },
  { value: 'ORACLE_HEALTH', label: 'Oracle Health' },
  { value: 'EPIC', label: 'Epic' },
];

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
        <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Full name</TableCell>
                <TableCell>FHIR ID</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Gender</TableCell>
                <TableCell>Birth date</TableCell>
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
                  <TableCell>{patient.fullName ?? '—'}</TableCell>
                  <TableCell>{patient.fhirId}</TableCell>
                  <TableCell>
                    <Chip label={patient.source} size="small" />
                  </TableCell>
                  <TableCell>{patient.gender ?? '—'}</TableCell>
                  <TableCell>
                    {patient.birthDate ? new Date(patient.birthDate).toLocaleDateString() : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.rows.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
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
