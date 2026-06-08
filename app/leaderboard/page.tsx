'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase'

type Leader = {
  user_id: string
  full_name: string
  total_points: number
  rank: number
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)

      const { data } = await supabase
        .from('leaderboard_general')
        .select('*')
        .order('total_points', { ascending: false })

      if (data) {
        const ranked = data.map((row, index) => ({
          ...row,
          rank: index + 1
        }))
        setLeaders(ranked)
      }
      setLoading(false)
    }
    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-gray-500">Cargando tabla...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Tabla General</h1>
        <p className="text-gray-400 text-sm mb-8">Clasificación por puntos totales</p>

        {leaders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <p className="text-gray-400">Aún no hay puntos registrados.</p>
            <p className="text-gray-300 text-sm mt-2">Los puntos aparecen cuando se ingresan resultados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaders.map(leader => (
              <div
                key={leader.user_id}
                className={`rounded-xl p-4 flex items-center gap-4 border transition-all ${
                  leader.user_id === currentUserId
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-white border-gray-100 shadow-sm'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                  leader.rank === 1 ? 'bg-yellow-400 text-white' :
                  leader.rank === 2 ? 'bg-gray-300 text-gray-700' :
                  leader.rank === 3 ? 'bg-amber-500 text-white' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {leader.rank === 1 ? '🥇' : leader.rank === 2 ? '🥈' : leader.rank === 3 ? '🥉' : leader.rank}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    {leader.full_name}
                    {leader.user_id === currentUserId && (
                      <span className="text-orange-400 text-xs ml-2 font-normal">(tú)</span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-orange-500">{leader.total_points}</p>
                  <p className="text-gray-400 text-xs">pts</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}