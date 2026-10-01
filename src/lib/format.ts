const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const money = (n: number) => brl.format(Number.isFinite(n) ? n : 0)

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export const today = () => {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export const addDays = (iso: string, days: number) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** 2026-09-28 -> 28/09 */
export const dShort = (iso: string | null | undefined) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—')

/** 2026-09-28 -> 28/09/2026 */
export const dFull = (iso: string | null | undefined) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—')

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

/** 2026-09 -> Setembro/26 */
export const monthLabel = (ym: string) => (ym ? `${MESES[+ym.slice(5, 7) - 1]}/${ym.slice(2, 4)}` : 'Todo o período')

export const monthOf = (iso: string) => iso.slice(0, 7)

export const shiftMonth = (ym: string, delta: number) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const sum = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + (f(r) || 0), 0)

export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export const onlyDigits = (s: string) => s.replace(/\D/g, '')

export const whatsappLink = (text: string, phone?: string) => {
  const p = onlyDigits(phone || '')
  const num = p ? (p.length <= 11 ? '55' + p : p) : ''
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
}
