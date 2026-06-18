// Utilidades para suscripción a notificaciones push en el cliente

const LOCAL_STORAGE_KEY = 'jalapa_reporta_suscripciones_push';

// Helper para convertir la clave VAPID pública a Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registrarServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registrado correctamente:', registration);
    return registration;
  } catch (err) {
    console.error('Error al registrar el Service Worker:', err);
    return null;
  }
}

export async function suscribirAPush(reporteId, folio) {
  if (typeof window === 'undefined') return { success: false, error: 'Entorno inválido' };

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'Tu navegador o dispositivo no soporta notificaciones push.' };
  }

  try {
    // 1. Asegurar registro del SW
    const reg = await registrarServiceWorker();
    if (!reg) {
      return { success: false, error: 'No se pudo inicializar el Service Worker.' };
    }

    // 2. Solicitar permiso de notificaciones
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Permiso de notificaciones denegado por el usuario.' };
    }

    // 3. Obtener la clave pública VAPID
    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicVapidKey) {
      console.error('Falta la clave VAPID pública en el entorno.');
      return { success: false, error: 'Error de configuración en el servidor (Falta VAPID key).' };
    }

    const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey);

    // 4. Suscribirse en el Push Service del navegador/SO
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });

    // 5. Guardar la suscripción en nuestra base de datos a través de la API local
    const response = await fetch('/api/push/suscribir', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reporteId,
        subscription
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error en el servidor al registrar la suscripción');
    }

    // 6. Registrar suscripción en localStorage local
    marcarComoSuscrito(reporteId);

    return { success: true };
  } catch (err) {
    console.error('Fallo al suscribir a notificaciones push:', err);
    return { success: false, error: err.message || 'Error desconocido al activar notificaciones.' };
  }
}

// Comprueba si ya estamos suscritos en el almacenamiento local para un reporte específico
export function estaSuscrito(reporteId) {
  if (typeof window === 'undefined') return false;
  try {
    const suscripciones = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
    return !!suscripciones[reporteId];
  } catch (e) {
    return false;
  }
}

// Registra la suscripción de forma local
function marcarComoSuscrito(reporteId) {
  if (typeof window === 'undefined') return;
  try {
    const suscripciones = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
    suscripciones[reporteId] = true;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(suscripciones));
  } catch (e) {
    console.error('Error al guardar suscripción local en localStorage:', e);
  }
}
