'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({
    total_points: 0,
    position: '—',
    predictions_count: 0
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUser(user)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, is_paid')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      const { data: leaderboard } = await supabase
        .from('leaderboard_general')
        .select('*')
        .order('total_points', { ascending: false })

      const { count: predictionsCount } = await supabase
        .from('predictions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (leaderboard) {
        const myIndex = leaderboard.findIndex(r => r.user_id === user.id)
        const myPoints = myIndex >= 0 ? leaderboard[myIndex].total_points : 0
        setStats({
          total_points: myPoints,
          position: myIndex >= 0 ? `#${myIndex + 1}` : '—',
          predictions_count: predictionsCount || 0
        })
      }
      setLoading(false)
    }
    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-gray-500">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-6">

        {/* Bienvenida */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 mb-6 text-white">
          <h1 className="text-2xl font-bold mb-1">⚽ Quiniela Mundial 2026</h1>
          <p className="opacity-90">Bienvenido, {profile?.full_name || user?.email}</p>
          {!profile?.is_paid && (
            <div className="mt-3 bg-white/20 rounded-lg px-4 py-2 text-sm font-medium">
              ⚠️ Tu cuenta aún no está activada. Realizá tu depósito para que tus pronósticos tengan validez.
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
            <p className="text-gray-400 text-xs mb-1">Mis puntos</p>
            <p className="text-3xl font-bold text-orange-500">{stats.total_points}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
            <p className="text-gray-400 text-xs mb-1">Posición</p>
            <p className="text-3xl font-bold text-orange-500">{stats.position}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
            <p className="text-gray-400 text-xs mb-1">Pronósticos</p>
            <p className="text-3xl font-bold text-orange-500">{stats.predictions_count}/72</p>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Link href="/predictions" className="bg-white hover:bg-orange-50 rounded-2xl p-5 shadow-sm border border-gray-100 transition-colors block">
            <p className="text-lg font-semibold text-gray-800 mb-1">📋 Mis Pronósticos</p>
            <p className="text-gray-400 text-sm">Ingresá tus predicciones para los 72 partidos de la fase de grupos</p>
          </Link>
          <Link href="/leaderboard" className="bg-white hover:bg-orange-50 rounded-2xl p-5 shadow-sm border border-gray-100 transition-colors block">
            <p className="text-lg font-semibold text-gray-800 mb-1">🏆 Tabla General</p>
            <p className="text-gray-400 text-sm">Ver la clasificación y puntos de todos los participantes</p>
          </Link>
        </div>

        {/* Reglas */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📖 Reglas y Sistema de Puntos</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <span className="text-orange-500 font-bold text-base">3</span>
              <p><strong className="text-gray-800">Marcador exacto</strong> — Acertás el resultado exacto del partido (ej. 2-1)</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-orange-500 font-bold text-base">1</span>
              <p><strong className="text-gray-800">Resultado correcto</strong> — Acertás quién gana o si hay empate, pero no el marcador exacto</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-orange-500 font-bold text-base">×2</span>
              <p><strong className="text-gray-800">Semifinales</strong> — Los puntos se multiplican por 2</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-orange-500 font-bold text-base">×3</span>
              <p><strong className="text-gray-800">Final</strong> — Los puntos se multiplican por 3</p>
            </div>
          </div>
        </div>

        {/* Premios */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
          <h2 className="text-lg font-bold text-gray-800 mb-4">🏅 Distribución de Premios</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-yellow-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🥇</span>
                <span className="font-semibold text-gray-800">1er lugar</span>
              </div>
              <span className="text-xl font-bold text-yellow-600">60%</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🥈</span>
                <span className="font-semibold text-gray-800">2do lugar</span>
              </div>
              <span className="text-xl font-bold text-gray-500">30%</span>
            </div>
            <div className="flex items-center justify-between bg-amber-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🥉</span>
                <span className="font-semibold text-gray-800">3er lugar</span>
              </div>
              <span className="text-xl font-bold text-amber-600">10%</span>
            </div>
          </div>
        </div>

        {/* Info adicional */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-3">ℹ️ Información importante</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              Esta quiniela cubre únicamente la <strong className="text-gray-800">fase de grupos</strong> del Mundial 2026.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              Se realizará una <strong className="text-gray-800">quiniela separada</strong> para la fase eliminatoria.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              Debés realizar tu <strong className="text-gray-800">depósito de participación</strong> para que tus pronósticos tengan validez.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              Los puntos y posiciones se actualizan <strong className="text-gray-800">al finalizar cada partido</strong>.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              Podés ver la tabla general con los puntos de todos en la pestaña <strong className="text-gray-800">Tabla</strong>.
            </li>
          </ul>
        </div>

      </div>
    </div>
  )
}