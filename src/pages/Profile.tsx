import { useState } from 'react';
import AuthGuard from '../components/AuthGuard';
import Navbar from '../components/Navbar';
import BackgroundFX from '../components/BackgroundFX';
import Footer from '../components/Footer';
import { auth } from '../lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

export default function Profile() {
  const user = auth.currentUser!;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      setLoading(true);
      const cred = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      setMsg('Senha atualizada com sucesso.');
      setCurrentPassword(''); setNewPassword('');
    } catch {
      setErr('Não foi possível alterar a senha. Verifique a senha atual.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      <div className="bg-app">
        <BackgroundFX />
        <Navbar />
        <main className="relative z-10 container-page py-8 md:py-10 flex-1 space-y-6">
          <div className="card">
            <div className="card-body">
              <h1 className="h1">Meu perfil</h1>
              <p className="muted mt-1">Gerencie sua conta.</p>

              <div className="mt-6 grid gap-4">
                <div>
                  <div className="label">E-mail</div>
                  <div className="px-4 py-3 rounded-xl border border-slate-200 bg-white">{user.email}</div>
                </div>

                <form onSubmit={handleChangePassword} className="grid gap-3 md:grid-cols-3">
                  <input className="input" type="password" placeholder="Senha atual"
                    value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} required />
                  <input className="input" type="password" placeholder="Nova senha"
                    value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} required />
                  <button disabled={loading} className="btn-primary">
                    {loading ? 'Salvando...' : 'Alterar senha'}
                  </button>
                </form>

                {msg && <div className="text-emerald-700">{msg}</div>}
                {err && <div className="text-red-600">{err}</div>}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
