'use client'

import { useState } from 'react'
import { createClient } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-orange-600 mb-2">⚽ Quiniela</h1>
          <p className="text-gray-500">Mundial 2026</p>
        </div>
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Iniciar sesión</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Correo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 text-gray-800 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400 border border-gray-200"
                placeholder="tu@correo.com"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 text-gray-800 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-orange-400 border border-gray-200"
                placeholder="••••••••"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-3 transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
          <p className="text-center text-gray-400 text-sm mt-6">
            ¿No tenés cuenta?{' '}
            <Link href="/auth/register" className="text-orange-500 hover:text-orange-600">
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}