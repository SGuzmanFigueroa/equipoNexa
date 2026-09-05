# Equipo Nexa

Gestión de integrantes de Nexa Consulting TI: alta de personas, fecha de
ingreso, seguimiento (notas fechadas por integrante) y reporte descargable en
Excel. Acceso solo para admin.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + Row Level Security) — **mismo proyecto Supabase
  que usa `bug-tracker`** (misma cuenta de correo/contraseña sirve para ambas
  apps; el rol `admin` de la tabla `profiles` es compartido).
- `xlsx` (SheetJS) para generar el reporte descargable.

## Modelo de datos

- `team_members` — un registro por integrante: nombre, correo, teléfono,
  área, cargo, tipo de colaboración, fecha de ingreso/salida, estado
  (`activo` / `pausado` / `retirado`), notas.
- `team_member_tracking` — historial de seguimiento: fecha + nota, ligado a
  un integrante.

Ambas tablas tienen RLS: solo usuarios con `role = 'admin'` en `profiles`
pueden leer o escribir (función `is_admin()`, reusada del esquema de
`bug-tracker`).

## Puesta en marcha

### 1. Variables de entorno

Ya está configurado `.env.local` apuntando al proyecto Supabase existente
(`ipfjxjyoxcidiphuklrk`, el mismo de `bug-tracker`). Si necesitas otro
proyecto, copia `.env.local.example` y aplica
`supabase/migrations/0001_team_members.sql` (requiere que
`bug-tracker/supabase/migrations/0001_init.sql` ya esté aplicado ahí, porque
reutiliza `profiles`, `is_admin()` y `set_updated_at()`).

### 2. Instalar y correr

```bash
npm install
npm run dev
```

Abre http://localhost:3000 (o el puerto que asigne Next si 3000 ya está
ocupado por `bug-tracker`) — redirige a `/login`.

### 3. Entrar como admin

- Si ya tienes una cuenta admin de `bug-tracker`, inicia sesión con las
  mismas credenciales aquí: comparten backend.
- Si no, usa "Crear cuenta nueva" en `/login` y luego, en el SQL Editor de
  Supabase, conviértete en admin:

  ```sql
  update profiles set role = 'admin' where email = 'tu-correo@nexa.com';
  ```

### 4. Cargar tu Excel existente

Pendiente: cuando tengas el archivo a mano, se agrega una pantalla de
importación (o se hace una carga puntual por script) que mapea sus columnas
a `team_members`. Mientras tanto, se puede registrar manualmente desde
"+ Nuevo integrante".

## Estructura de carpetas

```
app/
  login/                  Inicio de sesión y registro
  (app)/                  Rutas protegidas (requieren admin)
    dashboard/            Listado de integrantes con filtros + botón de reporte
    members/new/          Registrar integrante
    members/[id]/         Ver/editar integrante + historial de seguimiento
  api/report/             Genera y descarga el reporte .xlsx
lib/
  supabase/               Clientes de Supabase (browser, server, proxy/sesión)
  auth.ts                 Helpers para exigir sesión de admin
  types.ts                Tipos y catálogos (estados)
supabase/
  migrations/0001_team_members.sql
```

## Pendientes sugeridos (no implementados aún)

- Importación del Excel existente (mapeo de columnas a `team_members`).
- Adjuntar documentos por integrante (Supabase Storage).
- Despliegue (Vercel) cuando se necesite acceso fuera de local.
# equipoNexa
