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
    <section className="p-3 bg-stone-900/90 border border-orange-900/60 rounded-2xl shadow-sm">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <h2 className="text-sm font-black text-amber-100 flex items-center gap-1.5">
              <span>🔍</span> ¿Quién la tiene repetida?
            </h2>
            <p className="text-[11px] text-orange-300/80">
              Ingresa el número de carta para ver quién la tiene duplicada para trade.
            </p>
          </div>
          <input
            type="number"
            min="1"
            max={totalCards}
            value={missingNumber}
            onChange={(event) => setMissingNumber(event.target.value)}
            placeholder="001"
            className="w-20 bg-stone-950 text-amber-200 text-center text-sm font-black rounded-xl border border-orange-800 px-2 py-1.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 shadow-inner"
          />
        </div>

        {missingNumber && !isValid && (
          <div className="text-xs text-rose-400 font-bold mt-2">Usa un número entre 1 y {totalCards}.</div>
        )}

        {isValid && (
          <div className="text-xs text-amber-200 mt-2 bg-stone-950/80 p-2.5 rounded-xl border border-orange-900/50">
            <div className="mb-2 font-bold flex items-center justify-between flex-wrap gap-1">
              <span>
                🎃 #{String(numericValue).padStart(3, '0')} - {card?.name || 'Carta sin nombre'}
              </span>
              {selectedUserCount > 0 && (
                <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60 text-[10px]">
                  ✓ {selectedPlayer?.name || 'Tú'} ya la tiene ({selectedUserCount})
                </span>
              )}
            </div>

            {holders.length > 0 ? (
              <div className="space-y-1.5">
                {holders.map((holder) => (
                  <div
                    key={holder.uid}
                    className="flex items-center justify-between bg-stone-900 border border-orange-900/60 rounded-lg px-2.5 py-1.5"
                  >
                    <span className="font-bold text-orange-200">{holder.name}</span>
                    <span className="text-amber-300 font-black bg-orange-950/90 px-2 py-0.5 rounded-full border border-orange-700/60 text-[10px]">
                      {holder.count - 1} repetida{holder.count - 1 === 1 ? '' : 's'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-orange-400/80 italic text-center py-1">Nadie la tiene repetida por ahora 🍂</div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
