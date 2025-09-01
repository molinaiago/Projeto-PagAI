import { Link } from 'react-router-dom';
import UserMenu from './UserMenu';

export default function Navbar() {
  return (
    <nav className="relative z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="container-page flex items-center justify-between py-3">
        {/* Logo */}
        <Link to="/" className="font-extrabold text-xl text-gradient">
          PagAÍ
        </Link>

        {/* Links simples no desktop (sem Arquivados aqui) */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="hover:underline">Home</Link>
          <Link to="/metrics" className="hover:underline">Métricas</Link>
          <Link to="/calendar" className="hover:underline">Calendário</Link>
          <Link to="/archived" className="hover:underline">Arquivados</Link>
        </div>

        {/* Menu do usuário (hambúrguer + dropdown) */}
        <UserMenu />
      </div>
    </nav>
  );
}
