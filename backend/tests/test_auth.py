import unittest

from fastapi import HTTPException

from app.main import (
    VALID_PASSWORD,
    LoginRequest,
    RefreshRequest,
    login,
    read_current_user,
    refresh_token,
)


class AuthApiTests(unittest.TestCase):
    def test_login_and_me_flow(self) -> None:
        payload = login(LoginRequest(username="admin", password=VALID_PASSWORD))

        self.assertTrue(payload.access_token)
        self.assertTrue(payload.refresh_token)
        self.assertEqual(
            read_current_user(payload.access_token),
            {"username": "admin"},
        )

    def test_refresh_token_returns_new_access_token(self) -> None:
        login_payload = login(LoginRequest(username="admin", password=VALID_PASSWORD))
        refreshed_payload = refresh_token(
            RefreshRequest(refresh_token=login_payload.refresh_token),
        )

        self.assertTrue(refreshed_payload.access_token)
        self.assertEqual(
            read_current_user(refreshed_payload.access_token),
            {"username": "admin"},
        )

    def test_invalid_credentials_raise_unauthorized(self) -> None:
        with self.assertRaises(HTTPException) as context:
            login(LoginRequest(username="admin", password="incorrecta"))

        self.assertEqual(context.exception.status_code, 401)
        self.assertEqual(context.exception.detail, "Credenciales inválidas")


if __name__ == "__main__":
    unittest.main()
