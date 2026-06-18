import Link from "next/link";
import ReportForm from "@/components/ReportForm";
import PwaInstallButton from "@/components/PwaInstallButton";
import { supabase } from "@/lib/supabaseClient";

// Listado de localidades por defecto (si la base de datos no está disponible)
const FALLBACK_LOCALIDADES = [
  { id: 1, nombre: "Cabecera Municipal", latitud: 17.7214, longitud: -92.8122 },
  { id: 2, nombre: "Astapa", latitud: 17.8042, longitud: -92.8252 },
  { id: 3, nombre: "Jahuacapa", latitud: 17.7661, longitud: -92.8153 },
  { id: 4, nombre: "Chipilinar 1ra Sección", latitud: 17.7011, longitud: -92.7489 },
  { id: 5, nombre: "Chipilinar 2da Sección", latitud: 17.6834, longitud: -92.7301 },
  { id: 6, nombre: "Lomas Alegres", latitud: 17.6521, longitud: -92.7712 },
  { id: 7, nombre: "Tequila", latitud: 17.7022, longitud: -92.8398 },
  { id: 8, nombre: "Francisco J. Santamaría (Cacao)", latitud: 17.8091, longitud: -92.8791 },
  { id: 9, nombre: "Guanal 1ra Sección", latitud: 17.7915, longitud: -92.7918 },
  { id: 10, nombre: "Calicanto", latitud: 17.6987, longitud: -92.8611 }
];

async function getLocalidades() {
  try {
    const { data, error } = await supabase
      .from("localidades")
      .select("id, nombre, latitud, longitud")
      .order("nombre", { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn("Fallo lectura de localidades desde Supabase, usando listado fallback.", error);
      return FALLBACK_LOCALIDADES;
    }
    return data;
  } catch (err) {
    console.error("Error cargando localidades:", err);
    return FALLBACK_LOCALIDADES;
  }
}

export default async function Home() {
  const localidades = await getLocalidades();

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Cabecera del Portal */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl p-6 mb-6 text-center shadow-lg border border-blue-500/20">
        <div className="flex justify-between items-center mb-4 border-b border-blue-400/20 pb-3">
          <Link href="/" className="text-xs font-black tracking-wider uppercase bg-blue-800/40 px-2.5 py-1.5 rounded-lg border border-blue-400/20 flex items-center gap-1.5 hover:bg-blue-800/60 active:scale-95 transition-all">
            <img src="/icons/icon-192x192.png" alt="Logo" className="w-4.5 h-4.5 rounded-md object-cover" />
            Jalapa Reporta
          </Link>
          <Link href="/reportes" className="text-xs font-black bg-white text-blue-700 hover:bg-blue-50 transition-all px-3 py-1.5 rounded-lg shadow-xs active:scale-95">
            🔍 Ver Reportes
          </Link>
        </div>
        <div className="flex flex-col items-center mb-3">
          <Link href="/" className="active:scale-95 hover:opacity-90 transition-all">
            <img src="/icons/icon-512x512.png" alt="Jalapa Reporta Logo" className="w-20 h-20 rounded-2xl shadow-md border-2 border-white/80 object-cover bg-white mb-2" />
          </Link>
        </div>
        <h2 className="text-2xl font-black tracking-tight">Reporte Ciudadano Directo</h2>
        <p className="text-blue-100 text-sm mt-1 font-semibold">Reporta baches, agua, basura y luminarias en 1 minuto.</p>
        <div className="mt-4 flex items-center justify-center gap-4 text-xs font-bold bg-blue-800/40 py-2 px-3 rounded-xl border border-blue-400/20">
          <span className="flex items-center gap-1">⚡ Sin cuentas</span>
          <span className="text-blue-300">|</span>
          <span className="flex items-center gap-1">💾 Guarda Offline</span>
        </div>
      </div>

      {/* Botón de Instalación Móvil PWA (Opción 1) */}
      <PwaInstallButton />

      {/* Formulario de Registro de Reportes */}
      <ReportForm localidades={localidades} />

      {/* Pie de Página */}
      <footer className="mt-8 text-center text-xs text-gray-400 font-semibold pb-8 flex flex-col items-center gap-2">
        <p>Plataforma Ciudadana Digital</p>
        <Link href="/admin" title="Panel de Administración" className="text-gray-300 hover:text-blue-500 hover:underline flex items-center gap-1 transition-all active:scale-95 py-1 px-2 rounded bg-gray-100/30 border border-gray-100/10">
          <span>🔐</span> Acceso Ayuntamiento
        </Link>
      </footer>
    </div>
  );
}
