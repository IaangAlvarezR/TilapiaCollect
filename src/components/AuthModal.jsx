import { useState } from 'react'
import { TEAM_MEMBERS } from '../config/teamConfig'

export function AuthModal({ activeUser, onAuthenticate, onClose }) {
  const [pinInput, setPinInput] = useState('')
  const [error, setError] = useState(false)

  const member = TEAM_MEMBERS.find((item) => item.id === activeUser)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (member && pinInput === member.pin) {
      onAuthenticate(true)
      setError(false)
    } else {
      setError(true)
      setPinInput('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-xs text-center shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-1">
          Entrar a {member?.name || 'album'}
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Ingresa tu PIN personal para abrir este album.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            maxLength={4}
            value={pinInput}
            onChange={(event) => setPinInput(event.target.value)}
            placeholder="****"
            className="w-full text-center text-2xl tracking-widest bg-gray-800 text-white py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-indigo-500"
            autoFocus
          />

          {error && (
            <p className="text-red-400 text-xs font-semibold">
              PIN incorrecto. Revisa e intenta de nuevo.
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2 text-sm font-semibold bg-gray-800 text-gray-300 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-1/2 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg shadow-lg"
            >
              Entrar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
