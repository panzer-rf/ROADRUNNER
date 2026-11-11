import { useState } from 'react'

type UserRole = 'admin' | 'driver' | 'viewer'
export type UserSession = { name: string, role: UserRole }

interface LoginProps {
  onLogin: (user: UserSession) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // CREDENCIALES DE PRUEBA
  const mockUsers = [
    { u: 'admin', p: 'Root2024!', name: 'Admin Root', role: 'admin' as UserRole },
    { u: 'conductor', p: 'Gofo2024!', name: 'Conductor GOFO', role: 'driver' as UserRole },
    { u: 'invitado', p: 'Mira123!', name: 'Invitado', role: 'viewer' as UserRole },
  ]

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username || !password) {
      setError('Debes escribir usuario y contraseña.')
      return
    }

    const userFound = mockUsers.find(
      (user) => user.u === username.toLowerCase().trim() && user.p === password
    )

    if (userFound) {
      onLogin({ name: userFound.name, role: userFound.role })
    } else {
      setError('Usuario o contraseña incorrectos.')
    }
  }

  return (
    <div className="login-screen">
      <div className="login-box">
        <div className="login-logo">R</div>
        <h1>ROADRUNNER</h1>
        <p>Sistema Colaborativo GOFO</p>
        
        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label>Usuario</label>
            <input 
              type="text" 
              placeholder="Ej: admin" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-btn">
            Iniciar Sesión
          </button>
        </form>

        <div className="login-help">
          <p>Usuarios de prueba:</p>
          <ul>
            <li><strong>admin</strong> / Root2024</li>
            <li><strong>conductor</strong> / Gofo2024</li>
            <li><strong>invitado</strong> / Mira123</li>
          </ul>
        </div>
      </div>
    </div>
  )
}