import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Smartphone, Check, PackageCheck, AlertCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    (window as any).deferredPrompt || null
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  useEffect(() => {
    // Detect if already installed or in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isAppleDevice);

    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleReady = () => {
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('pwa-prompt-ready', handleReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('pwa-prompt-ready', handleReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Hide button automatically if already installed
  if (isInstalled) {
    return null;
  }

  const triggerApkDownload = () => {
    setDownloadStarted(true);
    const link = document.createElement('a');
    link.href = '/WLSPORTS-Groups.apk';
    link.download = 'WLSPORTS-Groups.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClick = () => {
    setShowModal(true);
    if (!isIOS) {
      triggerApkDownload();
    }
  };

  const handlePwaPrompt = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setShowModal(false);
        }
      } catch (err) {
        console.error('Error al ejecutar prompt:', err);
      }
    }
  };

  return (
    <>
      <button
        id="btn-pwa-install"
        onClick={handleClick}
        title="Descargar e instalar WLSPORTS en tu celular"
        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all cursor-pointer flex-shrink-0 animate-pulse"
      >
        <Download className="w-4 h-4" />
        <span>Instalar App (APK)</span>
      </button>

      {/* Modal de descarga e instalación */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative text-left">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shadow-emerald-600/30">
                <PackageCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Instalador WLSPORTS</h3>
                <p className="text-xs text-slate-500 font-medium">App Nativa para Android</p>
              </div>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">En iPhone / iPad (Safari):</p>
                <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">1</span>
                  <p>Toca el botón <strong>Compartir</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-blue-600" /> en la barra inferior de Safari.</p>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">2</span>
                  <p>Desliza y selecciona <strong className="inline-flex items-center gap-1 font-bold text-slate-900"><PlusSquare className="w-3.5 h-3.5 text-slate-700" /> "Agregar a pantalla de inicio"</strong>.</p>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">3</span>
                  <p>Presiona <strong>"Agregar"</strong> y se guardará como App en tu iPhone.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Descarga del archivo APK iniciada</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    Archivo: <strong>WLSPORTS-Groups.apk</strong> (~1 MB)
                  </p>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <p className="font-bold text-slate-900">Pasos para completar la instalación:</p>
                  
                  <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">1</span>
                    <p>Baja la barra de notificaciones de tu teléfono o ve a la carpeta <strong>Descargas</strong>.</p>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">2</span>
                    <p>Toca <strong>WLSPORTS-Groups.apk</strong> y presiona <strong>Instalar</strong>.</p>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">3</span>
                    <p>¡Listo! La aplicación aparecerá en el <strong>cajón de aplicaciones</strong> con su icono oficial.</p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={triggerApkDownload}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Download className="w-4 h-4" /> Volver a Descargar APK
                  </button>

                  {deferredPrompt && (
                    <button
                      onClick={handlePwaPrompt}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-blue-600" /> O Instalar mediante Navegador
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
