import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import webpush from 'web-push';

// Configurar credenciales VAPID
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    'mailto:ayuntamiento.jalapa.tab@gmail.com',
    publicVapidKey,
    privateVapidKey
  );
}

const CATEGORIAS_MAP = {
  bache: '🕳️ Bache o Hoyo',
  luminaria: '💡 Luz Fundida',
  basura: '🗑️ Basura o Basurero',
  fuga_agua: '🚰 Fuga de Agua',
  camino_rural: '🚜 Camino Feo',
  drenaje: '🌊 Drenaje Tapado',
  otro: '📋 Otro Problema'
};

const ESTADOS_MAP = {
  pendiente: 'Pendiente ⏳',
  en_proceso: 'En Proceso 🛠️',
  resuelto: 'Resuelto ✅',
  rechazado: 'Rechazado ❌'
};

export async function POST(request) {
  try {
    const { reporteId, nuevoEstado, respuestaText } = await request.json();

    if (!reporteId || !nuevoEstado) {
      return NextResponse.json({ message: 'Falta reporteId o nuevoEstado' }, { status: 400 });
    }

    // 1. Obtener detalles del reporte (folio y categoría)
    const { data: reporte, error: repError } = await supabase
      .from('reportes')
      .select('folio, categoria')
      .eq('id', reporteId)
      .single();

    if (repError || !reporte) {
      console.error('Error al obtener reporte:', repError);
      return NextResponse.json({ message: 'No se encontró el reporte especificado.' }, { status: 404 });
    }

    // 2. Obtener todas las suscripciones push asociadas a este reporte
    const { data: suscripciones, error: subError } = await supabase
      .from('suscripciones_push')
      .select('id, subscription_json')
      .eq('reporte_id', reporteId);

    if (subError) {
      console.error('Error al obtener suscripciones push:', subError);
      return NextResponse.json({ message: 'Error al consultar suscripciones.' }, { status: 500 });
    }

    if (!suscripciones || suscripciones.length === 0) {
      return NextResponse.json({ message: 'Sin suscripciones push activas para este reporte.' }, { status: 200 });
    }

    const catLabel = CATEGORIAS_MAP[reporte.categoria] || reporte.categoria;
    const estLabel = ESTADOS_MAP[nuevoEstado] || nuevoEstado;
    
    // Preparar contenido de la notificación
    const payload = JSON.stringify({
      title: `Reporte #${reporte.folio} Actualizado`,
      body: `El estatus cambió a: ${estLabel}.${respuestaText ? ` Respuesta: ${respuestaText}` : ''}`,
      url: `/reportes?folio=${reporte.folio}`,
      icon: '/icons/icon-192x192.png'
    });

    // 3. Enviar notificaciones en paralelo y procesar respuestas
    const promesas = suscripciones.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription_json, payload);
      } catch (err) {
        // Si la suscripción expiró o ya no es válida (código 410 o 404), la eliminamos de la base de datos
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Eliminando suscripción push caducada ID: ${sub.id}`);
          await supabase
            .from('suscripciones_push')
            .delete()
            .eq('id', sub.id);
        } else {
          console.error(`Error al enviar notificación para suscripción ID: ${sub.id}`, err);
        }
      }
    });

    await Promise.all(promesas);

    return NextResponse.json({ message: `Notificaciones enviadas a ${suscripciones.length} dispositivos.` }, { status: 200 });
  } catch (err) {
    console.error('Error en API de notificación push:', err);
    return NextResponse.json({ message: err.message || 'Error del servidor.' }, { status: 500 });
  }
}
