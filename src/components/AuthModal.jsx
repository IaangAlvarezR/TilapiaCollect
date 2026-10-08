import { useState } from 'react'
import { loginUser, registerUser } from '../services/albumStore'

export function AuthModal({ onAuthenticate, onClose }) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (isRegistering) {
        if (!identifier || !name || !pin) {
          setError('Todos los campos son obligatorios.')
          setIsLoading(false)
          return
        }
        const user = await registerUser(identifier, name, pin)
        onAuthenticate(user)
      } else {
        if (!identifier || !pin) {
          setError('Usuario o UID y PIN son obligatorios.')
          setIsLoading(false)
          return
        }
        const user = await loginUser(identifier, pin)
        if (user) {
          onAuthenticate(user)
        } else {
          setError('UID o PIN incorrecto.')
        }
      }
    } catch (err) {
      setError(err.message || 'Ocurrió un error. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-stone-900 border border-orange-700/80 rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl shadow-orange-950/80">
        <h3 className="text-lg font-black text-amber-100 mb-1 flex items-center justify-center gap-1.5">
          <span>{isRegistering ? '🎃' : '🔒'}</span>
          <span>{isRegistering ? 'Crear Usuario' : 'Iniciar Sesión'}</span>
        </h3>
        <p className="text-xs text-orange-300/70 mb-4">
          {isRegistering
            ? 'Ingresa tus datos para registrarte.'
            : 'Ingresa tu usuario, UID o nombre y PIN para entrar.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <input
            type="text"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="Usuario o UID"
            className="w-full text-center text-sm font-bold bg-stone-950 text-amber-200 py-2 rounded-xl border border-orange-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-inner"
            autoFocus
          />

          {isRegistering && (
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre visible"
              className="w-full text-center text-sm font-bold bg-stone-950 text-amber-200 py-2 rounded-xl border border-orange-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-inner"
            />
          )}

          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="PIN (4 dígitos)"
            className="w-full text-center text-xl font-bold tracking-widest bg-stone-950 text-amber-200 py-2 rounded-xl border border-orange-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-inner"
          />

          {error && (
            <p className="text-rose-400 text-xs font-bold bg-rose-950/60 py-1 px-2 rounded-lg border border-rose-900">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2 text-xs font-bold bg-stone-800 text-stone-300 hover:bg-stone-700 rounded-xl transition"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-1/2 py-2 text-xs font-black bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl shadow-md transition disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? '...' : isRegistering ? 'Registrar' : 'Entrar'}
            </button>
          </div>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsRegistering(!isRegistering)
            setError('')
          }}
          className="mt-4 text-xs font-bold text-orange-400 hover:text-amber-300 underline"
        >
          {isRegistering
            ? '¿Ya tienes cuenta? Inicia sesión'
            : '¿No tienes cuenta? Regístrate'}
        </button>
      </div>
    </div>
  )
}

