import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import DebtorPage from './pages/Debtor';
import Metrics from './pages/Metrics';
import Profile from './pages/Profile';
import Quitados from './pages/Quitados';
import CalendarYears from './pages/CalendarYears';
import CalendarMonths from './pages/CalendarMonths';
import CalendarMonthDebtors from './pages/CalendarMonthDebtors';
import PlansPage from './pages/PlansPage';
import About from './pages/About'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/about" element={<About />} />

        {/* Autenticadas */}
        <Route path="/" element={<Home />} />
        <Route path="/debt/:id" element={<DebtorPage />} />
        <Route path="/metrics" element={<Metrics />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/quitados" element={<Quitados />} />
        <Route path="/plans" element={<PlansPage />} />


        {/* Calendário */}
        <Route path="/calendar" element={<CalendarYears />} />
        <Route path="/calendar/:year" element={<CalendarMonths />} />
        <Route path="/calendar/:year/:month" element={<CalendarMonthDebtors />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}