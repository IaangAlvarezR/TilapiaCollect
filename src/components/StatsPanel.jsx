import { ALBUM_CONFIG } from '../config/albumConfig'
import { TEAM_MEMBERS } from '../config/teamConfig'

const getCount = (progress, userId, cardId) => {
  const rawProgress = progress[userId]?.[cardId]

  if (typeof rawProgress === 'number') return rawProgress

  return rawProgress?.count || rawProgress?.basicCount || rawProgress?.goldCount || 0
}

export function StatsPanel({ cards, allProgress }) {
  const players = TEAM_MEMBERS.filter((member) => member.id !== 'general')
  const totalCards = ALBUM_CONFIG.totalPages * ALBUM_CONFIG.cardsPerPage
  const teamOwned = cards.filter((card) =>
    players.some((player) => getCount(allProgress, player.id, card.id) > 0)
  ).length
  const teamPercent = Math.round((teamOwned / totalCards) * 100)

  const playerStats = players.map((player) => {
    const owned = cards.filter((card) => getCount(allProgress, player.id, card.id) > 0).length
    const duplicates = cards.reduce(
      (total, card) => total + Math.max(0, getCount(allProgress, player.id, card.id) - 1),
      0
    )

    return {
      ...player,
      owned,
      duplicates,
      percent: Math.round((owned / totalCards) * 100),
    }
  })

  return (
    <section className="bg-gray-950 border-b border-gray-800 px-4 py-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-black text-white">Estadisticas generales</h2>
            <p className="text-[11px] text-gray-400">
              Cobertura del equipo: {teamOwned} de {totalCards}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-indigo-300">{teamPercent}%</div>
            <div className="text-[10px] uppercase text-gray-500 font-bold">del libro</div>
          </div>
        </div>

        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-indigo-500" style={{ width: `${teamPercent}%` }} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {playerStats.map((player) => (
            <div key={player.id} className="bg-gray-900 border border-gray-800 rounded-lg p-2">
              <div className="flex justify-between gap-2">
                <span className="text-xs font-bold text-white truncate">{player.name}</span>
                <span className="text-xs font-black text-indigo-300">{player.percent}%</span>
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                {player.owned}/{totalCards} cartas - {player.duplicates} repetidas
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
