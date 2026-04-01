import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import BackgroundFX from '../components/BackgroundFX';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Envia email de verificação
      await sendEmailVerification(user);

      // Cria o documento do usuário no Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        plan: 'free',
        createdAt: Date.now(),
        debtorsCount: 0,
      });

      setSuccessMessage(
        'Conta criada com sucesso! Verifique seu e-mail para ativar sua conta antes de fazer o login.'
      );
    } catch (err: any) {
      console.error("Erro no registro:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso por outra conta.');
      } else {
        setError('Não foi possível criar sua conta. Verifique os dados.');
      }
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
              <h1 className="text-2xl font-bold text-center">Criar conta</h1>
              <p className="text-sm text-slate-500 text-center">
                Crie sua conta para usufruir das funcionalidades do <span className="logo-text font-semibold">PagAÍ</span>!
              </p>

              {successMessage ? (
                <div className="mt-6 text-center p-4 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <p className="font-semibold">Quase lá!</p>
                  <p>{successMessage}</p>
                  <Link to="/login" className="btn-primary mt-4 inline-block">
                    Ir para o Login
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="mt-6 grid gap-4">
                  {error && <div className="text-red-600 text-sm text-center">{error}</div>}

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
                    placeholder="Senha (mínimo 6 caracteres)"
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
              )}

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

          <p className="mt-4 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} PagAÍ
          </p>
        </div>
      </main>
    </div>
  );
}
