import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import {
  Box,
  Button,
  Chip,
  Container,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  fetchPatient,
  fetchPatientConditions,
  fetchPatientMedicationRequests,
} from '../api/patients';
import { TablePaginationActions } from '../components/TablePaginationActions';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'conditions' | 'medications'>('conditions');

  const patientQuery = useQuery({
    queryKey: ['patient', id],
    queryFn: () => fetchPatient(id!),
    enabled: !!id,
  });

  return (
    <Container
      maxWidth="lg"
      sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}
    >
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/')}
        sx={{ mb: 2, flexShrink: 0, alignSelf: 'flex-start' }}
      >
        Back to patients
      </Button>

      <Paper variant="outlined" sx={{ p: 3, mb: 3, flexShrink: 0 }}>
        {patientQuery.isLoading && <Typography color="text.secondary">Loading patient…</Typography>}
        {patientQuery.isError && (
          <Typography color="error">
            {patientQuery.error instanceof Error
              ? patientQuery.error.message
              : 'Failed to load patient'}
          </Typography>
        )}
        {patientQuery.data && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={4}
            sx={{ alignItems: { sm: 'center' } }}
          >
            <Box>
              <Typography variant="h5" component="h1">
                {patientQuery.data.fullName ?? 'Unnamed patient'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                FHIR ID: {patientQuery.data.fhirId}
              </Typography>
            </Box>
            <Chip label={patientQuery.data.source} size="small" />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Gender
              </Typography>
              <Typography variant="body2">{patientQuery.data.gender ?? '—'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Birth date
              </Typography>
              <Typography variant="body2">
                {patientQuery.data.birthDate
                  ? new Date(patientQuery.data.birthDate).toLocaleDateString()
                  : '—'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Identifier
              </Typography>
              <Typography variant="body2">{patientQuery.data.identifierValue ?? '—'}</Typography>
            </Box>
          </Stack>
        )}
      </Paper>

      <Tabs value={tab} onChange={(_e, value) => setTab(value)} sx={{ mb: 2, flexShrink: 0 }}>
        <Tab label="Conditions" value="conditions" />
        <Tab label="Medication requests" value="medications" />
      </Tabs>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {id && tab === 'conditions' && <ConditionsTab patientId={id} />}
        {id && tab === 'medications' && <MedicationsTab patientId={id} />}
      </Box>
    </Container>
  );
}

const SOURCE_OPTIONS = [
  { value: '', label: 'All sources' },
  { value: 'HAPI_FHIR', label: 'HAPI FHIR' },
  { value: 'ORACLE_HEALTH', label: 'Oracle Health' },
  { value: 'EPIC', label: 'Epic' },
];

function ConditionsTab({ patientId }: { patientId: string }) {
  const [codeText, setCodeText] = useState('');
  const [fhirId, setFhirId] = useState('');
  const [source, setSource] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const debouncedCodeText = useDebouncedValue(codeText);
  const debouncedFhirId = useDebouncedValue(fhirId);

  const { data, isLoading } = useQuery({
    queryKey: [
      'patientConditions',
      patientId,
      debouncedCodeText,
      debouncedFhirId,
      source,
      page,
      pageSize,
    ],
    queryFn: () =>
      fetchPatientConditions(
        patientId,
        {
          codeText: debouncedCodeText || undefined,
          fhirId: debouncedFhirId || undefined,
          source: source || undefined,
        },
        { page: page + 1, pageSize },
      ),
    placeholderData: (previous) => previous,
  });

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexShrink: 0 }}>
        <TextField
          label="Condition"
          size="small"
          value={codeText}
          onChange={(e) => {
            setCodeText(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 220 }}
        />
        <TextField
          label="FHIR ID"
          size="small"
          value={fhirId}
          onChange={(e) => {
            setFhirId(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 180 }}
        />
        <TextField
          select
          label="Source"
          size="small"
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 180 }}
        >
          {SOURCE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Paper
        variant="outlined"
        sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Condition</TableCell>
                <TableCell>Clinical status</TableCell>
                <TableCell>FHIR ID</TableCell>
                <TableCell>Source</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.rows ?? []).map((condition) => (
                <TableRow key={condition.id}>
                  <TableCell>{condition.codeText ?? '—'}</TableCell>
                  <TableCell>{condition.clinicalStatus ?? '—'}</TableCell>
                  <TableCell>{condition.fhirId}</TableCell>
                  <TableCell>
                    <Chip label={condition.source} size="small" />
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.rows.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <Typography color="text.secondary">No conditions found</Typography>
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
          rowsPerPageOptions={[10, 25, 50]}
          ActionsComponent={TablePaginationActions}
          sx={{ flexShrink: 0 }}
        />
      </Paper>
    </Box>
  );
}

function MedicationsTab({ patientId }: { patientId: string }) {
  const [medicationText, setMedicationText] = useState('');
  const [fhirId, setFhirId] = useState('');
  const [source, setSource] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const debouncedMedicationText = useDebouncedValue(medicationText);
  const debouncedFhirId = useDebouncedValue(fhirId);

  const { data, isLoading } = useQuery({
    queryKey: [
      'patientMedications',
      patientId,
      debouncedMedicationText,
      debouncedFhirId,
      source,
      page,
      pageSize,
    ],
    queryFn: () =>
      fetchPatientMedicationRequests(
        patientId,
        {
          medicationText: debouncedMedicationText || undefined,
          fhirId: debouncedFhirId || undefined,
          source: source || undefined,
        },
        { page: page + 1, pageSize },
      ),
    placeholderData: (previous) => previous,
  });

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexShrink: 0 }}>
        <TextField
          label="Medication"
          size="small"
          value={medicationText}
          onChange={(e) => {
            setMedicationText(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 220 }}
        />
        <TextField
          label="FHIR ID"
          size="small"
          value={fhirId}
          onChange={(e) => {
            setFhirId(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 180 }}
        />
        <TextField
          select
          label="Source"
          size="small"
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 180 }}
        >
          {SOURCE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Paper
        variant="outlined"
        sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Medication</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>FHIR ID</TableCell>
                <TableCell>Source</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.rows ?? []).map((medication) => (
                <TableRow key={medication.id}>
                  <TableCell>{medication.medicationText ?? '—'}</TableCell>
                  <TableCell>{medication.status ?? '—'}</TableCell>
                  <TableCell>{medication.fhirId}</TableCell>
                  <TableCell>
                    <Chip label={medication.source} size="small" />
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.rows.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <Typography color="text.secondary">No medication requests found</Typography>
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
          rowsPerPageOptions={[10, 25, 50]}
          ActionsComponent={TablePaginationActions}
          sx={{ flexShrink: 0 }}
        />
      </Paper>
    </Box>
  );
}
