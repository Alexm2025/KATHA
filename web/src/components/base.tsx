// Dependency-light building blocks. The landing page imports only these, so it does not
// pull the database layer into the first download.
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { BASE, usePrefs } from '@/lib/store'

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ')
export { cx }

const BTN = {
  primary: 'bg-terra text-white hover:bg-terra-dark',
  leaf: 'bg-leaf text-white hover:bg-leaf-dark',
  soft: 'bg-cream-deep text-ink hover:bg-saffron-soft',
  ghost: 'bg-transparent text-ink hover:bg-cream-deep',
  outline: 'bg-white text-terra-dark border-2 border-terra hover:bg-terra-soft',
}

export function Btn({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BTN }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-2 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        BTN[variant],
        className,
      )}
    />
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx('rounded-2xl border border-cream-deep bg-white p-4 shadow-sm', className)}>
      {children}
    </div>
  )
}

const CHIP = {
  neutral: 'bg-cream-deep text-ink',
  good: 'bg-leaf-soft text-leaf-dark',
  warn: 'bg-saffron-soft text-terra-dark',
  bad: 'bg-terra-soft text-terra-dark',
}

export function Chip({ tone = 'neutral', children }: { tone?: keyof typeof CHIP; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-bold', CHIP[tone])}>
      {children}
    </span>
  )
}

export function Logo({ small }: { small?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-bold text-terra-dark">
      <img src={`${BASE}/favicon.svg`} alt="" className={small ? 'size-7' : 'size-9'} />
      <span className={small ? 'text-lg' : 'text-2xl'}>KATHA</span>
    </span>
  )
}

export function LangToggle() {
  const { uiLang, set } = usePrefs()
  return (
    <button
      type="button"
      onClick={() => set({ uiLang: uiLang === 'hi' ? 'en' : 'hi' })}
      aria-label={uiLang === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
      className="min-h-12 rounded-xl border-2 border-cream-deep bg-white px-3 font-bold text-ink hover:bg-cream-deep"
    >
      {uiLang === 'hi' ? 'English' : 'हिंदी'}
    </button>
  )
}
