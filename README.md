# ROADRUNNER — starter técnico

Aplicación colaborativa para registrar y consultar ubicaciones difíciles de entrega en Campobasso y Molise. El starter incluye una pantalla inicial, captura GPS, enlace a Google Maps y mapa Leaflet de demostración. La conexión de Auth, consultas reales, guardado de ubicaciones y carga de fotos se implementan en la siguiente fase.

## Stack
- React + Vite + TypeScript
- Supabase Auth, Postgres y Storage
- React Leaflet + OpenStreetMap para el mapa
- Google Maps para navegación externa
- vite-plugin-pwa para manifest y service worker

## Requisitos
- Node.js 20.19+ o 22.12+ (requisito de Vite 8)
- npm
- Git

## Arranque local
1. Descomprime el ZIP y abre la carpeta `roadrunner-starter` en VS Code.
2. En la terminal de VS Code ejecuta:
   ```bash
   npm install
   cp .env.example .env.local
   npm run dev
   ```
   En Windows PowerShell, para copiar el archivo: `Copy-Item .env.example .env.local`.
3. Abre la URL local que muestre Vite. El mapa necesita conexión a Internet.

## Configurar Supabase (cuando pasemos a la fase de datos)
1. Crea un proyecto Supabase.
2. En SQL Editor ejecuta `supabase/schema.sql`.
3. El SQL crea un bucket privado `location-photos` y políticas RLS iniciales.
4. Copia Project URL y publishable key (o la antigua anon key) a `.env.local`.
5. Crea/invita usuarios desde el panel de Supabase. El trigger crea perfiles como `driver`.
6. Promueve el primer usuario ROOT desde SQL Editor usando su UUID:
   ```sql
   update public.profiles set role = 'root' where id = 'UUID_DEL_USUARIO';
   ```

## Supuestos de producto iniciales
- Nombre de trabajo: ROADRUNNER (reemplaza GOFO MAP).
- Cobertura: Campobasso primero; ampliación progresiva a todo Molise.
- Cualquier repartidor activo puede proponer una ubicación; queda `pending` hasta que ROOT la apruebe.
- Los repartidores consultan ubicaciones `approved` y sus propias propuestas pendientes/rechazadas.
- No hay registro público libre: ROOT invita o crea cuentas.

## Seguridad importante
- No incluir nunca `service_role` ni claves secretas en React/Vite.
- La publishable/anon key puede estar en el frontend solo con RLS y permisos mínimos.
- No desactivar RLS. Revisar las políticas antes de invitar repartidores reales.
- Fotos en bucket privado y enlaces firmados; no guardar nombres, teléfonos ni datos personales del destinatario.
- El rol ROOT se asigna manualmente por una persona de confianza, nunca desde el formulario público.

## OpenStreetMap en producción
El servidor público de tiles OSM es para uso limitado y sin SLA. Mantener visible la atribución `© OpenStreetMap contributors`, respetar caché y no descargar tiles masivamente ni crear mapas offline con el servidor estándar. Antes de desplegar para uso habitual, elegir un proveedor de tiles adecuado o alojar los tiles.

## Estructura
```text
roadrunner-starter/
├── public/                 # iconos PWA
├── src/
│   ├── components/         # mapa y componentes visuales
│   ├── lib/                # cliente Supabase, GPS y navegación
│   ├── App.tsx
│   └── main.tsx
├── supabase/schema.sql     # tablas, RLS, Storage y auditoría
├── .env.example
├── vite.config.ts
└── package.json
```

## Plan de desarrollo
1. Autenticación e invitaciones.
2. Perfil y roles driver/ROOT.
3. Alta de ubicaciones con GPS y campos de dirección.
4. Guardado/consulta compartida y marcadores del mapa.
5. Fotos privadas y fichas de ubicación.
6. Panel ROOT para aprobar, corregir, archivar y consultar historial.
7. Pruebas en móviles, PWA, despliegue y copias de seguridad.
