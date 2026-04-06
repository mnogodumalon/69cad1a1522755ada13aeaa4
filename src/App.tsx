import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import WerkzeugausgabePage from '@/pages/WerkzeugausgabePage';
import WerkzeugkatalogPage from '@/pages/WerkzeugkatalogPage';
import WartungsUndPruefungsprotokollPage from '@/pages/WartungsUndPruefungsprotokollPage';
import MitarbeiterverwaltungPage from '@/pages/MitarbeiterverwaltungPage';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ActionsProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="werkzeugausgabe" element={<WerkzeugausgabePage />} />
              <Route path="werkzeugkatalog" element={<WerkzeugkatalogPage />} />
              <Route path="wartungs-und-pruefungsprotokoll" element={<WartungsUndPruefungsprotokollPage />} />
              <Route path="mitarbeiterverwaltung" element={<MitarbeiterverwaltungPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </ActionsProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
