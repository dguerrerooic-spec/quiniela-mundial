'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
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

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-white">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">⚽ Quiniela Mundial 2026</h1>
        <p className="text-gray-400 mb-8">Bienvenido, {user?.email}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-1">Mis puntos</p>
            <p className="text-4xl font-bold text-orange-500">{stats.total_points}</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-1">Posición</p>
            <p className="text-4xl font-bold text-orange-500">{stats.position}</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-1">Pronósticos</p>
            <p className="text-4xl font-bold text-orange-500">{stats.predictions_count}/72</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/predictions" className="bg-gray-900 hover:bg-gray-800 rounded-2xl p-6 transition-colors block">
            <p className="text-lg font-semibold mb-1">Mis Pronósticos</p>
            <p className="text-gray-400 text-sm">Ingresá tus predicciones para los 72 partidos</p>
          </Link>
          <Link href="/leaderboard" className="bg-gray-900 hover:bg-gray-800 rounded-2xl p-6 transition-colors block">
            <p className="text-lg font-semibold mb-1">Tabla General</p>
            <p className="text-gray-400 text-sm">Ver la clasificación de todos los participantes</p>
          </Link>
        </div>
      </div>
    </div>
  )
}