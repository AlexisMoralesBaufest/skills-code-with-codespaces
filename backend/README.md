# Backend JWT con FastAPI

Aplicación Web API en Python con FastAPI que expone autenticación basada en JWT.

## Requisitos

- Python 3.12
- Poetry 2.x
- Docker y Docker Compose (opcional)
- Variables opcionales: `APP_USERNAME`, `APP_PASSWORD`, `JWT_SECRET`

## Endpoints

### `POST /auth/token`

Genera un token de acceso con expiración de **300 segundos** y un refresh token.

Body:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

### `POST /auth/refresh`

Recibe un `refresh_token` y devuelve un nuevo token de acceso.

Body:

```json
{
  "refresh_token": "TOKEN_OBTENIDO_EN_LOGIN"
}
```

### `GET /auth/me`

Endpoint protegido para validar el uso del access token.

Header:

```text
Authorization: Bearer <ACCESS_TOKEN>
```

## Ejecución local con Poetry

```bash
cd backend
poetry install --no-root
poetry run uvicorn app.main:app --reload
```

La API quedará disponible en `http://127.0.0.1:8000` y la documentación Swagger en `http://127.0.0.1:8000/docs`.

## Ejemplos de uso

Obtener tokens:

```bash
curl -X POST http://127.0.0.1:8000/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Refrescar access token:

```bash
curl -X POST http://127.0.0.1:8000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"TOKEN_OBTENIDO_EN_LOGIN"}'
```

Consultar usuario autenticado:

```bash
curl http://127.0.0.1:8000/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Ejecución con Docker

```bash
cd backend
docker compose up --build
```

La aplicación se expondrá en `http://127.0.0.1:8000`.
Para ambientes no locales, reemplaza `JWT_SECRET` por un valor fuerte y aleatorio antes de desplegar.
