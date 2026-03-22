import { useEffect, useState } from "react"

export function AppLoader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0)
  const [tagline, setTagline] = useState("")
  const [showLogo, setShowLogo] = useState(false)

  const fullTagline = "AGENTIC CAREER INTELLIGENCE"

  useEffect(() => {
    // Logo appears after 200ms
    const logoTimer = setTimeout(() => setShowLogo(true), 200)

    // Typeout tagline starting at 600ms
    let charIndex = 0
    const typeTimer = setTimeout(() => {
      const interval = setInterval(() => {
        charIndex++
        setTagline(fullTagline.slice(0, charIndex))
        if (charIndex >= fullTagline.length) clearInterval(interval)
      }, 45)
      return () => clearInterval(interval)
    }, 600)

    // Progress bar
    const startProgress = setTimeout(() => {
      const step = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(step)
            return 100
          }
          return p + 2
        })
      }, 28)
      return () => clearInterval(step)
    }, 300)

    // Complete after ~1.9s
    const doneTimer = setTimeout(onComplete, 1900)

    return () => {
      clearTimeout(logoTimer)
      clearTimeout(typeTimer)
      clearTimeout(startProgress)
      clearTimeout(doneTimer)
    }
  }, [onComplete])

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Logo mark */}
      <div
        className="transition-all duration-500"
        style={{
          opacity: showLogo ? 1 : 0,
          transform: showLogo ? 'scale(1) translateY(0)' : 'scale(0.7) translateY(20px)',
        }}
      >
        {/* CALIBR wordmark */}
        <div className="flex flex-col items-center gap-3 mb-12">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'var(--accent-primary)',
              boxShadow: '0 0 40px rgba(0,229,160,0.4)',
            }}
          >
            <span
              className="text-4xl font-bold"
              style={{
                fontFamily: 'Bebas Neue, sans-serif',
                color: 'var(--text-inverse)',
                lineHeight: 1,
              }}
            >C</span>
          </div>

          <div className="text-center">
            <h1
              className="text-5xl tracking-[0.25em]"
              style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '0.25em',
              }}
            >
              CALIBR
            </h1>
            <p
              className="mt-2 tracking-[0.15em]"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--accent-primary)',
                letterSpacing: '0.15em',
                minHeight: '16px',
              }}
            >
              {tagline}
              <span
                className="inline-block w-0.5 h-3 ml-0.5 align-middle"
                style={{
                  background: 'var(--accent-primary)',
                  animation: 'pulse 1s step-start infinite',
                  opacity: tagline.length < fullTagline.length ? 1 : 0,
                }}
              />
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="w-64 h-0.5 rounded-full overflow-hidden"
          style={{ background: 'var(--bg-elevated)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${progress}%`,
              background: 'var(--accent-primary)',
              boxShadow: '0 0 8px rgba(0,229,160,0.6)',
            }}
          />
        </div>

        <p
          className="text-center mt-4 font-mono text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          Initializing intelligence engine...
        </p>
      </div>
    </div>
  )
}
