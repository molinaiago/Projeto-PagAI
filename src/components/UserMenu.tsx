import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function UserMenu() {
  const { userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={() => setOpen(o => !o)} className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-emerald-200 hover:bg-emerald-50" aria-label="menu" aria-expanded={open}>
        <svg width="20" height="20" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke="#047857" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-emerald-200 shadow-[0_12px_28px_rgba(16,185,129,.15)] z-50">
          <div className="p-2 space-y-1">
            <Link to="/profile" className="block px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800" onClick={() => setOpen(false)}>👤 Meu perfil</Link>
            <Link to="/calendar" className="block px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-800" onClick={() => setOpen(false)}>📅 Calendário</Link>
            
            {userProfile?.plan === 'free' && (
              <>
                <hr className="my-1 border-slate-200" />
                <Link to="/plans" className="block px-3 py-2 rounded-lg text-emerald-700 font-semibold hover:bg-emerald-50" onClick={() => setOpen(false)}>
                  🚀 Fazer Upgrade
                </Link>
              </>
            )}

            {userProfile?.plan === 'pro' && (
              <>
                <hr className="my-1 border-slate-200" />
                <Link to="/plans" className="block px-3 py-2 rounded-lg text-emerald-700 font-semibold hover:bg-emerald-50" onClick={() => setOpen(false)}>
                  ✅ Plano PRO Ativo
                </Link>
              </>
            )}

            <hr className="my-1 border-slate-200" />
            <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-red-600" onClick={() => { setOpen(false); import('../lib/auth').then(m => m.logout?.()); }}>
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}