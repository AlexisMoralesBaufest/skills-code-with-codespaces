# Login frontend + backend JWT

Este repositorio contiene:

- `backend`: API FastAPI con autenticación JWT.
- `frontend`: aplicación React con login y página de bienvenida protegida.
- `DESIGN.md`: estándar visual usado por el frontend.

## Funcionalidad

La aplicación web permite:

1. iniciar sesión contra `POST /auth/token`;
2. guardar `access_token` y `refresh_token` en la sesión del navegador;
3. impedir el acceso a la ruta de bienvenida si no existe una sesión activa;
4. consultar `GET /auth/me` para mostrar el usuario autenticado;
5. renovar el `access_token` con `POST /auth/refresh` cuando el token expira.

## Requisitos

- Python 3.12+
- Poetry 2.x
- Node.js 24+
- npm 11+

## Ejecución del backend

```bash
cd backend
poetry install --no-root
poetry run uvicorn app.main:app --reload
```

La API queda disponible en `http://127.0.0.1:8000`.

## Ejecución del frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicación queda disponible en `http://127.0.0.1:5173`.

### Variable opcional

Si el backend se expone en otra URL, define `VITE_API_BASE_URL` antes de iniciar el frontend.

Ejemplo:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

## Credenciales por defecto

Si no se configuran variables de entorno en el backend:

- Usuario: `admin`
- Contraseña: `admin123`

## Verificación rápida

1. Inicia el backend.
2. Inicia el frontend.
3. Abre `http://127.0.0.1:5173/login`.
4. Ingresa las credenciales válidas.
5. Verifica que la ruta `/welcome` muestre el usuario autenticado.
6. Cierra sesión y confirma que la página protegida vuelve a requerir login.
