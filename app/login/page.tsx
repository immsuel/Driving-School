"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { Loader2, ShieldCheck, AlertCircle, ArrowRight, Mail, Lock } from "lucide-react"
import Image from "next/image"

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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;500;600&display=swap');

        .dees-login-root {
          font-family: 'Barlow', sans-serif;
        }

        .dees-input {
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
        }

        .dees-input:focus {
          outline: none;
          border-color: #dc2626;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.08);
        }

        .dees-btn {
          transition: background 0.15s, transform 0.1s;
        }

        .dees-btn:hover:not(:disabled) {
          background: #b91c1c;
        }

        .dees-btn:active:not(:disabled) {
          transform: scale(0.99);
        }

        @keyframes dees-spin {
          to { transform: rotate(360deg); }
        }

        .dees-spin {
          animation: dees-spin 0.8s linear infinite;
        }
      `}</style>

      <div
        className="dees-login-root"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f1923",
          padding: "2rem 1rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top-right red corner accent */}
        <div style={{
          position: "absolute",
          top: 0, right: 0,
          width: 160, height: 160,
          background: "linear-gradient(135deg, transparent 50%, rgba(220,38,38,0.07) 50%)",
          pointerEvents: "none",
        }} />

        {/* Road surface */}
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height: 88,
          backgroundColor: "#1a2332",
          borderTop: "3px solid #2a3a4f",
          pointerEvents: "none",
        }}>
          {/* Road dashes */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: 0, right: 0,
            transform: "translateY(-50%)",
            display: "flex",
            justifyContent: "center",
            gap: 0,
          }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 48,
                  height: 6,
                  backgroundColor: "#e8c84a",
                  margin: "0 18px",
                  borderRadius: 3,
                  opacity: 0.5,
                }}
              />
            ))}
          </div>
        </div>

        {/* Login card */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 4,
            width: "100%",
            maxWidth: 400,
            position: "relative",
            zIndex: 2,
            overflow: "hidden",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {/* Red top bar */}
          <div style={{ height: 6, backgroundColor: "#dc2626" }} />

          {/* Card body */}
          <div style={{ padding: "2rem" }}>

            {/* Logo + title */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: "1.75rem",
              paddingBottom: "1.5rem",
              borderBottom: "1px solid #f0f0f0",
            }}>
              <Image
                src="/DEES-DRIVER-TRAINING-LOGO.png"
                alt="DEES Driver Training Centre"
                width={80}
                height={48}
                style={{ objectFit: "contain", flexShrink: 0 }}
              />
              <div>
                <p style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "#dc2626",
                  margin: "0 0 2px",
                }}>
                  Admin Portal
                </p>
                <p style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#0f1923",
                  lineHeight: 1,
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}>
                  Staff Login
                </p>
              </div>
            </div>

            {/* Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1rem" }}>
              {/* Email */}
              <div>
                <label style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#6b7280",
                  marginBottom: 4,
                }}>
                  Email address
                </label>
                <div style={{ position: "relative" }}>
                  <Mail
                    size={16}
                    style={{
                      position: "absolute",
                      left: 13,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#9ca3af",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="dees-input"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 14px 11px 38px",
                      border: "1.5px solid #e5e7eb",
                      borderRadius: 4,
                      fontFamily: "'Barlow', sans-serif",
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#111827",
                      backgroundColor: "#f9fafb",
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#6b7280",
                  marginBottom: 4,
                }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={16}
                    style={{
                      position: "absolute",
                      left: 13,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#9ca3af",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleLogin()}
                    className="dees-input"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 14px 11px 38px",
                      border: "1.5px solid #e5e7eb",
                      borderRadius: 4,
                      fontFamily: "'Barlow', sans-serif",
                      fontSize: 14,
                      fontWeight: 500,
                      color: "#111827",
                      backgroundColor: "#f9fafb",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderLeft: "3px solid #dc2626",
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                color: "#991b1b",
                marginBottom: "1rem",
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            {/* Sign in button */}
            <button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="dees-btn"
              style={{
                width: "100%",
                height: 48,
                backgroundColor: loading || !email || !password ? "#d1d5db" : "#dc2626",
                color: "white",
                border: "none",
                borderRadius: 4,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 15,
                fontWeight: 900,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                cursor: loading || !email || !password ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: "1.25rem",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="dees-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Sign In
                  <span style={{
                    position: "absolute",
                    right: 0, top: 0, bottom: 0,
                    width: 48,
                    backgroundColor: "rgba(0,0,0,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <ArrowRight size={18} />
                  </span>
                </>
              )}
            </button>

            {/* Footer */}
            <p style={{
              textAlign: "center",
              fontSize: 11,
              color: "#9ca3af",
              marginTop: "1.25rem",
              fontWeight: 500,
              letterSpacing: "0.03em",
            }}>
              Dees Driver Training Centre &nbsp;·&nbsp; Authorised access only
            </p>

          </div>
        </div>
      </div>
    </>
  )
}