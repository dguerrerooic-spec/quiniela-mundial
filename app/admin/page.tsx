'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'

type Match = {
  id: string
  match_date: string
  group_name: string
  status: string
  home_score: number | null
  away_score: number | null
  home_team?: { name: string }
  away_team?: { name: string }
  home_team_id: number
  away_team_id: number
}

export default function AdminPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({})
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) { router.push('/dashboard'); return }

      const { data: matchesData } = await supabase
        .from('matches')
        .select('id, match_date, group_name, status, home_score, away_score, home_team_id, away_team_id')
        .order('match_date')

      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name')

      if (matchesData && teamsData) {
        const teamsMap: Record<string, any> = {}
        teamsData.forEach(t => { teamsMap[t.id] = t })
        const enriched = matchesData.map(m => ({
          ...m,
          home_team: teamsMap[m.home_team_id],
          away_team: teamsMap[m.away_team_id],
        }))
        setMatches(enriched as any)

        const initialScores: Record<string, { home: string; away: string }> = {}
        matchesData.forEach(m => {
          initialScores[m.id] = {
            home: m.home_score?.toString() ?? '',
            away: m.away_score?.toString() ?? ''
          }
        })
        setScores(initialScores)
      }
      setLoading(false)
    }
    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveResult = async (matchId: string) => {
    setSaving(matchId)
    const score = scores[matchId]
    if (score?.home === '' || score?.away === '') {
      setSaving(null)
      return
    }

    const { error } = await supabase
      .from('matches')
      .update({
        home_score: parseInt(score.home),
        away_score: parseInt(score.away),
        status: 'finished'
      })
      .eq('id', matchId)

    if (!error) {
      setMatches(prev => prev.map(m =>
        m.id === matchId
          ? { ...m, home_score: parseInt(score.home), away_score: parseInt(score.away), status: 'finished' }
          : m
      ))
    }
    setSaving(null)
  }

  const groupedMatches = matches.reduce((acc, match) => {
    const group = match.group_name || 'Sin grupo'
    if (!acc[group]) acc[group] = []
    acc[group].push(match)
    return acc
  }, {} as Record<string, Match[]>)

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Panel Admin</h1>
        <p className="text-gray-400 text-sm mb-8">Ingresá resultados de partidos</p>

        {Object.entries(groupedMatches).map(([group, groupMatches]) => (
          <div key={group} className="mb-8">
            <h2 className="text-orange-500 font-semibold text-sm uppercase tracking-wider mb-3">
              {group}
            </h2>
            <div className="space-y-3">
              {groupMatches.map(match => (
                <div key={match.id} className={`rounded-xl p-4 flex items-center gap-4 ${
                  match.status === 'finished' ? 'bg-gray-800' : 'bg-gray-900'
                }`}>
                  <div className="flex-1 text-right">
                    <p className="font-semibold">{match.home_team?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={scores[match.id]?.home ?? ''}
                      onChange={(e) => setScores(prev => ({
                        ...prev,
                        [match.id]: { ...prev[match.id], home: e.target.value }
                      }))}
                      className="w-12 h-10 bg-gray-700 text-white text-center rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <span className="text-gray-500 font-bold">—</span>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={scores[match.id]?.away ?? ''}
                      onChange={(e) => setScores(prev => ({
                        ...prev,
                        [match.id]: { ...prev[match.id], away: e.target.value }
                      }))}
                      className="w-12 h-10 bg-gray-700 text-white text-center rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{match.away_team?.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      match.status === 'finished'
                        ? 'bg-green-900 text-green-300'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {match.status === 'finished' ? 'Finalizado' : 'Pendiente'}
                    </span>
                    <button
                      onClick={() => handleSaveResult(match.id)}
                      disabled={saving === match.id}
                      className="text-xs px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                    >
                      {saving === match.id ? '...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}