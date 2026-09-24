import { Route, Routes } from 'react-router';
import { ControlPanelPage } from '../pages/ControlPanelPage';
import { PatientDetailPage } from '../pages/PatientDetailPage';
import { PatientsPage } from '../pages/PatientsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PatientsPage />} />
      <Route path="/patients/:id" element={<PatientDetailPage />} />
      <Route path="/control-panel" element={<ControlPanelPage />} />
    </Routes>
  );
}
