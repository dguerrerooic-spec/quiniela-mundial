'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'

type Match = {
  id: string
  match_number: number
  group_name: string
  status: string
  home_score: number | null
  away_score: number | null
  home_team_id: number
  away_team_id: number
  home_team?: { name: string }
  away_team?: { name: string }
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
        .select('id, match_number, group_name, status, home_score, away_score, home_team_id, away_team_id')
        .order('match_number')

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
      // Calcular puntos automáticamente
      const match = matches.find(m => m.id === matchId)
      if (match) {
        await supabase.rpc('calculate_match_points', { p_match_id: match.match_number })
      }

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-gray-500">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Panel Admin</h1>
        <p className="text-gray-400 text-sm mb-8">Ingresá resultados de partidos</p>

        {Object.entries(groupedMatches).map(([group, groupMatches]) => (
          <div key={group} className="mb-8">
            <h2 className="text-orange-600 font-bold text-sm uppercase tracking-wider mb-3">
              Grupo {group}
            </h2>
            <div className="space-y-2">
              {groupMatches.map(match => (
                <div key={match.id} className={`rounded-xl px-4 py-3 border flex items-center gap-4 ${
                  match.status === 'finished'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-100 shadow-sm'
                }`}>
                  <div className="flex-1 text-right">
                    <span className="font-semibold text-gray-800 text-sm">{match.home_team?.name}</span>
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
                      className="w-12 h-9 bg-gray-100 text-gray-800 text-center rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-lg font-bold border border-gray-200"
                    />
                    <span className="text-gray-400 font-bold">:</span>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={scores[match.id]?.away ?? ''}
                      onChange={(e) => setScores(prev => ({
                        ...prev,
                        [match.id]: { ...prev[match.id], away: e.target.value }
                      }))}
                      className="w-12 h-9 bg-gray-100 text-gray-800 text-center rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-lg font-bold border border-gray-200"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-gray-800 text-sm">{match.away_team?.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      match.status === 'finished'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {match.status === 'finished' ? 'Finalizado' : 'Pendiente'}
                    </span>
                    <button
                      onClick={() => handleSaveResult(match.id)}
                      disabled={saving === match.id}
                      className="text-xs px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
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