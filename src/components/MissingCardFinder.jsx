import { useState } from 'react'
import { ALBUM_CONFIG } from '../config/albumConfig'
import { TEAM_MEMBERS } from '../config/teamConfig'

const getCount = (progress, userId, cardId) => {
  const rawProgress = progress[userId]?.[cardId]

  if (typeof rawProgress === 'number') return rawProgress

  return rawProgress?.count || rawProgress?.basicCount || rawProgress?.goldCount || 0
}

const getCardIdFromNumber = (cardNumber) => {
  const page = Math.ceil(cardNumber / ALBUM_CONFIG.cardsPerPage)
  const slot = ((cardNumber - 1) % ALBUM_CONFIG.cardsPerPage) + 1

  return `p${page}_c${slot}`
}

export function MissingCardFinder({ selectedUser, cards, allProgress }) {
  const totalCards = ALBUM_CONFIG.totalPages * ALBUM_CONFIG.cardsPerPage
  const players = TEAM_MEMBERS.filter(
    (member) => member.id !== 'general' && member.id !== selectedUser
  )
  const selectedPlayer = TEAM_MEMBERS.find((member) => member.id === selectedUser)
  const [missingNumber, setMissingNumber] = useState('')
  const numericValue = Number(missingNumber)
  const isValid = Number.isInteger(numericValue) && numericValue >= 1 && numericValue <= totalCards
  const cardId = isValid ? getCardIdFromNumber(numericValue) : null
  const card = cardId ? cards.find((item) => item.id === cardId) : null
  const selectedUserCount = cardId ? getCount(allProgress, selectedUser, cardId) : 0
  const holders = cardId
    ? players
        .map((player) => ({
          ...player,
          count: getCount(allProgress, player.id, cardId),
        }))
        .filter((player) => player.count > 1)
    : []

  return (
    <section className="px-4 pt-4">
      <div className="max-w-md mx-auto bg-gray-900 border border-gray-800 rounded-lg p-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <h2 className="text-sm font-black text-white">Buscar repetida</h2>
            <p className="text-[11px] text-gray-400">
              Escribe el numero de la carta que te falta.
            </p>
          </div>
          <input
            type="number"
            min="1"
            max={totalCards}
            value={missingNumber}
            onChange={(event) => setMissingNumber(event.target.value)}
            placeholder="001"
            className="w-20 bg-gray-950 text-white text-center text-sm font-black rounded-lg border border-gray-700 px-2 py-1.5 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {missingNumber && !isValid && (
          <div className="text-xs text-red-300">Usa un numero entre 1 y {totalCards}.</div>
        )}

        {isValid && (
          <div className="text-xs text-gray-300">
            <div className="mb-2">
              #{String(numericValue).padStart(3, '0')} - {card?.name || 'Carta sin nombre'}
              {selectedUserCount > 0 && (
                <span className="text-green-300"> - {selectedPlayer?.name} ya la tiene</span>
              )}
            </div>

            {holders.length > 0 ? (
              <div className="space-y-1">
                {holders.map((holder) => (
                  <div
                    key={holder.id}
                    className="flex items-center justify-between bg-gray-950 border border-gray-800 rounded-md px-2 py-1"
                  >
                    <span className="font-bold text-white">{holder.name}</span>
                    <span className="text-indigo-300 font-black">
                      {holder.count - 1} repetida{holder.count - 1 === 1 ? '' : 's'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400">Nadie la tiene repetida por ahora.</div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
