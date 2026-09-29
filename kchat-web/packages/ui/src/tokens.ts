// kchat-web/packages/ui/src/tokens.ts
// Design Tokens — KChat màu sắc, typography, spacing

export const colors = {
  primary: {
    50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc',
    400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1',
    800: '#075985', 900: '#0c4a6e',
  },
  purple: {
    50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe',
    400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce',
  },
  gray: {
    50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
    400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
    800: '#1e293b', 900: '#0f172a',
  },
  success: { light: '#dcfce7', default: '#22c55e', dark: '#16a34a' },
  warning: { light: '#fef9c3', default: '#eab308', dark: '#ca8a04' },
  danger:  { light: '#fee2e2', default: '#ef4444', dark: '#dc2626' },
  info:    { light: '#eff6ff', default: '#3b82f6', dark: '#1d4ed8' },
} as const

export const spacing = {
  0: '0px', 1: '4px', 2: '8px', 3: '12px', 4: '16px',
  5: '20px', 6: '24px', 8: '32px', 10: '40px', 12: '48px',
} as const

export const radius = {
  sm: '6px', md: '8px', lg: '12px', xl: '16px', full: '9999px',
} as const

export const shadow = {
  sm:  '0 1px 3px rgba(0,0,0,0.06)',
  md:  '0 4px 12px rgba(0,0,0,0.08)',
  lg:  '0 10px 30px rgba(0,0,0,0.12)',
  xl:  '0 25px 60px rgba(0,0,0,0.2)',
} as const

export const font = {
  family: "'Inter', system-ui, -apple-system, sans-serif",
  size: { xs: '11px', sm: '12px', base: '14px', md: '15px', lg: '16px', xl: '20px', '2xl': '24px' },
  weight: { normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800 },
} as const
