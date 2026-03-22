/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        // CALIBR Design System
        'bg-base':     '#080B0F',
        'bg-surface':  '#0E1117',
        'bg-elevated': '#151B24',
        'bg-border':   '#1E2733',
        'accent-mint':    '#00E5A0',
        'accent-sky':     '#0EA5E9',
        'accent-amber':   '#F59E0B',
        'accent-rose':    '#F43F5E',
        'accent-purple':  '#A855F7',
        'text-primary':   '#F1F5F9',
        'text-secondary': '#94A3B8',
        'text-muted':     '#475569',
        // Keep shad-cn compat
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
      fontFamily: {
        syne:       ['Syne', 'sans-serif'],
        'dm-sans':  ['DM Sans', 'sans-serif'],
        mono:       ['JetBrains Mono', 'monospace'],
        bebas:      ['Bebas Neue', 'sans-serif'],
      },
      fontSize: {
        'display': ['64px', { lineHeight: '1', fontWeight: '800' }],
        'h1':      ['40px', { lineHeight: '1.1', fontWeight: '700' }],
        'h2':      ['28px', { lineHeight: '1.2', fontWeight: '600' }],
        'h3':      ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'body':    ['15px', { lineHeight: '1.6' }],
        'label':   ['12px', { lineHeight: '1', fontWeight: '500', letterSpacing: '0.08em' }],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-right': {
          '0%': { opacity: '0', transform: 'translateX(30px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0, 229, 160, 0.4)' },
          '50%': { boxShadow: '0 0 22px rgba(0, 229, 160, 0.8)' },
        },
        'bounce-dot': {
          '0%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-6px)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-up':    'fade-up 0.4s ease both',
        'fade-in':    'fade-in 0.3s ease both',
        'slide-right':'slide-right 0.4s ease both',
        'pop-in':     'pop-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
        'shimmer':    'shimmer 1.8s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'bounce-dot': 'bounce-dot 1.4s ease-in-out infinite',
        'spin-slow':  'spin-slow 3s linear infinite',
        'toast-in':   'toast-in 0.35s ease both',
      },
      boxShadow: {
        'glow-mint':   '0 0 20px rgba(0, 229, 160, 0.25)',
        'glow-blue':   '0 0 20px rgba(14, 165, 233, 0.25)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.25)',
        'glow-amber':  '0 0 20px rgba(245, 158, 11, 0.25)',
        'glow-rose':   '0 0 20px rgba(244, 63, 94, 0.25)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
