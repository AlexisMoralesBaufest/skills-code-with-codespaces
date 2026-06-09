import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const SESSION_KEY = 'frontend.auth.session'

function readSession() {
  const storedSession = sessionStorage.getItem(SESSION_KEY)

  if (!storedSession) {
    return null
  }

  try {
    return JSON.parse(storedSession)
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

function saveSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY)
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers ?? {}),
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.detail ?? 'No fue posible completar la solicitud.')
  }

  return payload
}

function loginUser(credentials) {
  return apiRequest('/auth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })
}

function refreshAccessToken(refreshToken) {
  return apiRequest('/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
}

function getCurrentUser(accessToken) {
  return apiRequest('/auth/me', {
    headers: {
      Authorization: 'Bearer ' + accessToken,
    },
  })
}

function ProtectedRoute({ children }) {
  return readSession()?.accessToken ? children : <Navigate to="/login" replace />
}

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  if (readSession()?.accessToken) {
    return <Navigate to="/welcome" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const payload = await loginUser({ username, password })
      saveSession({
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
      })
      navigate('/welcome', { replace: true })
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="layout">
      <section className="panel card card--dense">
        <p className="eyebrow">Autenticación</p>
        <h1>Inicia sesión</h1>
        <p className="lead">
          Usa las credenciales configuradas en el backend para obtener el token y
          habilitar la navegación protegida.
        </p>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Usuario</span>
            <input
              autoComplete="username"
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
              required
              type="text"
              value={username}
            />
          </label>

          <label className="field">
            <span>Contraseña</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="admin123"
              required
              type="password"
              value={password}
            />
          </label>

          {(location.state?.message || errorMessage) && (
            <p className={`message ${errorMessage ? 'message--error' : 'message--info'}`}>
              {errorMessage || location.state.message}
            </p>
          )}

          <button className="button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  )
}

function WelcomePage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [statusMessage, setStatusMessage] = useState('Validando tu sesión...')

  useEffect(() => {
    let isActive = true

    async function loadUser() {
      const currentSession = readSession()

      if (!currentSession?.accessToken) {
        navigate('/login', { replace: true })
        return
      }

      try {
        const user = await getCurrentUser(currentSession.accessToken)

        if (isActive) {
          setUsername(user.username)
          setStatusMessage('Sesión activa')
        }
      } catch {
        if (!currentSession.refreshToken) {
          clearSession()
          navigate('/login', {
            replace: true,
            state: { message: 'La sesión no es válida. Vuelve a iniciar sesión.' },
          })
          return
        }

        try {
          const refreshedSession = await refreshAccessToken(currentSession.refreshToken)
          const nextSession = {
            ...currentSession,
            accessToken: refreshedSession.access_token,
          }

          saveSession(nextSession)
          const user = await getCurrentUser(nextSession.accessToken)

          if (isActive) {
            setUsername(user.username)
            setStatusMessage('Sesión renovada correctamente')
          }
        } catch {
          clearSession()
          navigate('/login', {
            replace: true,
            state: { message: 'Tu sesión expiró. Inicia sesión nuevamente.' },
          })
        }
      }
    }

    loadUser()

    return () => {
      isActive = false
    }
  }, [navigate])

  function handleLogout() {
    clearSession()
    navigate('/login', {
      replace: true,
      state: { message: 'Sesión cerrada correctamente.' },
    })
  }

  return (
    <main className="layout">
      <section className="panel card">
        <p className="eyebrow">Área protegida</p>
        <h1>Bienvenido</h1>
        <p className="lead">
          Solo las personas autenticadas pueden ver esta pantalla. El token se
          mantiene en la sesión actual del navegador.
        </p>

        <div className="summary">
          <div>
            <span className="summary__label">Usuario autenticado</span>
            <strong>{username || 'Cargando...'}</strong>
          </div>
          <div>
            <span className="summary__label">Estado</span>
            <strong>{statusMessage}</strong>
          </div>
        </div>

        <button className="button button--secondary" onClick={handleLogout} type="button">
          Cerrar sesión
        </button>
      </section>
    </main>
  )
}

function HomeRedirect() {
  return <Navigate to={readSession()?.accessToken ? '/welcome' : '/login'} replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/welcome"
          element={
            <ProtectedRoute>
              <WelcomePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
