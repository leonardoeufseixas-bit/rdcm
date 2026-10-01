import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { extendTailwindMerge } from 'tailwind-merge'
import { monthLabel, shiftMonth, today, monthOf } from '../lib/format'

const twMerge = extendTailwindMerge({ extend: { theme: { color: ['ink', 'ink-2', 'ink-3', 'brand', 'brand-dark', 'paper', 'line', 'muted'] } } })

export const cx = (...c: (string | false | null | undefined)[]) => twMerge(c.filter(Boolean).join(' '))

type BtnVariant = 'primary' | 'dark' | 'ghost' | 'outline' | 'danger' | 'success'
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-brand text-ink hover:bg-brand-dark shadow-sm',
  dark: 'bg-ink text-white hover:bg-ink-3',
  ghost: 'text-ink hover:bg-black/5',
  outline: 'border border-line bg-white text-ink hover:bg-paper',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className,
  children,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; icon?: ReactNode }) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-40',
        size === 'sm' && 'h-8 px-3 text-[13px]',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-12 px-5 text-base',
        BTN[variant],
        className,
      )}
    >
      {icon}
      {children}
    </button>
  )
}

export function IconButton({ className, label, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...p}
      aria-label={label}
      title={label}
      className={cx('inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-black/5 hover:text-ink', className)}
    >
      {children}
    </button>
  )
}

export function Card({ className, children, title, action, pad = true }: { className?: string; children: ReactNode; title?: ReactNode; action?: ReactNode; pad?: boolean }) {
  return (
    <section className={cx('print-card rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(0,0,0,.04)]', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="font-display text-lg font-bold tracking-wide">{title}</h2>
          {action}
        </header>
      )}
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </section>
  )
}

export function Kpi({
  label,
  value,
  hint,
  tone = 'default',
  icon,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'default' | 'dark' | 'green' | 'red' | 'brand'
  icon?: ReactNode
}) {
  const t = {
    default: 'bg-white border-line',
    dark: 'bg-ink text-white border-ink',
    green: 'bg-white border-line',
    red: 'bg-white border-line',
    brand: 'bg-brand border-brand text-ink',
  }[tone]
  const vc = tone === 'green' ? 'text-emerald-700' : tone === 'red' ? 'text-red-700' : ''
  return (
    <div className={cx('print-card relative overflow-hidden rounded-2xl border p-4', t)}>
      {tone === 'dark' && <div className="absolute inset-y-0 left-0 w-1.5 bg-brand" />}
      <div className={cx('flex items-center gap-2 text-[13px] font-medium', tone === 'dark' ? 'text-white/60' : tone === 'brand' ? 'text-ink/70' : 'text-muted')}>
        {icon}
        {label}
      </div>
      <div className={cx('num mt-1 font-display text-[26px] leading-tight font-bold', vc)}>{value}</div>
      {hint && <div className={cx('mt-0.5 text-xs', tone === 'dark' ? 'text-white/50' : 'text-muted')}>{hint}</div>}
    </div>
  )
}

export function Badge({ tone = 'gray', children, className }: { tone?: 'gray' | 'green' | 'red' | 'amber' | 'dark' | 'blue'; children: ReactNode; className?: string }) {
  const t = {
    gray: 'bg-paper text-muted border-line',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    dark: 'bg-ink text-brand border-ink',
    blue: 'bg-sky-50 text-sky-700 border-sky-200',
  }[tone]
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold', t, className)}>{children}</span>
}

export function Field({ label, children, className, hint }: { label: string; children: ReactNode; className?: string; hint?: ReactNode }) {
  return (
    <label className={cx('flex flex-col gap-1', className)}>
      <span className="text-xs font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </label>
  )
}

const inputCls =
  'h-11 w-full rounded-xl border border-line bg-paper/60 px-3 text-[15px] outline-none transition placeholder:text-muted/60 focus:border-ink focus:bg-white focus:ring-2 focus:ring-brand/40'

export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(inputCls, className)} />
}

export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...p} className={cx(inputCls, 'select-chevron appearance-none pr-8', className)}>
      {children}
    </select>
  )
}

export function MoneyInput(p: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">R$</span>
      <Input type="number" step="0.01" min="0" inputMode="decimal" {...p} className={cx('num pl-9', p.className)} />
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', k)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-[2px] md:items-center md:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('sheet-in safe-bottom flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl md:rounded-3xl', wide ? 'md:max-w-3xl' : 'md:max-w-lg')}>
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-line md:hidden" />
        <header className="flex items-center justify-between px-5 pt-3 pb-2 md:pt-5">
          <h3 className="font-display text-xl font-bold">{title}</h3>
          <IconButton label="Fechar" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  )
}

export function Empty({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon && <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-paper text-muted">{icon}</div>}
      <div className="font-display text-lg font-bold">{title}</div>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
    </div>
  )
}

export function MonthPicker({ value, onChange, allowAll = true }: { value: string; onChange: (m: string) => void; allowAll?: boolean }) {
  const base = value || monthOf(today())
  return (
    <div className="inline-flex h-10 items-center rounded-xl border border-line bg-white p-0.5">
      <IconButton label="Mês anterior" className="h-8 w-8" onClick={() => onChange(shiftMonth(base, -1))}>
        <ChevronLeft size={18} />
      </IconButton>
      <span className="min-w-[118px] text-center text-sm font-semibold">{monthLabel(value)}</span>
      <IconButton label="Próximo mês" className="h-8 w-8" onClick={() => onChange(shiftMonth(base, 1))}>
        <ChevronRight size={18} />
      </IconButton>
      {allowAll && (
        <button
          onClick={() => onChange(value ? '' : monthOf(today()))}
          className={cx('ml-0.5 h-8 rounded-lg px-2.5 text-xs font-semibold transition', !value ? 'bg-ink text-white' : 'text-muted hover:bg-black/5')}
        >
          Tudo
        </button>
      )}
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, ReactNode][] }) {
  return (
    <div className="no-scrollbar inline-flex max-w-full overflow-x-auto rounded-xl border border-line bg-white p-0.5">
      {options.map(([k, l]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={cx('h-9 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition', value === k ? 'bg-ink text-white' : 'text-muted hover:text-ink')}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

export function Avatar({ nome, className, brand }: { nome: string; className?: string; brand?: boolean }) {
  const ini = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
  return (
    <div className={cx('flex shrink-0 items-center justify-center rounded-full font-display font-bold', brand ? 'bg-brand text-ink' : 'bg-ink text-brand', className || 'h-9 w-9 text-sm')}>
      {ini || '?'}
    </div>
  )
}

export function Bar({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-paper">
      <div className={cx('h-full rounded-full bg-brand', className)} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  )
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-[28px] leading-none font-bold tracking-wide md:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function Spinner() {
  return <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-brand" />
}
