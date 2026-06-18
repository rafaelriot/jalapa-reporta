import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request) {
  try {
    const { reporteId, subscription } = await request.json();
    
    if (!reporteId || !subscription) {
      return NextResponse.json({ message: 'Falta reporteId o subscription' }, { status: 400 });
    }

    const { error } = await supabase
      .from('suscripciones_push')
      .insert([{
        reporte_id: reporteId,
        subscription_json: subscription
      }]);

    if (error) {
      console.error('Error al guardar suscripción push:', error);
      return NextResponse.json({ message: 'Error al registrar la suscripción en la base de datos.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Suscripción registrada con éxito.' }, { status: 200 });
  } catch (err) {
    console.error('Error en API de suscripción push:', err);
    return NextResponse.json({ message: err.message || 'Error del servidor.' }, { status: 500 });
  }
}
