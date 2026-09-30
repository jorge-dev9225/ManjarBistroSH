-- ════════════════════════════════════════════════════════════════
--  Manjar Bistro Sushi — Esquema de base de datos (Supabase / Postgres)
--  Ejecutar COMPLETO en: Supabase → SQL Editor → New query → Run
--  Es idempotente: se puede volver a correr sin romper nada.
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─────────────── Utilidades ───────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ─────────────── Administradores (dueño / empleados) ───────────────
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "admins: ver el propio" on public.admins;
create policy "admins: ver el propio" on public.admins
  for select using (user_id = auth.uid());

-- ─────────────── Categorías ───────────────
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null check (char_length(nombre) between 2 and 50),
  orden      int  not null default 0,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;

drop policy if exists "categorias: lectura" on public.categories;
create policy "categorias: lectura" on public.categories
  for select using (activo or public.is_admin());
drop policy if exists "categorias: admin" on public.categories;
create policy "categorias: admin" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- ─────────────── Productos ───────────────
create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  category_id    uuid references public.categories(id) on delete set null,
  nombre         text not null check (char_length(nombre) between 2 and 80),
  descripcion    text,
  piezas         text,                              -- "8 piezas", "2 porciones"
  precio         integer not null check (precio >= 0), -- en pesos, sin decimales
  imagen_url     text,
  variante_label text,                              -- ej: "Salmón"
  variantes      text[] not null default '{}',      -- ej: {"Fresco","Al vapor"}
  disponible     boolean not null default true,
  destacado      boolean not null default false,
  orden          int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.products enable row level security;
drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

drop policy if exists "productos: lectura" on public.products;
create policy "productos: lectura" on public.products for select using (true);
drop policy if exists "productos: admin" on public.products;
create policy "productos: admin" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- Costos en tabla aparte: el público NUNCA puede leer tus márgenes.
create table if not exists public.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  costo      integer not null default 0 check (costo >= 0)
);
alter table public.product_costs enable row level security;
drop policy if exists "costos: admin" on public.product_costs;
create policy "costos: admin" on public.product_costs
  for all using (public.is_admin()) with check (public.is_admin());

-- ─────────────── Ajustes del local (una sola fila) ───────────────
create table if not exists public.settings (
  id               int primary key default 1 check (id = 1),
  abierto          boolean not null default true,
  costo_envio      integer not null default 0 check (costo_envio >= 0),
  pedido_minimo    integer not null default 0 check (pedido_minimo >= 0),
  acepta_efectivo  boolean not null default true,
  whatsapp         text,
  horario          text,
  mensaje_cerrado  text,
  comision_mp_pct  numeric(5,2) not null default 0 check (comision_mp_pct between 0 and 30),
  updated_at       timestamptz not null default now()
);
alter table public.settings enable row level security;
drop trigger if exists trg_settings_updated on public.settings;
create trigger trg_settings_updated before update on public.settings
  for each row execute function public.set_updated_at();

drop policy if exists "ajustes: lectura" on public.settings;
create policy "ajustes: lectura" on public.settings for select using (true);
drop policy if exists "ajustes: admin" on public.settings;
create policy "ajustes: admin" on public.settings
  for update using (public.is_admin()) with check (public.is_admin());

-- ─────────────── Pedidos ───────────────
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  numero            bigint generated always as identity,
  cliente_nombre    text not null,
  cliente_telefono  text not null,
  cliente_email     text,
  tipo_entrega      text not null check (tipo_entrega in ('retiro','delivery')),
  direccion         text,
  notas             text,
  metodo_pago       text not null check (metodo_pago in ('mercadopago','efectivo')),
  estado_pago       text not null default 'pendiente'
                    check (estado_pago in ('pendiente','aprobado','rechazado','cancelado','reembolsado')),
  estado            text not null default 'nuevo'
                    check (estado in ('nuevo','preparando','listo','en_camino','entregado','cancelado')),
  subtotal          integer not null check (subtotal >= 0),
  costo_envio       integer not null default 0,
  total             integer not null check (total >= 0),
  costo_total       integer not null default 0,     -- costo de mercadería (para ganancias)
  mp_preference_id  text,
  mp_payment_id     text unique,
  notificado        boolean not null default false,
  pagado_at         timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_orders_created on public.orders (created_at desc);
create index if not exists idx_orders_estado_pago on public.orders (estado_pago);
alter table public.orders enable row level security;
drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.set_updated_at();

-- Los clientes NO acceden directo: el servidor crea pedidos con la service role.
drop policy if exists "pedidos: admin lee" on public.orders;
create policy "pedidos: admin lee" on public.orders for select using (public.is_admin());
drop policy if exists "pedidos: admin actualiza" on public.orders;
create policy "pedidos: admin actualiza" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

create table if not exists public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  nombre          text not null,           -- copia al momento de la compra
  variante        text,
  precio_unitario integer not null,
  costo_unitario  integer not null default 0,
  cantidad        integer not null check (cantidad between 1 and 50),
  subtotal        integer not null
);
create index if not exists idx_order_items_order on public.order_items (order_id);
alter table public.order_items enable row level security;
drop policy if exists "items: admin lee" on public.order_items;
create policy "items: admin lee" on public.order_items for select using (public.is_admin());

-- Tiempo real para el panel de pedidos
do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; when undefined_object then null;
end $$;

-- ─────────────── Storage: imágenes de productos ───────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 4194304, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "imgs: admin sube" on storage.objects;
create policy "imgs: admin sube" on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and public.is_admin());
drop policy if exists "imgs: admin edita" on storage.objects;
create policy "imgs: admin edita" on storage.objects for update to authenticated
  using (bucket_id = 'productos' and public.is_admin());
drop policy if exists "imgs: admin borra" on storage.objects;
create policy "imgs: admin borra" on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and public.is_admin());

-- ════════════════════════════════════════════════════════════════
--  Datos iniciales: menú actual de Manjar Bistro Sushi
-- ════════════════════════════════════════════════════════════════
insert into public.settings (id, whatsapp, horario, mensaje_cerrado)
values (1, '5491133052122', 'Mar a Dom · 20 a 00 hs', 'Ahora estamos cerrados. ¡Volvé en nuestro horario!')
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from public.categories) then
    with c as (
      insert into public.categories (nombre, orden) values
        ('Rolls', 1), ('Nigiri', 2), ('Nuevas opciones', 3)
      returning id, nombre
    )
    insert into public.products
      (category_id, nombre, descripcion, piezas, precio, variante_label, variantes, destacado, orden)
    select c.id, p.nombre, p.descripcion, p.piezas, p.precio, p.variante_label, p.variantes, p.destacado, p.orden
    from c join (values
      ('Rolls', 'Alaska Roll', 'Arroz, alga nori, queso crema, salmón, palta, semillas de sésamo y cebollín.', '8 piezas', 15000, 'Salmón', array['Fresco','Al vapor']::text[], false, 1),
      ('Rolls', 'California Roll', 'Arroz, alga nori, queso crema, kani kama, cebollín, palta, pepino y sésamo.', '8 piezas', 15000, null, '{}'::text[], false, 2),
      ('Rolls', 'Tiger Roll (tempurizado)', 'Arroz, alga nori, queso crema, salmón tempurizado, cebollín, palta y sésamo.', '8 piezas', 15000, null, '{}'::text[], false, 3),
      ('Rolls', 'Langostino Roll', 'Arroz, alga nori, queso crema, langostinos tempurizados, cebollín y sésamo.', '8 piezas', 15000, null, '{}'::text[], false, 4),
      ('Rolls', 'Che Roll', 'Arroz, alga nori, queso crema, cebollín y atún tempurizado.', '8 piezas', 15000, null, '{}'::text[], false, 5),
      ('Nigiri', 'Nigiri', 'Arroz y salmón.', '4 piezas', 15000, null, '{}'::text[], false, 1),
      ('Nuevas opciones', 'Temaki', 'Alga, arroz, queso crema, palta, pepino, zanahoria, salsa anguila y sésamo.', '2 porciones', 20000, 'Proteína', array['Salmón','Atún tempura']::text[], true, 1),
      ('Nuevas opciones', 'Ensalada Manjar Bistro', 'Salmón, atún tempura, palta, pepino, kanikama, zanahoria, salsa anguila, salsa fuji y sésamo.', null, 20000, 'Arroz', array['Sin arroz','Con arroz']::text[], true, 2)
    ) as p(cat, nombre, descripcion, piezas, precio, variante_label, variantes, destacado, orden)
      on p.cat = c.nombre;

    insert into public.product_costs (product_id, costo)
    select id, 0 from public.products
    on conflict (product_id) do nothing;
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════
--  ÚLTIMO PASO (manual): convertir tu usuario en administrador.
--  1) Supabase → Authentication → Users → Add user (tu email + contraseña)
--  2) Ejecutá (cambiando el email):
--
--  insert into public.admins (user_id)
--  select id from auth.users where email = 'dueño@manjarbistro.com';
-- ════════════════════════════════════════════════════════════════
