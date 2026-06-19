import { supabase } from '@/lib/supabaseClient';
import ReportesClient from './ReportesClient';

export const revalidate = 0; // Evita el cacheo estricto para ver reportes nuevos de inmediato

async function getReportes() {
  try {
    const { data, error } = await supabase
      .from('reportes')
      .select('*, localidades(nombre), comentarios(count)')
      .order('creado_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports from Supabase:', error.message || error.details || JSON.stringify(error));
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Connection error fetching reports:', err);
    return [];
  }
}

export default async function ReportesPage() {
  const reportes = await getReportes();

  return <ReportesClient initialReportes={reportes} />;
}
