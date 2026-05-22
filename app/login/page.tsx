"use client"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { Loader2, BadgeCheck, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")

  async function handleLogin() {
    setLoading(true)
    setError("")
    const res = await signIn("credentials", {
      email, password,
      redirect: false,
    })
    if (res?.error) {
      setError("Invalid email or password.")
      setLoading(false)
    } else {
      window.location.href = "/admin"
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Driving School</p>
          <h1 className="text-xl font-black text-slate-800 mt-1">Admin Login</h1>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          className="w-full h-12 rounded-xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          {loading
            ? <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</>
            : <><BadgeCheck className="h-4 w-4" />Sign In</>}
        </button>
      </div>
    </div>
  )
}