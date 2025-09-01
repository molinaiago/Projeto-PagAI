import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

// páginas já existentes
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import DebtorPage from './pages/Debtor';
import Metrics from './pages/Metrics';
import Profile from './pages/Profile';
import Archived from './pages/Archived';
// novas páginas do calendário
import CalendarYears from './pages/CalendarYears';
import CalendarMonths from './pages/CalendarMonths';
import CalendarMonthDebtors from './pages/CalendarMonthDebtors';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* autenticadas */}
        <Route path="/" element={<Home />} />
        <Route path="/debt/:id" element={<DebtorPage />} />
        <Route path="/metrics" element={<Metrics />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/archived" element={<Archived />} />
        {/* calendário */}
        <Route path="/calendar" element={<CalendarYears />} />
        <Route path="/calendar/:year" element={<CalendarMonths />} />
        <Route path="/calendar/:year/:month" element={<CalendarMonthDebtors />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
