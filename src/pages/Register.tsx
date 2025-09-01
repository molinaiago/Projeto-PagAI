import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import BackgroundFX from '../components/BackgroundFX';

export default function Register() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      nav('/');
    } catch {
      setError('Não foi possível criar sua conta. Verifique os dados.');
    }
  }

  return (
    <div className="bg-app">
      <BackgroundFX />

      <main className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* LOGO DESTACADA */}
          <div className="mb-6 text-center">
            <span
              className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-lime-500 bg-clip-text text-transparent [text-shadow:0_0_12px_rgba(16,185,129,.45)]"
              aria-label="PagAÍ"
            >
              PagAÍ
            </span>
          </div>

          {/* CARD DE REGISTRO */}
          <div className="card backdrop-blur">
            <div className="card-body">
              <h1 className="text-2xl font-bold text-center">Criar conta</h1>
              <p className="text-sm text-slate-500 text-center">
                Crie sua conta para usufruir das funcionalidades do <span className="logo-text font-semibold">PagAÍ</span>!
              </p>

              <form onSubmit={handleRegister} className="mt-6 grid gap-4">
                {error && <div className="text-red-600 text-sm">{error}</div>}

                <input
                  type="email"
                  placeholder="E-mail"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />

                <input
                  type="password"
                  placeholder="Senha"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />

                <button type="submit" className="btn-primary w-full">
                  Criar conta
                </button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-slate-600">Já tem conta?</span>{' '}
                <Link
                  to="/login"
                  className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-lime-500 hover:from-emerald-700 hover:to-lime-600 transition"
                >
                  Entrar
                </Link>
              </div>
            </div>
          </div>

          {/* rodapézinho opcional */}
          <p className="mt-4 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} PagAÍ
          </p>
        </div>
      </main>
    </div>
  );
}
