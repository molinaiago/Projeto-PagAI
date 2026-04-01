import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';

type PixModalProps = {
  isOpen: boolean;
  onClose: () => void;
  qrCodeBase64: string | null; 
  qrCode: string;
  paymentId: string;
};

export default function PixPaymentModal({ isOpen, onClose, qrCodeBase64, qrCode, paymentId }: PixModalProps) {
  const { userProfile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'failed'>('pending');

  // Monitora mudanças no perfil do usuário para detectar quando o pagamento é confirmado
  useEffect(() => {
    if (!isOpen || !userProfile) return;

    const unsubscribe = onSnapshot(doc(db, 'users', userProfile.uid), (doc) => {
      const userData = doc.data();
      
      // Se o plano mudou para PRO e tem o paymentId correto, pagamento foi aprovado
      if (userData?.plan === 'pro' && userData?.mercadoPagoPaymentId === paymentId) {
        setPaymentStatus('approved');
        
        // Fecha o modal automaticamente após 3 segundos
        setTimeout(() => {
          onClose();
          // Recarrega a página para atualizar a interface
          window.location.reload();
        }, 3000);
      }
    });

    return () => unsubscribe();
  }, [isOpen, userProfile, paymentId, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fallbackQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-body text-center">
          <h2 className="text-xl font-semibold mb-4">
            {paymentStatus === 'approved' ? 'Pagamento Confirmado! 🎉' : 'Pague com PIX para fazer o Upgrade'}
          </h2>
          
          {paymentStatus === 'approved' ? (
            <div className="py-4">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-emerald-700 font-semibold">
                Seu upgrade para PRO foi confirmado!
              </p>
              <p className="text-sm text-slate-600 mt-2">
                Redirecionando em 3 segundos...
              </p>
            </div>
          ) : (
            <>
              <p className="text-slate-600 mb-4">
                Abra o aplicativo do seu banco, escaneie o QR Code abaixo ou use o código "Copia e Cola".
              </p>

              {qrCodeBase64 ? (
                <img
                  src={`data:image/png;base64,${qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="mx-auto w-48 h-48 border-4 border-white rounded-lg shadow-lg"
                  onError={(e) => {
                    e.currentTarget.src = fallbackQrCodeUrl;
                  }}
                />
              ) : (
                <img
                  src={fallbackQrCodeUrl}
                  alt="QR Code PIX"
                  className="mx-auto w-48 h-48 border-4 border-white rounded-lg shadow-lg"
                />
              )}

              <p className="text-sm text-slate-500 mt-4">Ou copie o código PIX:</p>

              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={qrCode || ''}
                  className="input text-xs font-mono flex-1"
                />
                <button onClick={handleCopy} className="btn-primary shrink-0">
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              
              <p className="mt-6 font-semibold text-emerald-700 animate-pulse">
                ⏳ Por favor, aguarde enquanto validamos seu pagamento...
              </p>

              <p className="text-xs text-slate-500 mt-1">
                O site será atualizado automaticamente assim que o pagamento for confirmado.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
