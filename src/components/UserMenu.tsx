import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // fecha ao clicar fora / ESC
  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOut);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOut);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-emerald-200 hover:bg-emerald-50"
        aria-label="menu"
        aria-expanded={open}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="#047857" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-emerald-200 shadow-[0_12px_28px_rgba(16,185,129,.15)] z-50">
          <div className="p-2">
            {/* 1) Perfil (sempre no topo) */}
            <Link
              to="/profile"
              className="block px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800"
              onClick={() => setOpen(false)}
            >
              👤 Meu perfil
            </Link>

            {/* 2) Calendário */}
            <Link
              to="/calendar"
              className="block px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800"
              onClick={() => setOpen(false)}
            >
              📅 Calendário
            </Link>

            {/* 3) Métricas */}
            <Link
              to="/metrics"
              className="block px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800"
              onClick={() => setOpen(false)}
            >
              📊 Métricas
            </Link>

            {/* 4) Arquivados (NOVO) */}
            <Link
              to="/archived"
              className="block px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800"
              onClick={() => setOpen(false)}
            >
              📂 Arquivados
            </Link>

            {/* Sair */}
            <button
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-red-600"
              onClick={() => {
                setOpen(false);
                import('../lib/auth').then(m => m.logout?.());
              }}
            >
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
