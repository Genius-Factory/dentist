import { useLocation } from 'react-router-dom'

const decorationSets = [
  [
    { type: 'tooth', variant: 'cool', className: 'left-[-58px] top-16 h-44 w-44 -rotate-12 md:left-[-8px] md:h-64 md:w-64' },
    { type: 'brush', className: 'right-[-72px] top-[38%] h-20 w-56 rotate-[18deg] md:right-[-18px] md:w-72' },
  ],
  [
    { type: 'mirror', className: 'left-[-42px] top-[34%] h-44 w-44 rotate-[16deg] md:left-3 md:h-56 md:w-56' },
    { type: 'tooth', variant: 'pearl', className: 'right-[-54px] top-20 h-40 w-40 rotate-12 md:right-0 md:h-60 md:w-60' },
  ],
  [
    { type: 'brush', className: 'left-[-78px] top-24 h-20 w-60 -rotate-[20deg] md:left-[-12px] md:w-[19rem]' },
    { type: 'floss', className: 'right-[-32px] top-[48%] h-32 w-32 rotate-[14deg] md:right-8 md:h-44 md:w-44' },
  ],
  [
    { type: 'tooth', variant: 'mint', className: 'left-[-52px] top-[44%] h-40 w-40 -rotate-[18deg] md:left-0 md:h-60 md:w-60' },
    { type: 'mirror', className: 'right-[-54px] top-20 h-40 w-40 rotate-[20deg] md:right-2 md:h-52 md:w-52' },
  ],
]

const toothFilters = {
  cool: 'drop-shadow(0 34px 46px rgba(14, 165, 233, 0.24)) saturate(1.12) brightness(1.04)',
  pearl: 'drop-shadow(0 34px 48px rgba(56, 189, 248, 0.22)) saturate(1.08) brightness(1.06)',
  mint: 'drop-shadow(0 34px 48px rgba(6, 182, 212, 0.2)) saturate(1.1) brightness(1.04) hue-rotate(-4deg)',
}

const toothPaths = {
  cool: 'M97 24c-14-10-31-7-41 4-10-11-27-14-41-4C-4 34 3 73 14 101c9 24 14 53 29 55 12 1 15-21 18-39 2-10 4-18 9-18s7 8 9 18c3 18 6 40 18 39 15-2 20-31 29-55 11-28 18-67-29-77Z',
  pearl: 'M96 25c-13-11-29-8-40 3-11-11-27-14-40-3-20 16-11 58-2 79 10 24 16 51 30 52 11 1 14-19 17-37 2-12 4-20 9-20s7 8 9 20c3 18 6 38 17 37 14-1 20-28 30-52 9-21 18-63-2-79Z',
  mint: 'M98 27c-15-11-32-7-42 5-10-12-27-16-42-5-19 15-10 55-1 80 9 26 15 50 29 50 12 0 16-20 19-39 2-11 4-19 9-19s7 8 9 19c3 19 7 39 19 39 14 0 20-24 29-50 9-25 18-65-1-80Z',
}

function getDecorationSet(pathname) {
  const total = [...pathname].reduce((sum, character) => sum + character.charCodeAt(0), 0)
  return decorationSets[total % decorationSets.length]
}

function renderToothDecoration(className, variant = 'cool') {
  const gradientId = `decor-tooth-${variant}`
  const glowId = `decor-tooth-glow-${variant}`

  return (
    <div className={`absolute ${className}`}>
      <div className="absolute inset-[-18%] rounded-full bg-sky-300/35 blur-3xl" />
      <div className="absolute inset-[10%] rounded-[44%] bg-sky-100/60 blur-xl" />
      <svg
        viewBox="0 0 140 172"
        className="relative h-full w-full scale-110 opacity-85"
        style={{ filter: toothFilters[variant] }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={gradientId} cx="38%" cy="24%" r="82%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="28%" stopColor="#effbff" />
            <stop offset="58%" stopColor="#bae6fd" />
            <stop offset="82%" stopColor="#7dd3fc" />
            <stop offset="100%" stopColor="#38bdf8" />
          </radialGradient>
          <radialGradient id={glowId} cx="44%" cy="22%" r="48%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d={toothPaths[variant]} fill={`url(#${gradientId})`} stroke="rgba(224,242,254,0.88)" strokeWidth="4" />
        <path d="M34 43c13-11 28-10 37 1 8-9 22-12 34-5" fill="none" stroke="rgba(14,165,233,0.28)" strokeLinecap="round" strokeWidth="5" />
        <ellipse cx="48" cy="50" rx="23" ry="32" fill={`url(#${glowId})`} transform="rotate(-18 48 50)" />
        <path d="M35 80c8 13 20 20 35 20s28-7 36-20" fill="none" stroke="rgba(255,255,255,0.42)" strokeLinecap="round" strokeWidth="5" />
      </svg>
      <div className="absolute left-[20%] top-[16%] h-[28%] w-[34%] rounded-full bg-white/55 blur-md" />
      <div className="absolute inset-x-[18%] bottom-[6%] h-[30%] rounded-full bg-sky-300/30 blur-2xl" />
    </div>
  )
}

function renderBrushDecoration(className) {
  return (
    <div className={`absolute opacity-75 drop-shadow-xl ${className}`}>
      <div className="absolute left-0 top-1/2 h-5 w-[78%] -translate-y-1/2 rounded-full bg-sky-300 shadow-inner shadow-white/50" />
      <div className="absolute left-3 top-1/2 h-2 w-[54%] -translate-y-1/2 rounded-full bg-white/75" />
      <div className="absolute right-0 top-1/2 h-12 w-16 -translate-y-1/2 rounded-xl bg-white shadow-inner shadow-sky-100" />
      <div className="absolute right-3 top-2 h-8 w-2 rounded-full bg-cyan-300" />
      <div className="absolute right-7 top-2 h-8 w-2 rounded-full bg-sky-400" />
      <div className="absolute right-11 top-2 h-8 w-2 rounded-full bg-cyan-200" />
    </div>
  )
}

function renderMirrorDecoration(className) {
  return (
    <div className={`absolute opacity-70 drop-shadow-xl ${className}`}>
      <div className="absolute left-7 top-4 h-24 w-24 rounded-full border-[14px] border-sky-200 bg-white/80 shadow-inner shadow-sky-100" />
      <div className="absolute left-[92px] top-[102px] h-20 w-5 -rotate-45 rounded-full bg-slate-300" />
      <div className="absolute left-[82px] top-[90px] h-9 w-9 rounded-full bg-slate-200" />
    </div>
  )
}

function renderFlossDecoration(className) {
  return (
    <div className={`absolute opacity-70 drop-shadow-xl ${className}`}>
      <div className="absolute inset-5 rounded-[2rem] border-[12px] border-sky-100 bg-white/80 shadow-inner shadow-sky-100" />
      <div className="absolute left-1/2 top-8 h-20 w-16 -translate-x-1/2 rounded-full border-t-4 border-cyan-300" />
      <div className="absolute bottom-9 left-1/2 h-2 w-14 -translate-x-1/2 rounded-full bg-cyan-300" />
    </div>
  )
}

const renderers = {
  tooth: renderToothDecoration,
  brush: renderBrushDecoration,
  mirror: renderMirrorDecoration,
  floss: renderFlossDecoration,
}

export default function DentalPageDecor() {
  const { pathname } = useLocation()
  const decorations = getDecorationSet(pathname)

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {decorations.map((decoration, index) => {
        const renderDecoration = renderers[decoration.type]
        return (
          <div key={`${pathname}-${decoration.type}-${index}`}>
            {renderDecoration(decoration.className, decoration.variant)}
          </div>
        )
      })}
    </div>
  )
}
