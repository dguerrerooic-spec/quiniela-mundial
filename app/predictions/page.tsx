'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase'

type Match = {
  id: string
  group_name: string
  home_team_id: number
  away_team_id: number
  status: string
  score_multiplier: number
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
        .select('id, group_name, status, home_team_id, away_team_id, score_multiplier')
        .in('status', ['upcoming', 'live', 'finished'])
        .order('match_number')

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
    if (pred?.home_score_pred === undefined || pred?.away_score_pred === undefined ||
    isNaN(pred.home_score_pred) || isNaN(pred.away_score_pred)) {
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
        [field]: value === '' ? undefined : parseInt(value)
      }
    }))
    // Al editar, marcar como no guardado para permitir re-guardar
    setSaved(prev => {
      const next = new Set(prev)
      next.delete(matchId)
      return next
    })
  }

  const groupedMatches = matches.reduce((acc, match) => {
    const group = match.group_name || 'Sin grupo'
    if (!acc[group]) acc[group] = []
    acc[group].push(match)
    return acc
  }, {} as Record<string, Match[]>)

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-gray-500">Cargando partidos...</p>
    </div>
  )

  const totalSaved = saved.size
  const totalMatches = matches.length

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-800">Mis Pronósticos</h1>
          <span className="bg-orange-100 text-orange-600 font-semibold px-3 py-1 rounded-full text-sm">
            {totalSaved}/{totalMatches}
          </span>
        </div>
        <p className="text-gray-400 text-sm mb-8">
          Marcador exacto = 3 pts · Resultado correcto = 1 pt · Semis ×2 · Final ×3
        </p>

        {Object.entries(groupedMatches).map(([group, groupMatches]) => (
          <div key={group} className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-orange-600 font-bold text-sm uppercase tracking-wider">
                Grupo {group}
              </h2>
              <span className="text-gray-400 text-xs">
                {groupMatches.filter(m => saved.has(m.id)).length}/{groupMatches.length} pronosticados
              </span>
            </div>
            <div className="space-y-2">
              {groupMatches.map(match => {
                const pred = predictions[match.id]
                const hasPred = saved.has(match.id)
                return (
                  <div key={match.id} className={`rounded-xl px-4 py-3 border transition-all ${
                    hasPred
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-100 shadow-sm'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 text-right">
                        <span className="font-semibold text-gray-800 text-sm">{match.home_team?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
  type="number"
  min="0"
  max="20"
  value={pred?.home_score_pred ?? ''}
  onChange={(e) => updatePrediction(match.id, 'home_score_pred', e.target.value)}
  disabled={match.status !== 'upcoming'}
  className="w-12 h-9 bg-gray-100 text-gray-800 text-center rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-lg font-bold border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
/>
                        <span className="text-gray-400 font-bold">:</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={pred?.away_score_pred ?? ''}
                          onChange={(e) => updatePrediction(match.id, 'away_score_pred', e.target.value)}
                          className="w-12 h-9 bg-gray-100 text-gray-800 text-center rounded-lg outline-none focus:ring-2 focus:ring-orange-400 text-lg font-bold border border-gray-200"
                        />
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-gray-800 text-sm">{match.away_team?.name}</span>
                      </div>
                      <button
  onClick={() => handleSave(match.id)}
  disabled={saving === match.id || match.status !== 'upcoming'}
  className={`text-xs px-3 py-2 rounded-lg transition-colors font-medium min-w-[80px] disabled:cursor-not-allowed ${
    hasPred
      ? 'bg-green-100 hover:bg-green-200 text-green-700'
      : match.status !== 'upcoming'
      ? 'bg-gray-100 text-gray-400'
      : 'bg-orange-500 hover:bg-orange-600 text-white'
  }`}
>
  {saving === match.id ? '...' : hasPred ? '✓ Guardado' : match.status !== 'upcoming' ? 'Cerrado' : 'Guardar'}
</button>
                    </div>
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