import { useState } from 'react'
import { ALBUM_CONFIG } from '../config/albumConfig'

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

export function MissingCardFinder({ selectedUser, cards, allProgress, users }) {
  const totalCards = ALBUM_CONFIG.totalPages * ALBUM_CONFIG.cardsPerPage
  const players = users?.filter((user) => user.uid !== selectedUser) || []
  const selectedPlayer = users?.find((user) => user.uid === selectedUser)
  const [missingNumber, setMissingNumber] = useState('')
  const numericValue = Number(missingNumber)
  const isValid = Number.isInteger(numericValue) && numericValue >= 1 && numericValue <= totalCards
  const cardId = isValid ? getCardIdFromNumber(numericValue) : null
  const card = cardId ? cards.find((item) => item.id === cardId) : null
  const selectedUserCount = cardId && selectedUser ? getCount(allProgress, selectedUser, cardId) : 0
  const holders = cardId
    ? players
        .map((player) => ({
          ...player,
          count: getCount(allProgress, player.uid, cardId),
        }))
        .filter((player) => player.count > 1)
    : []

  return (
    <section className="px-4 py-4 bg-green-50/50">
      <div className="max-w-md mx-auto bg-white border border-green-200 rounded-lg p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <h2 className="text-sm font-black text-green-800">¿Quién tiene la que te falta?</h2>
            <p className="text-[11px] text-green-600">
              Ingresa el número de tu carta faltante para ver quién la tiene repetida para intercambio.
            </p>
          </div>
          <input
            type="number"
            min="1"
            max={totalCards}
            value={missingNumber}
            onChange={(event) => setMissingNumber(event.target.value)}
            placeholder="001"
            className="w-20 bg-green-50 text-green-900 text-center text-sm font-black rounded-lg border border-green-300 px-2 py-1.5 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
        </div>

        {missingNumber && !isValid && (
          <div className="text-xs text-red-500 font-bold mt-2">Usa un numero entre 1 y {totalCards}.</div>
        )}

        {isValid && (
          <div className="text-xs text-green-800 mt-2">
            <div className="mb-2 font-bold">
              #{String(numericValue).padStart(3, '0')} - {card?.name || 'Carta sin nombre'}
              {selectedUserCount > 0 && (
                <span className="text-green-600"> - {selectedPlayer?.name || 'Tú'} ya la tiene</span>
              )}
            </div>

            {holders.length > 0 ? (
              <div className="space-y-1">
                {holders.map((holder) => (
                  <div
                    key={holder.uid}
                    className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-2 py-1"
                  >
                    <span className="font-bold text-green-900">{holder.name}</span>
                    <span className="text-green-700 font-black bg-white px-2 py-0.5 rounded-full border border-green-200 text-[10px]">
                      {holder.count - 1} repetida{holder.count - 1 === 1 ? '' : 's'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-green-600 italic">Nadie la tiene repetida por ahora.</div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
