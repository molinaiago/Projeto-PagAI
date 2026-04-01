import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import BackgroundFX from '../components/BackgroundFX';
import ConfirmModal from '../components/ConfirmModal';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'credentials' | 'unverified' | null>(null);
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setErrorType(null);
    setInfoMessage('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        setError('Você precisa confirmar seu e-mail antes de fazer login. Verifique sua caixa de entrada.');
        setErrorType('unverified');
        await auth.signOut();
        setLoading(false);
        return;
      }

      nav('/');
    } catch (err: any) {
      console.error(err);
      setErrorType('credentials');
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Credenciais inválidas.');
      } else {
        setError('Erro ao tentar fazer login.');
      }
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user.emailVerified) {
        setInfoMessage('Seu e-mail já está confirmado. Você pode fazer login normalmente.');
        await auth.signOut();
      } else {
        await sendEmailVerification(user);
        setInfoMessage('E-mail de verificação reenviado! Verifique sua caixa de entrada.');
        await auth.signOut();
      }
    } catch (err: any) {
      console.error(err);
      setError('Não foi possível reenviar o e-mail. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendResetEmail() {
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      if (!email) throw new Error('Informe o e-mail');
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/login`, // Redireciona pro login após reset
      });
      setInfoMessage('E-mail de redefinição enviado! Verifique sua caixa de entrada.');
      setIsForgotModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setError('Não foi possível enviar o e-mail. Verifique o e-mail informado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-app">
      <BackgroundFX />

      <main className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <span
              className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-lime-500 bg-clip-text text-transparent [text-shadow:0_0_12px_rgba(16,185,129,.45)]"
              aria-label="PagAÍ"
            >
              PagAÍ
            </span>
          </div>

          <div className="card backdrop-blur">
            <div className="card-body">
              <h1 className="text-2xl font-bold text-center">Bem-vindo de volta</h1>
              <p className="text-sm text-slate-500 text-center">
                Acesse sua conta e gerencie seus devedores no <span className="logo-text font-semibold">PagAÍ</span>.
              </p>

              {error && (
                <div className="mt-4 text-center p-2 rounded bg-red-50 text-red-700 border border-red-200">
                  {errorType === 'unverified' ? (
                    <>
                      {error}
                      <div className="mt-2">
                        <button
                          onClick={handleResendVerification}
                          disabled={loading}
                          className="btn-primary text-sm"
                        >
                          Reenviar e-mail de verificação
                        </button>
                      </div>
                    </>
                  ) : (
                    <>{error}</>
                  )}
                </div>
              )}

              {infoMessage && (
                <div className="mt-4 text-center p-2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {infoMessage}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-6 grid gap-4">
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

                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Aguarde...' : 'Entrar'}
                </button>
              </form>

              <p className="mt-2 text-right text-sm">
                <button
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={() => setIsForgotModalOpen(true)}
                >
                  Esqueci minha senha
                </button>
              </p>

              <div className="mt-6 text-center text-sm">
                <span className="text-slate-600">Não tem conta?</span>{' '}
                <Link
                  to="/register"
                  className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-lime-500 hover:from-emerald-700 hover:to-lime-600 transition"
                >
                  Registre-se
                </Link>
              </div>

              <p className="mt-4 text-center text-sm text-slate-500">
                Quer saber mais sobre o <strong>PagAÍ</strong>?{' '}
                <Link
                  to="/about"
                  className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-lime-500 hover:from-emerald-700 hover:to-lime-600 transition"
                >
                  Clique aqui
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} PagAÍ
          </p>
        </div>
      </main>

      {/* Modal de redefinição de senha */}
      <ConfirmModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        onConfirm={handleSendResetEmail}
        title="Redefinir senha"
        confirmText="Enviar e-mail"
      >
        <p className="mb-2 text-slate-600">
          Informe seu e-mail para receber o link de redefinição de senha.
        </p>
        <input
          type="email"
          className="input w-full"
          placeholder="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </ConfirmModal>
    </div>
  );
}
