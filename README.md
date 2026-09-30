# 🍣 Manjar Bistro Sushi — Tienda online

Tienda de pedidos online con carrito, pago con **Mercado Pago**, **panel del dueño** (menú, pedidos en vivo, dashboard de ventas y ganancias) y **aviso instantáneo** de cada compra.

**Stack:** Next.js 15 (App Router) · Supabase (Postgres + Auth + Storage + Realtime) · Mercado Pago Checkout Pro · Tailwind · Recharts · Deploy en Vercel.

---

## ✨ Qué incluye

### Para el cliente (sin registrarse)
- Menú con categorías, buscador, fotos, opciones por producto (ej. salmón fresco / al vapor) y etiqueta "Nuevo".
- Carrito lateral que queda guardado aunque cierre la página. Barra flotante en celular.
- Checkout en una sola pantalla: **retiro o delivery**, **Mercado Pago o efectivo**, notas.
- Recuerda nombre/teléfono/dirección para la próxima compra (solo en su navegador).
- Página de **seguimiento del pedido** que se actualiza sola (Recibido → En preparación → Listo → En camino → Entregado).
- Botón de WhatsApp directo al local.
- 100% responsive, instalable como app (PWA), con SEO básico.

### Para el dueño (`/admin`)
- **Dashboard interactivo:** ventas, ganancia neta (descuenta costo de mercadería y comisión de MP), pedidos, ticket promedio, comparación contra el período anterior, evolución diaria, más vendidos, horarios pico, retiro vs delivery, medios de pago. Filtros Hoy / 7 / 30 / 90 días. **Exportar a CSV/Excel.**
- **Pedidos en tiempo real** con sonido + notificación del navegador, botones para avanzar el estado, llamar o escribir por WhatsApp al cliente, abrir la dirección en Google Maps.
- **Menú:** agregar, editar, eliminar productos, subir foto, marcar agotado con un toque, cargar **costo privado** (con cálculo de margen), gestionar categorías.
- **Ajustes:** abrir/cerrar el local con un botón, costo de envío, pedido mínimo, aceptar efectivo, % de comisión de MP, horario, WhatsApp.
- **Notificación de cada compra** por Telegram y/o email con el detalle de los ítems.

---

## 🔒 Seguridad (ya implementada)

| Riesgo | Cómo se resuelve |
|---|---|
| Cliente modifica precios en el navegador | El servidor **recalcula todo** desde la base; el precio del carrito es solo visual. |
| Pago falso / webhook falsificado | Se valida la **firma `x-signature`** de MP y además se **re-consulta el pago a la API de MP**, verificando **monto y moneda** contra el pedido. |
| Notificaciones duplicadas | Actualización **idempotente**: solo el primer "aprobado" notifica. |
| Ver márgenes del negocio | Costos en tabla aparte (`product_costs`) solo legible por admins. |
| Acceso al panel | Supabase Auth + tabla `admins` + **RLS** en todas las tablas + chequeo en cada acción del servidor. |
| Ver pedidos ajenos | Los pedidos no son públicos; el seguimiento usa un ID aleatorio (UUID) imposible de adivinar. |
| Spam / bots | Rate-limit por IP, campo trampa (honeypot), validación estricta con Zod. |
| Subida de archivos maliciosos | Solo JPG/PNG/WEBP hasta 4 MB, validado en servidor y en el bucket. |
| Clickjacking, sniffing, etc. | Cabeceras de seguridad (HSTS, X-Frame-Options, nosniff, Referrer-Policy). |
| Pagos "pendientes" eternos | `binary_mode` (aprobado o rechazado al instante), sin Rapipago/Pago Fácil, preferencia vence en 1 h. |

---

## 🚀 Puesta en marcha (paso a paso)

### 1. Supabase
1. Crear proyecto en [supabase.com](https://supabase.com) (región **São Paulo** para menor latencia).
2. **SQL Editor → New query** → pegar todo `supabase/schema.sql` → **Run**. Esto crea tablas, seguridad, bucket de imágenes y carga el menú actual.
3. **Authentication → Users → Add user**: crear el usuario del dueño (email + contraseña, marcar *Auto confirm*).
4. En SQL Editor, convertirlo en admin:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'EMAIL_DEL_DUEÑO';
   ```
5. **Authentication → Providers → Email**: desactivar **"Allow new users to sign up"** (nadie más puede crearse cuenta).
6. **Project Settings → API**: copiar `URL`, `anon key` y `service_role key`.

### 2. Mercado Pago
1. Entrar a [mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers) → **Tus integraciones → Crear aplicación** (tipo *Pagos online*, *Checkout Pro*).
2. Copiar el **Access Token** (empezar con el de **prueba**).
3. **Webhooks → Configurar notificaciones**:
   - URL: `https://TU-DOMINIO/api/webhooks/mercadopago`
   - Evento: **Pagos**
   - Guardar y copiar la **Clave secreta** → `MP_WEBHOOK_SECRET`.
4. Para probar: crear **usuarios de prueba** (vendedor y comprador) y usar las [tarjetas de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards). Nombre del titular `APRO` = aprobado.

> Mercado Pago exige **https** para el webhook y el regreso automático: probá el flujo de pago completo sobre la URL de Vercel, no en `localhost`.

### 3. Notificaciones al dueño
**Telegram (recomendado, gratis e instantáneo):**
1. En Telegram hablar con **@BotFather** → `/newbot` → copiar el token → `TELEGRAM_BOT_TOKEN`.
2. Mandarle cualquier mensaje al bot nuevo.
3. Abrir `https://api.telegram.org/botTOKEN/getUpdates` y copiar `chat.id` → `TELEGRAM_CHAT_ID`.
   (Varios destinatarios, ej. dueño y cocina: separarlos con coma. También sirve un grupo.)

**Email (opcional):** crear cuenta en [resend.com](https://resend.com), verificar el dominio y completar `RESEND_API_KEY`, `OWNER_EMAIL`, `EMAIL_FROM`.

Además, con el panel `/admin/pedidos` abierto (en la compu del local o el celular) suena una campanita con cada pedido — tocar **"Activar alertas"** una vez.

### 4. Probar en tu compu
```bash
npm install
cp .env.example .env.local   # completar los valores
npm run dev                  # http://localhost:3000  ·  panel: /admin
```

### 5. Deploy en Vercel
1. Subir el proyecto a un repo de GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importar el repo.
3. En **Environment Variables** cargar todas las de `.env.example` (`NEXT_PUBLIC_SITE_URL` = la URL final, con https).
4. **Deploy.** Opcional: conectar un dominio propio en *Settings → Domains* (y actualizar `NEXT_PUBLIC_SITE_URL` y la URL del webhook en MP).
5. Probar una compra con usuario de prueba → cuando todo funcione, cambiar a credenciales de **producción** en Vercel y en el webhook.

---

## 🧭 Checklist antes de salir a producción
- [ ] Registro de usuarios desactivado en Supabase.
- [ ] Access Token de **producción** + clave secreta del webhook cargados.
- [ ] Compra de prueba real por un monto chico, luego devolverla desde MP.
- [ ] Notificación de Telegram recibida.
- [ ] Costos cargados en cada producto (para ver ganancias reales).
- [ ] Comisión de MP cargada en Ajustes.
- [ ] Fotos subidas desde el panel.
- [ ] Costo de envío, pedido mínimo y horario configurados.

---

## 📁 Estructura
```
supabase/schema.sql              Base de datos, seguridad (RLS), bucket y menú inicial
src/app/page.tsx                 Tienda (menú)
src/app/checkout/                Finalizar compra
src/app/pedido/[id]/             Seguimiento del pedido
src/app/api/checkout/            Crea el pedido (precios del servidor) y la preferencia de MP
src/app/api/webhooks/mercadopago Confirma pagos y notifica al dueño
src/app/admin/login/             Login del panel
src/app/admin/(panel)/           Dashboard · Pedidos · Menú · Ajustes
src/app/admin/actions.ts         Acciones del panel (todas verifican que sea admin)
src/lib/                         Supabase, Mercado Pago, notificaciones, validaciones, estadísticas
src/middleware.ts                Protege /admin
```

## 🔜 Ideas para una próxima etapa
- Cupones de descuento y promos por día.
- Zonas de delivery con distinto costo (Choele Choel / Lamarque / Luis Beltrán…).
- Programar pedidos para un horario.
- Rate-limit distribuido con **Upstash** si el tráfico crece.
- Avisos por **WhatsApp Business API** al cliente cuando cambia el estado.
- Impresión automática de comandas en impresora térmica.
