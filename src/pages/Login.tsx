import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import BackgroundFX from '../components/BackgroundFX';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      nav('/');
    } catch {
      setError('Credenciais inválidas.');
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

          {/* CARD DE LOGIN */}
          <div className="card backdrop-blur">
            <div className="card-body">
              <h1 className="text-2xl font-bold text-center">Bem-vindo de volta</h1>
              <p className="text-sm text-slate-500 text-center">
                Acesse sua conta e gerencie seus devedores no <span className="logo-text font-semibold">PagAÍ</span>.
              </p>

              <form onSubmit={handleLogin} className="mt-6 grid gap-4">
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
                  autoComplete="current-password"
                  required
                />

                <button type="submit" className="btn-primary w-full">
                  Entrar
                </button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-slate-600">Não tem conta?</span>{' '}
                <Link
                  to="/register"
                  className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-lime-500 hover:from-emerald-700 hover:to-lime-600 transition"
                >
                  Registre-se
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
