import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Check, Share2, PlusSquare, ExternalLink, X, Laptop, Copy, Package, ShieldCheck } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    (window as any).deferredPrompt || null
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    
    setIsInstalled(isStandalone);

    // Detect device
    const ua = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(ua);
    const androidDevice = /android/.test(ua);
    setIsIOS(iosDevice);
    setIsAndroid(androidDevice);

    // Check if inside iframe
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    const promptListener = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const readyListener = () => {
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
      }
    };

    window.addEventListener('beforeinstallprompt', promptListener);
    window.addEventListener('pwa-prompt-ready', readyListener);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', promptListener);
      window.removeEventListener('pwa-prompt-ready', readyListener);
    };
  }, []);

  const triggerInstall = async (onShowGuideFallback: () => void) => {
    const promptEvent = deferredPrompt || (window as any).deferredPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
        (window as any).deferredPrompt = null;
      } catch (err) {
        console.error('Error al mostrar el prompt nativo:', err);
        onShowGuideFallback();
      }
    } else {
      // If native prompt is not available, show guided modal
      onShowGuideFallback();
    }
  };

  return {
    deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isInIframe,
    triggerInstall
  };
}

export function InstallAppBanner() {
  const { isInstalled, isIOS, isAndroid, isInIframe, triggerInstall, deferredPrompt } = useInstallPrompt();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) {
    return (
      <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <p className="font-black uppercase tracking-wider text-xs text-emerald-900">Modo App Nativa</p>
            <p className="text-emerald-700 font-medium">WLSPORTS está instalada y lista para usar sin conexión.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleInstallClick = () => {
    triggerInstall(() => setShowModal(true));
  };

  return (
    <>
      <div className="mb-6 relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl p-5 shadow-lg shadow-blue-500/25 border border-blue-400/30">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/40 text-xs font-black uppercase tracking-wider text-blue-100 mb-1 border border-white/10">
                {isIOS ? '🍎 App Oficial para iPhone / iPad' : '📲 App Oficial para tu Celular'}
              </div>
              <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                {isIOS ? 'Instalar WLSPORTS en tu iPhone' : 'Descargar e Instalar WLSPORTS'}
              </h3>
              <p className="text-xs text-blue-100/90 font-medium mt-0.5">
                {isIOS 
                  ? 'Descarga el perfil oficial para iPhone/iPad o instálala directamente desde Safari.' 
                  : deferredPrompt 
                    ? '¡Tu dispositivo está listo! Pulsa instalar para añadir la App directamente.' 
                    : 'Instálala como App independiente con acceso directo, offline y pantalla completa.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handleInstallClick}
              className="px-6 py-3 bg-white text-blue-700 hover:bg-blue-50 font-black text-sm rounded-2xl shadow-md transition-all active:scale-95 flex items-center gap-2 flex-shrink-0 animate-pulse"
            >
              <Download className="w-4 h-4" /> {isIOS ? 'Instalar en iPhone' : 'Instalar App Ahora'}
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <InstallGuideModal 
          onClose={() => setShowModal(false)}
          isIOS={isIOS}
          isAndroid={isAndroid}
          isInIframe={isInIframe}
        />
      )}
    </>
  );
}

export function InstallHeaderButton() {
  const { isInstalled, isIOS, isAndroid, isInIframe, triggerInstall } = useInstallPrompt();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) return null;

  const handleInstallClick = () => {
    triggerInstall(() => setShowModal(true));
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        title="Instalar aplicación en tu dispositivo"
        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instalar</span> App
      </button>

      {showModal && (
        <InstallGuideModal 
          onClose={() => setShowModal(false)}
          isIOS={isIOS}
          isAndroid={isAndroid}
          isInIframe={isInIframe}
        />
      )}
    </>
  );
}

interface ModalProps {
  onClose: () => void;
  isIOS: boolean;
  isAndroid: boolean;
  isInIframe: boolean;
}

function InstallGuideModal({ onClose, isIOS, isAndroid, isInIframe }: ModalProps) {
  const [copied, setCopied] = useState(false);
  const currentUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenInChromeAndroid = () => {
    // Android intent to escape WhatsApp or other in-app browsers directly into Google Chrome
    const cleanUrl = currentUrl.replace(/^https?:\/\//, '');
    window.location.href = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
  };

  const handleDownloadAppBundle = () => {
    // Generate a downloadable standalone HTML bundle that can be opened anywhere
    const offlineHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WLSPORTS Groups</title>
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #0f172a; font-family: sans-serif; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <iframe src="${currentUrl}"></iframe>
</body>
</html>`;

    const blob = new Blob([offlineHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'WLSPORTS-Groups-App.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0f1523] rounded-[32px] max-w-lg w-full p-6 shadow-2xl border border-slate-800 relative max-h-[92vh] overflow-y-auto text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white bg-slate-800/80 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/30">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Instalar WLSPORTS App</h3>
            <p className="text-xs text-slate-400 font-medium">Elige la opción para tu dispositivo:</p>
          </div>
        </div>

        {isInIframe && (
          <div className="mb-4 p-3.5 bg-amber-950/40 border border-amber-900/60 rounded-2xl text-xs text-amber-300 flex items-start gap-2.5">
            <span className="text-base">⚠️</span>
            <div>
              <p className="font-bold text-amber-200">Estás dentro de la ventana de Google AI Studio</p>
              <p className="text-amber-300/80 mt-0.5">
                Los navegadores bloquean la descarga directa dentro de esta ventana. Debes abrir el enlace en tu navegador habitual (Chrome, Safari) o en tu celular.
              </p>
            </div>
          </div>
        )}

        {isIOS ? (
          /* Secciones específicas para iPhone / iPad */
          <div className="space-y-4 mb-4">
            {/* Método 1: Perfil Apple Oficial */}
            <div className="p-4.5 rounded-2xl bg-gradient-to-br from-blue-950/60 to-indigo-950/60 border border-blue-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black">1</span>
                  <span className="font-black text-white text-sm sm:text-base">Instalación Oficial Apple (.mobileconfig)</span>
                </div>
                <span className="text-[10px] sm:text-xs font-black uppercase px-2.5 py-1 bg-blue-500/30 text-blue-200 border border-blue-400/40 rounded-full">Recomendado</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Descarga el perfil oficial de iOS para instalar WLSPORTS en la pantalla de inicio y biblioteca de tu iPhone como app nativa:
              </p>
              <a
                href="/api/download-ios-profile"
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 min-h-[44px]"
              >
                <Download className="w-4 h-4" /> Descargar Perfil para iPhone / iPad
              </a>
              <div className="p-3 bg-slate-900/90 rounded-xl border border-blue-900/40 space-y-2 text-xs text-slate-300">
                <p className="font-bold text-blue-300 text-xs uppercase tracking-wider">Pasos para activar en tu iPhone:</p>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">1.</span>
                  <span>Safari preguntará si permites la descarga: pulsa <strong>Permitir</strong> y luego <strong>Cerrar</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">2.</span>
                  <span>Abre la app <strong>Ajustes</strong> de tu iPhone y verás arriba <strong>"Perfil descargado"</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">3.</span>
                  <span>Tócalo, presiona <strong>Instalar</strong> arriba a la derecha, introduce tu código y confirma.</span>
                </div>
              </div>
            </div>

            {/* Método 2: Por Safari */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-black">2</span>
                <span className="font-black text-white text-sm">¿Por qué no salía "Agregar a inicio"?</span>
              </div>
              <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded-xl text-xs text-amber-200/90 leading-relaxed">
                <p className="font-bold text-amber-200 mb-1">Motivo habitual en iOS:</p>
                Si abriste el enlace desde <strong>WhatsApp, Gmail, Chrome iOS o modo privado</strong>, Apple <strong>oculta deliberadamente</strong> la opción de agregar apps.
              </div>
              <p className="text-xs text-slate-400">
                Para hacerlo manual, copia el enlace, pégalo en <strong>Safari oficial</strong>, toca Compartir y si no ves la opción, baja hasta <strong>"Editar acciones..."</strong> para activarla.
              </p>
            </div>
          </div>
        ) : (
          /* Secciones para Android / PC */
          <>
            {/* Action 1: Forzar apertura en Chrome (Android) */}
            <div className="mb-4 p-4 rounded-2xl bg-blue-950/40 border border-blue-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                  <span className="font-black text-white text-sm">Abrir en Google Chrome (Móvil)</span>
                </div>
                <span className="text-xs font-bold uppercase px-2.5 py-1 bg-blue-900/60 text-blue-300 border border-blue-700/60 rounded-full">Recomendado</span>
              </div>
              <p className="text-xs text-slate-300">
                Si abriste el enlace desde WhatsApp u otra app, pulsa este botón para pasarte a Chrome y activar la instalación:
              </p>
              <button
                onClick={handleOpenInChromeAndroid}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 min-h-[44px]"
              >
                <ExternalLink className="w-4 h-4" /> Abrir en la App de Google Chrome
              </button>
            </div>

            {/* Action 2: Escanear con Cámara */}
            <div className="mb-4 p-4 bg-slate-900 rounded-2xl border border-slate-800 text-center">
              <p className="font-black text-white text-xs sm:text-sm uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5">
                <Smartphone className="w-4 h-4 text-blue-400" />
                O Escanea con la cámara de tu celular
              </p>
              <div className="inline-block p-2 bg-white rounded-2xl shadow-xs border border-slate-700">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=2&data=${encodeURIComponent(currentUrl)}`} 
                  alt="Código QR para abrir en celular" 
                  className="w-32 h-32 mx-auto rounded-lg"
                  loading="eager"
                />
              </div>
              <p className="text-xs text-slate-400 font-medium mt-1.5">
                Apunta la cámara de tu móvil para abrir directamente.
              </p>
            </div>

            {/* Action 3: Opciones adicionales (APK / Bundle) */}
            <div className="space-y-2.5 mb-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-300">Otras formas de descarga:</p>
              
              <div className="p-3 bg-slate-900 hover:bg-slate-850 rounded-2xl border border-slate-800 flex items-center justify-between gap-2 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Package className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-xs sm:text-sm font-bold text-white">Descargar APK para Android (Nativo)</p>
                    <p className="text-xs text-slate-400">Paquete .apk firmado (se instala en el cajón de apps)</p>
                  </div>
                </div>
                <a
                  href="/WLSPORTS-Groups.apk"
                  download="WLSPORTS-Groups.apk"
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-colors flex-shrink-0 min-h-[36px]"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar APK
                </a>
              </div>

              <div className="p-3 bg-slate-900 hover:bg-slate-850 rounded-2xl border border-slate-800 flex items-center justify-between gap-2 transition-colors">
                <div className="flex items-center gap-2.5">
                  <Download className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-xs sm:text-sm font-bold text-white">Descargar Archivo Web Offline</p>
                    <p className="text-xs text-slate-400">Guarda el lanzador en tu móvil para usarlo sin internet</p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadAppBundle}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-colors flex-shrink-0 min-h-[36px]"
                >
                  Descargar <Download className="w-3 h-3" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" /> ¡Enlace Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" /> Copiar Enlace Directo
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-black text-xs rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
