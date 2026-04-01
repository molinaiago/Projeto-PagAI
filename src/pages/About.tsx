import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import BackgroundFX from '../components/BackgroundFX';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

export default function AboutPage() {
  const [user, setUser] = useState<any>(null);
  const nav = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-app min-h-screen relative">
      <BackgroundFX />

      {/* Navbar apenas se estiver logado */}
      {user && <Navbar />}

      <main className="relative z-10 container-page py-8 md:py-10 flex-1">
        <div className="card max-w-4xl mx-auto">
          <div className="card-body prose prose-emerald">
            <h1>Sobre o PagAÍ 🚀</h1>
            <p>
              O <strong>PagAÍ</strong> foi criado para simplificar a gestão de dívidas, oferecendo uma solução rápida, prática e confiável. Seja você um profissional autônomo, um pequeno comerciante ou alguém que deseja organizar pagamentos pendentes, nossa plataforma foi pensada para tornar o seu dia a dia mais eficiente.
            </p>
            
            <h2>Nossos Planos 💼</h2>
            <p>Para atender diferentes necessidades, oferecemos duas opções:</p>
            <ul>
              <li>
                <strong>Plano Grátis:</strong> Ideal para quem está começando. Permite gerenciar até 3 devedores ativos simultaneamente. Quando necessário, você pode substituir um devedor antigo por um novo sem complicações.
              </li>
              <li>
                <strong>Plano PRO:</strong> Para quem busca controle total. Com devedores ilimitados, você terá acesso à nossa avançada página de Métricas 📊, com gráficos e relatórios detalhados para monitorar seus resultados.
              </li>
            </ul>

            <h2>Compromisso com a Qualidade ✨</h2>
            <p>
              Estamos constantemente aprimorando o PagAÍ para entregar mais funcionalidades e uma experiência cada vez melhor. Fique atento às atualizações e novidades!
            </p>

            <h2>Contato 📬</h2>
            <p>
              Este projeto foi desenvolvido com dedicação, utilizando tecnologias modernas e práticas de desenvolvimento de ponta. Para sugestões, parcerias ou para conhecer mais sobre meu trabalho, conecte-se comigo no LinkedIn:
            </p>
            <a href="https://www.linkedin.com/in/molinaiago/" target="_blank" rel="noopener noreferrer">
              linkedin.com/in/molinaiago
            </a>
          </div>
        </div>

        {!user && (
          <div className="max-w-4xl mx-auto mt-6 text-center">
            <button
              className="btn-primary"
              onClick={() => nav('/login')}
            >
              ← Voltar para Login
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
