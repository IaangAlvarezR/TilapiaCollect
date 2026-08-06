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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-xs text-center shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-1">
          {isRegistering ? 'Crear Usuario' : 'Iniciar Sesión'}
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          {isRegistering
            ? 'Ingresa tus datos para registrarte.'
            : 'Ingresa tu usuario, UID o nombre y PIN para entrar.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="Usuario o UID"
            className="w-full text-center text-lg bg-gray-800 text-white py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-indigo-500"
            autoFocus
          />

          {isRegistering && (
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre"
              className="w-full text-center text-lg bg-gray-800 text-white py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-indigo-500"
            />
          )}

          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="PIN (4 dígitos)"
            className="w-full text-center text-2xl tracking-widest bg-gray-800 text-white py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-indigo-500"
          />

          {error && (
            <p className="text-red-400 text-xs font-semibold">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2 text-sm font-semibold bg-gray-800 text-gray-300 rounded-lg"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-1/2 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg shadow-lg"
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
          className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 underline"
        >
          {isRegistering
            ? '¿Ya tienes cuenta? Inicia sesión'
            : '¿No tienes cuenta? Regístrate'}
        </button>
      </div>
    </div>
  )
}

