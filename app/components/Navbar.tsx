'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Navbar() {
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (profile?.is_admin) setIsAdmin(true)
    }
    checkAdmin()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/dashboard" className="text-white font-bold text-xl">
          ⚽ Quiniela 2026
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-gray-400 hover:text-white text-sm transition-colors">
            Inicio
          </Link>
          <Link href="/predictions" className="text-gray-400 hover:text-white text-sm transition-colors">
            Pronósticos
          </Link>
          <Link href="/leaderboard" className="text-gray-400 hover:text-white text-sm transition-colors">
            Tabla
          </Link>
          {isAdmin && (
            <Link href="/admin" className="text-orange-400 hover:text-orange-300 text-sm transition-colors">
              Admin
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="text-sm bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Salir
          </button>
        </div>
      </div>
    </nav>
  )
}