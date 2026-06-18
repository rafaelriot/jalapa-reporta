-- Habilitar extensión geoespacial (opcional para el futuro, pero buena práctica)
create extension if not exists postgis;

-- Tabla de Localidades (Catálogo para consistencia de datos)
create table if not exists public.localidades (
    id bigint generated always as identity primary key,
    nombre text not null unique,
    zona_rural boolean default false,
    latitud double precision,
    longitud double precision
);

-- Insertar localidades de Jalapa, Tabasco con coordenadas aproximadas para auto-sugerencia GPS
insert into public.localidades (nombre, zona_rural, latitud, longitud) values
('Cabecera Municipal', false, 17.7214, -92.8122),
('Astapa', true, 17.8042, -92.8252),
('Jahuacapa', true, 17.7661, -92.8153),
('Chipilinar 1ra Sección', true, 17.7011, -92.7489),
('Chipilinar 2da Sección', true, 17.6834, -92.7301),
('Lomas Alegres', true, 17.6521, -92.7712),
('Tequila', true, 17.7022, -92.8398),
('Francisco J. Santamaría (Cacao)', true, 17.8091, -92.8791),
('Guanal 1ra Sección', true, 17.7915, -92.7918),
('Calicanto', true, 17.6987, -92.8611)
on conflict (nombre) do nothing;

-- Tabla Principal de Reportes
create table if not exists public.reportes (
    id uuid default gen_random_uuid() primary key,
    folio serial not null, -- Folio numérico corto y legible para el ciudadano
    creado_at timestamp with time zone default timezone('utc'::text, now()) not null,
    categoria text not null, -- [bache, luminaria, basura, fuga_agua, camino_rural, drenaje, otro]
    localidad_id bigint references public.localidades(id) on delete set null,
    ubicacion_texto text, -- Referencias visuales (ej. "Frente a la tienda de Doña Maria")
    latitud double precision,
    longitud double precision,
    foto_url text not null, -- URL pública del bucket de Supabase Storage
    estado text default 'pendiente'::text not null, -- [pendiente, en_proceso, resuelto, rechazado]
    respuesta_ayuntamiento text,
    audio_url text, -- URL del audio de nota de voz explicativo (opcional)
    actualizado_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar Row Level Security (RLS)
alter table public.reportes enable row level security;
alter table public.localidades enable row level security;

-- Políticas de Seguridad para Localidades (Lectura pública para los dropdowns)
drop policy if exists "Permitir lectura pública de localidades" on public.localidades;
create policy "Permitir lectura pública de localidades" 
on public.localidades for select 
using (true);

-- Políticas de Seguridad para Reportes
drop policy if exists "Permitir inserción pública de reportes" on public.reportes;
create policy "Permitir inserción pública de reportes" 
on public.reportes for insert 
with check (true);

drop policy if exists "Permitir lectura pública de reportes" on public.reportes;
create policy "Permitir lectura pública de reportes" 
on public.reportes for select 
using (true);

drop policy if exists "Permitir gestión total a personal autenticado (Ayuntamiento)" on public.reportes;
create policy "Permitir gestión total a personal autenticado (Ayuntamiento)" 
on public.reportes for all 
to authenticated
using (true)
with check (true);

-- Índices para optimizar búsquedas y visualización en el mapa/panel
create index if not exists idx_reportes_estado on public.reportes(estado);
create index if not exists idx_reportes_categoria on public.reportes(categoria);
create index if not exists idx_reportes_creado_at on public.reportes(creado_at desc);

-- Tabla para almacenar las suscripciones push de los ciudadanos (sin cuentas)
create table if not exists public.suscripciones_push (
    id uuid default gen_random_uuid() primary key,
    reporte_id uuid references public.reportes(id) on delete cascade,
    subscription_json jsonb not null,
    creado_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar Row Level Security (RLS)
alter table public.suscripciones_push enable row level security;

-- Políticas de RLS
drop policy if exists "Permitir inserción pública de suscripciones" on public.suscripciones_push;
create policy "Permitir inserción pública de suscripciones"
on public.suscripciones_push for insert
with check (true);

drop policy if exists "Permitir lectura pública de suscripciones" on public.suscripciones_push;
create policy "Permitir lectura pública de suscripciones"
on public.suscripciones_push for select
using (true);

drop policy if exists "Permitir eliminación a personal autenticado" on public.suscripciones_push;
create policy "Permitir eliminación a personal autenticado"
on public.suscripciones_push for delete
to authenticated
using (true);
