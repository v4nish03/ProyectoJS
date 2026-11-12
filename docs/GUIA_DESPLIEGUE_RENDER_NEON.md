# ☁️ Guía de Despliegue en Neon y Render

Esta guía explica paso a paso cómo desplegar la base de datos PostgreSQL en **Neon** (servidor serverless gratuito) y los servicios de **Backend** y **Frontend** en **Render**.

---

## 📋 Resumen de la Arquitectura en la Nube

```
┌───────────────────────────────────────┐
│     Neon (Serverless PostgreSQL)      │
│  postgresql://...@...neon.tech/neondb │
└──────────────────┬────────────────────┘
                   │ TCP + SSL
                   ▼
┌───────────────────────────────────────┐       CORS + Cookies       ┌─────────────────────────────────────┐
│       Render (Web Service)            │ ◄────────────────────────► │        Render (Static Site)         │
│             BACKEND                   │      SameSite=None         │              FRONTEND               │
│  https://pc-backend.onrender.com      │      Secure=true           │  https://pc-frontend.onrender.com   │
└───────────────────────────────────────┘                            └─────────────────────────────────────┘
```

---

## 🗄️ Paso 1: Crear la Base de Datos en Neon

1. Regístrate o inicia sesión en [neon.tech](https://neon.tech).
2. Haz clic en **Create Project**:
   * **Project name:** `pc-catalog-db` (o el nombre que elijas).
   * **Postgres version:** `16` (recomendada).
   * **Region:** Elige la región más cercana (ej. `US East (Ohio)` o `US East (N. Virginia)`).
3. Una vez creado el proyecto, en el **Dashboard** verás la sección **Connection Details**.
4. Asegúrate de que el selector esté en **Connection string** y copia la URL completa. Tendrá una forma similar a:
   ```text
   postgresql://tu_usuario:tu_password@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   > ⚠️ **Nota Importante:** Debe incluir al final el parámetro `?sslmode=require`.

---

## ⚙️ Paso 2: Desplegar el Backend en Render (Web Service)

1. Inicia sesión en [render.com](https://render.com) (preferiblemente con tu cuenta de GitHub).
2. Haz clic en **New +** en la esquina superior y selecciona **Web Service**.
3. Selecciona tu repositorio de GitHub `Proyecto` (si no aparece, dale permisos a Render para acceder al repositorio).
4. Rellena los datos de configuración:

| Campo | Valor Requerido |
| :--- | :--- |
| **Name** | `pc-catalog-backend` *(o similar)* |
| **Region** | La misma o más cercana a la de Neon (ej. `Ohio (US East)`) |
| **Branch** | `main` *(o tu rama de producción)* |
| **Root Directory** | `backend` *(⚠️ Obligatorio)* |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npx prisma generate && npx prisma migrate deploy && npm run seed` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

> 💡 **¿Qué hace el Build Command?**
> 1. `npm install`: Instala las dependencias del backend.
> 2. `npx prisma generate`: Genera el cliente de Prisma para Linux.
> 3. `npx prisma migrate deploy`: Aplica las migraciones SQL a tu base de datos en Neon.
> 4. `npm run seed`: Carga los usuarios de prueba (`admin`, `vendedor`, `cliente`), las 8 categorías 3D y los componentes iniciales.

5. En la sección **Environment Variables**, añade las siguientes variables:

| Variable | Valor | Descripción |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://...neon.tech/neondb?sslmode=require` | Tu cadena de conexión copiada de Neon. |
| `NODE_ENV` | `production` | Activa cookies seguras (`SameSite=None; Secure`) y optimizaciones. |
| `JWT_SECRET` | `clave_secreta_super_segura_para_produccion_2026` | Clave aleatoria para firmar los tokens JWT. |
| `JWT_EXPIRES_IN` | `2h` | Tiempo de expiración del token. |
| `FRONTEND_URL` | `http://localhost:5173` *(temporal)* | Se actualizará en el Paso 4 con la URL real del frontend. |

*(Nota: Render asigna automáticamente el puerto en la variable `PORT`, no hace falta configurarla manualmente).*

6. Haz clic en **Deploy Web Service**.
7. Espera a que termine el despliegue. Cuando el estado sea **Live**, copia la URL pública de tu backend (por ejemplo: `https://pc-catalog-backend.onrender.com`).
8. Verifica que esté activo abriendo en el navegador:
   `https://pc-catalog-backend.onrender.com/health` ➔ Debe responder `{ ok: true, status: 'online' }`.

---

## 🎨 Paso 3: Desplegar el Frontend en Render (Static Site)

1. En el panel de Render, haz clic en **New +** y selecciona **Static Site**.
2. Conecta el mismo repositorio de GitHub.
3. Rellena los datos de configuración:

| Campo | Valor Requerido |
| :--- | :--- |
| **Name** | `pc-catalog-frontend` *(o similar)* |
| **Branch** | `main` |
| **Root Directory** | `frontend` *(⚠️ Obligatorio)* |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` *(⚠️ Obligatorio)* |

4. En la sección **Environment Variables**, añade:

| Variable | Valor | Descripción |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://pc-catalog-backend.onrender.com/api/v1` | La URL de tu backend en Render con el prefijo `/api/v1`. |

5. **Regla de Enrutamiento para SPA (Crucial para React Router):**
   * En el menú lateral izquierdo de tu Static Site, ve a **Redirects/Rewrites**.
   * Haz clic en **Add Rule**:
     * **Type:** `Rewrite`
     * **Source:** `/*`
     * **Destination:** `/index.html`
   * Haz clic en **Save Changes**.
   *(Esto evita errores 404 cuando el usuario recarga la página en rutas como `/catalogo`, `/login` o `/admin/componentes`).*

6. Haz clic en **Deploy Static Site**.
7. Copia la URL pública generada para tu frontend (por ejemplo: `https://pc-catalog-frontend.onrender.com`).

---

## 🔄 Paso 4: Sincronizar CORS y Cookies entre Frontend y Backend

Para que la autenticación con cookies seguras funcione entre los dos dominios de Render:

1. Ve a tu servicio de **Backend** en Render (`pc-catalog-backend`).
2. Entra en la pestaña **Environment**.
3. Edita la variable `FRONTEND_URL` y reemplázala por la URL real de tu Frontend en Render:
   ```text
   FRONTEND_URL = https://pc-catalog-frontend.onrender.com
   ```
4. Haz clic en **Save Changes**.
5. Render redesplegará automáticamente el backend con la nueva configuración.

---

## ✅ Paso 5: Verificación Final

1. Abre la URL de tu frontend en el navegador: `https://pc-catalog-frontend.onrender.com`.
2. Comprueba que el modelo 3D cargue correctamente.
3. Haz clic en **Iniciar Sesión** e ingresa con los usuarios de prueba:
   * **Admin:** `admin@pccatalog.com` / `Password123!`
   * **Vendedor:** `vendedor@pccatalog.com` / `Password123!`
   * **Cliente:** `cliente@pccatalog.com` / `Password123!`
4. Verifica que puedas ver los productos, crear nuevos componentes en el panel de administración y que la sesión se mantenga activa al recargar la página.

