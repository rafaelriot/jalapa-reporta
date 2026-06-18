'use client';

import React, { useState, useEffect } from 'react';

export default function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deviceType, setDeviceType] = useState('other'); // ios, android, desktop, other

  useEffect(() => {
    // 1. Comprobar si ya está instalado / modo standalone
    const isStandalone = typeof window !== 'undefined' && 
      (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
    
    if (isStandalone) return;

    // Detectar el sistema operativo para dar instrucciones personalizadas
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setDeviceType('ios');
    } else if (/android/.test(ua)) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }

    // Mostrar el banner de manera predeterminada para que el ciudadano siempre vea la opción
    setShowBanner(true);

    // 2. Escuchar el evento nativo de instalación (principalmente en Chrome/Edge en Android y Desktop)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      console.log('Jalapa Reporta instalada.');
      setInstallPrompt(null);
      setShowBanner(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleActionClick = async () => {
    if (installPrompt) {
      // Disparar prompt nativo si está disponible
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      console.log(`Resultado de instalación nativa: ${outcome}`);
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        setShowBanner(false);
      }
    } else {
      // Si no hay prompt nativo (Safari iOS, Firefox, etc.), mostrar modal de instrucciones
      setShowModal(true);
    }
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Banner Principal de Instalación */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white rounded-2xl p-4.5 mb-6 shadow-md border border-blue-600/30 flex items-center justify-between gap-4 animate-fade-in mx-1">
        <div className="flex items-center gap-3">
          <span className="text-3xl filter drop-shadow">📲</span>
          <div className="text-left">
            <h4 className="font-black text-sm tracking-tight">Instala como Aplicación</h4>
            <p className="text-[11px] text-blue-100 font-semibold leading-tight mt-0.5">
              {deviceType === 'ios' 
                ? 'Agrega la app a tu pantalla de inicio desde Safari.' 
                : 'Acceso directo en tu pantalla de inicio y mejor soporte offline.'}
            </p>
          </div>
        </div>
        <button
          onClick={handleActionClick}
          className="shrink-0 bg-white hover:bg-blue-50 active:scale-95 text-blue-800 text-xs font-black px-4.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          {installPrompt ? 'Instalar' : '¿Cómo instalar?'}
        </button>
      </div>

      {/* Modal de instrucciones paso a paso */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 space-y-5 text-left">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <span>📱</span> Instrucciones de Instalación
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-gray-750">
              {deviceType === 'ios' && (
                <div className="space-y-2.5">
                  <p className="font-extrabold text-blue-700">Para iPhone / iPad (Safari):</p>
                  <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                    <li>Presiona el botón de <strong>Compartir</strong> <span className="text-base">⎋</span> (icono de cuadro con flecha hacia arriba en la barra inferior).</li>
                    <li>Desplázate hacia abajo en el menú y selecciona <strong>"Agregar al inicio"</strong> <span className="text-base">➕</span>.</li>
                    <li>Presiona <strong>"Agregar"</strong> en la esquina superior derecha.</li>
                  </ol>
                </div>
              )}

              {deviceType === 'android' && (
                <div className="space-y-2.5">
                  <p className="font-extrabold text-blue-700">Para Android (Chrome / Edge):</p>
                  <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                    <li>Presiona los <strong>tres puntos</strong> <span className="text-base">⋮</span> en la esquina superior derecha del navegador.</li>
                    <li>Selecciona la opción <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</li>
                    <li>Confirma la instalación presionando <strong>"Instalar"</strong>.</li>
                  </ol>
                </div>
              )}

              {deviceType !== 'ios' && deviceType !== 'android' && (
                <div className="space-y-2.5">
                  <p className="font-extrabold text-blue-700">Para Computadora o laptops (Chrome / Edge / Brave):</p>
                  <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                    <li>En la barra de direcciones del navegador (donde escribes la URL), haz clic en el icono de **computadora con flecha hacia abajo** o presiona los tres puntos <span className="text-base">⋮</span> en la esquina.</li>
                    <li>Selecciona <strong>"Instalar Jalapa Reporta"</strong>.</li>
                    <li>Confirma la instalación.</li>
                  </ol>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer text-center block shadow-md shadow-blue-100"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
