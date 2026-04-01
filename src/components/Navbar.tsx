import { Link } from 'react-router-dom';
import UserMenu from './UserMenu';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { userProfile } = useAuth();

  return (
    <nav className="relative z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="container-page flex items-center justify-between py-3">
        <Link to="/" className="font-extrabold text-xl text-gradient">
          PagAÍ
        </Link>

        <div className="hidden md:flex items-center gap-6 text-base font-semibold text-slate-700">
          <Link to="/" className="hover:text-emerald-600 transition-colors">Home</Link>
          <Link to="/calendar" className="hover:text-emerald-600 transition-colors">Calendário</Link>
          {userProfile?.plan === 'pro' && (
             <Link to="/metrics" className="hover:text-emerald-600 transition-colors">Métricas</Link>
          )}
          <Link to="/quitados" className="hover:text-emerald-600 transition-colors">Quitados</Link>
          <Link to="/about" className="hover:text-emerald-600 transition-colors">Sobre</Link>
        </div>

        <UserMenu />
      </div>
    </nav>
  );
}