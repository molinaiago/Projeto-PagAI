import AuthGuard from '../components/AuthGuard';
import Navbar from '../components/Navbar';
import BackgroundFX from '../components/BackgroundFX';
import Dashboard from './Dashboard';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <AuthGuard>
      <div className="bg-app">
        <BackgroundFX />
        <Navbar />
        {/* flex-1 garante que o conteúdo ocupa o espaço e o footer cola no fim */}
        <main className="relative z-10 container-page py-8 md:py-10 flex-1">
          <Dashboard />
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
