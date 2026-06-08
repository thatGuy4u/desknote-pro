import React from 'react'

export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-[var(--bg-1)] flex-col gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1d4ed8] to-[#3b82f6] flex items-center justify-center text-3xl shadow-xl shadow-[#3b82f6]/30">
        📌
      </div>
      <div>
        <p className="text-base font-semibold text-[var(--text-1)] text-center">DeskNote Pro</p>
        <p className="text-xs text-[var(--text-3)] text-center mt-1">Loading your workspace…</p>
      </div>
      <div className="flex gap-1 mt-2">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  )
}
