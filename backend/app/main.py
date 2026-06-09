import os
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ACCESS_TOKEN_EXPIRE_SECONDS = 300
REFRESH_TOKEN_EXPIRE_SECONDS = 600
ALGORITHM = "HS256"
JWT_SECRET = os.getenv("JWT_SECRET", "local-development-secret-change-me")
VALID_USERNAME = os.getenv("APP_USERNAME", "admin")
VALID_PASSWORD = os.getenv("APP_PASSWORD", "admin123")
ALLOWED_CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOW_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173,http://localhost:4173",
    ).split(",")
    if origin.strip()
]

app = FastAPI(title="JWT FastAPI", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = ACCESS_TOKEN_EXPIRE_SECONDS


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = ACCESS_TOKEN_EXPIRE_SECONDS


def create_token(subject: str, token_type: str, expires_in: int) -> str:
    issued_at = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "type": token_type,
        "iat": issued_at,
        "exp": issued_at + timedelta(seconds=expires_in),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado",
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        ) from exc


def get_bearer_token(authorization: Annotated[str | None, Header()] = None) -> str:
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere un token Bearer",
        )
    return authorization.removeprefix("Bearer ").strip()


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "JWT API lista para usar"}


@app.post("/auth/token", response_model=TokenResponse)
def login(credentials: LoginRequest) -> TokenResponse:
    if (
        credentials.username != VALID_USERNAME
        or credentials.password != VALID_PASSWORD
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
        )

    return TokenResponse(
        access_token=create_token(
            subject=credentials.username,
            token_type="access",
            expires_in=ACCESS_TOKEN_EXPIRE_SECONDS,
        ),
        refresh_token=create_token(
            subject=credentials.username,
            token_type="refresh",
            expires_in=REFRESH_TOKEN_EXPIRE_SECONDS,
        ),
    )


@app.post("/auth/refresh", response_model=RefreshResponse)
def refresh_token(payload: RefreshRequest) -> RefreshResponse:
    decoded_token = decode_token(payload.refresh_token)

    if decoded_token.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token enviado no es de refresco",
        )

    return RefreshResponse(
        access_token=create_token(
            subject=decoded_token["sub"],
            token_type="access",
            expires_in=ACCESS_TOKEN_EXPIRE_SECONDS,
        )
    )


@app.get("/auth/me")
def read_current_user(token: Annotated[str, Depends(get_bearer_token)]) -> dict[str, str]:
    decoded_token = decode_token(token)

    if decoded_token.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token enviado no es de acceso",
        )

    return {"username": decoded_token["sub"]}
