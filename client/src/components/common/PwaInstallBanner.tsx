import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-brand-700 to-brand-900 text-white px-4 py-3 shadow-lg flex items-center justify-between text-sm">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
          <Download className="w-4 h-4 text-emerald-300" />
        </div>
        <div>
          <p className="font-semibold text-xs md:text-sm">Install MSA HR App on your phone</p>
          <p className="text-[11px] text-emerald-200">Faster punch-ins & instant access</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleInstall}
          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-brand-950 font-bold text-xs rounded-xl shadow-sm transition"
        >
          Install App
        </button>
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-white/10 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
