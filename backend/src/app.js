import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env.js';
import { manejoErrores } from './core/middlewares/manejoErrores.js';
import { NotFoundError } from './core/errors/AppError.js';

// Importación de rutas
import authRoutes from './modules/auth/auth.routes.js';
import usuariosRoutes from './modules/usuarios/usuarios.routes.js';
import categoriasRoutes from './modules/categorias/categorias.routes.js';
import marcasRoutes from './modules/marcas/marcas.routes.js';
import componentesRoutes from './modules/componentes/componentes.routes.js';

export const app = express();

// Confianza en proxies inversos (necesario en Render, Railway, etc. para HTTPS y cookies seguras)
if (ENV.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Seguridad HTTP
app.use(helmet());

// Configuración flexible de orígenes permitidos para CORS
const origenesConfigurados = (ENV.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir llamadas sin cabecera origin (Postman, curl, healthchecks de Render)
    if (!origin) return callback(null, true);

    const origenLimpio = origin.replace(/\/$/, '');
    const esPermitido =
      origenesConfigurados.includes(origenLimpio) ||
      (ENV.NODE_ENV === 'production' && origenLimpio.endsWith('.onrender.com')) ||
      origenLimpio.includes('localhost') ||
      origenLimpio.includes('127.0.0.1');

    if (esPermitido) {
      return callback(null, true);
    }

    return callback(new Error(`Bloqueado por CORS: origen '${origin}' no autorizado`));
  },
  credentials: true,
}));

// Parsers
app.use(express.json({ limit: '15kb' }));
app.use(express.urlencoded({ extended: true, limit: '15kb' }));
app.use(cookieParser());

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'online', timestamp: new Date() });
});

// Rutas de API v1
const API_PREFIX = '/api/v1';

// Ruta informativa de bienvenida en la raíz y en el prefijo API
const apiInfoHandler = (req, res) => {
  res.json({
    ok: true,
    nombre: 'PC Builder & Catalog API',
    version: '1.0.0',
    estado: 'online',
    rutasDisponibles: [
      `${API_PREFIX}/componentes`,
      `${API_PREFIX}/categorias`,
      `${API_PREFIX}/marcas`,
      `${API_PREFIX}/auth`,
      `${API_PREFIX}/usuarios`,
      '/health',
    ],
  });
};

app.get('/', apiInfoHandler);
app.get(API_PREFIX, apiInfoHandler);

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/usuarios`, usuariosRoutes);
app.use(`${API_PREFIX}/categorias`, categoriasRoutes);
app.use(`${API_PREFIX}/marcas`, marcasRoutes);
app.use(`${API_PREFIX}/componentes`, componentesRoutes);

// Manejo de ruta no encontrada
app.use((req, res, next) => {
  next(new NotFoundError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
});

// Middleware global de manejo de errores
app.use(manejoErrores);

