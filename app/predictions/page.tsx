'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase'

type Match = {
  id: string
  match_date: string
  group_name: string
  home_team_id: number
  away_team_id: number
  home_score: number | null
  away_score: number | null
  status: string
  home_team?: { name: string; flag_emoji: string }
  away_team?: { name: string; flag_emoji: string }
}

type Prediction = {
  match_id: string
  home_score_pred: number
  away_score_pred: number
}

export default function PredictionsPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: matchesData } = await supabase
        .from('matches')
        .select('id, match_date, group_name, status, home_score, away_score, home_team_id, away_team_id')
        .eq('status', 'upcoming')
        .order('match_date')

      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, flag_emoji')

      const { data: predictionsData } = await supabase
        .from('predictions')
        .select('match_id, home_score_pred, away_score_pred')
        .eq('user_id', user.id)

      if (matchesData && teamsData) {
        const teamsMap: Record<string, any> = {}
        teamsData.forEach(t => { teamsMap[t.id] = t })
        const enriched = matchesData.map(m => ({
          ...m,
          home_team: teamsMap[m.home_team_id],
          away_team: teamsMap[m.away_team_id],
        }))
        setMatches(enriched as any)
      }

      if (predictionsData) {
        const map: Record<string, Prediction> = {}
        predictionsData.forEach(p => { map[p.match_id] = p })
        setPredictions(map)
        setSaved(new Set(predictionsData.map(p => p.match_id)))
      }

      setLoading(false)
    }
    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (matchId: string) => {
    setSaving(matchId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(null); return }

    const pred = predictions[matchId]
    if (pred?.home_score_pred === undefined || pred?.away_score_pred === undefined) {
      setSaving(null)
      return
    }

    const { error } = await supabase.from('predictions').upsert({
      user_id: user.id,
      match_id: matchId,
      home_score_pred: pred.home_score_pred,
      away_score_pred: pred.away_score_pred,
    }, { onConflict: 'user_id,match_id' })

    if (!error) {
      setSaved(prev => new Set([...prev, matchId]))
    }
    setSaving(null)
  }

  const updatePrediction = (matchId: string, field: 'home_score_pred' | 'away_score_pred', value: string) => {
    setPredictions(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        match_id: matchId,
        [field]: parseInt(value) || 0
      }
    }))
  }

  const groupedMatches = matches.reduce((acc, match) => {
    const group = match.group_name || 'Sin grupo'
    if (!acc[group]) acc[group] = []
    acc[group].push(match)
    return acc
  }, {} as Record<string, Match[]>)

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white">Cargando partidos...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Mis Pronósticos</h1>
        <p className="text-gray-400 text-sm mb-8">
          Marcador exacto = 3 pts · Resultado correcto = 1 pt
        </p>

        {Object.entries(groupedMatches).map(([group, groupMatches]) => (
          <div key={group} className="mb-8">
            <h2 className="text-orange-500 font-semibold text-sm uppercase tracking-wider mb-3">
              {group}
            </h2>
            <div className="space-y-3">
              {groupMatches.map(match => {
                const pred = predictions[match.id]
                const hasPred = saved.has(match.id)
                return (
                  <div key={match.id} className="bg-gray-900 rounded-xl p-4 flex items-center gap-4">
                    <div className="flex-1 text-right">
                      <p className="font-semibold">{match.home_team?.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={pred?.home_score_pred ?? ''}
                        onChange={(e) => updatePrediction(match.id, 'home_score_pred', e.target.value)}
                        className="w-12 h-10 bg-gray-800 text-white text-center rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <span className="text-gray-500 font-bold">—</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={pred?.away_score_pred ?? ''}
                        onChange={(e) => updatePrediction(match.id, 'away_score_pred', e.target.value)}
                        className="w-12 h-10 bg-gray-800 text-white text-center rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{match.away_team?.name}</p>
                    </div>
                    <button
                      onClick={() => handleSave(match.id)}
                      disabled={saving === match.id}
                      className={`text-xs px-3 py-2 rounded-lg transition-colors ${
                        hasPred
                          ? 'bg-green-800 hover:bg-green-700 text-green-200'
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }`}
                    >
                      {saving === match.id ? '...' : hasPred ? '✓ Guardado' : 'Guardar'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}