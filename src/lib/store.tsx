import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AuthUser, Backend } from './backend'
import type { Cliente, Colaborador, Config, Frete, Gasto, Pagamento, Usuario, Veiculo } from './types'
import { monthOf, today } from './format'

export interface Data {
  clientes: Cliente[]
  veiculos: Veiculo[]
  colaboradores: Colaborador[]
  fretes: Frete[]
  gastos: Gasto[]
  pagamentos: Pagamento[]
  usuarios: Usuario[]
}

const EMPTY: Data = { clientes: [], veiculos: [], colaboradores: [], fretes: [], gastos: [], pagamentos: [], usuarios: [] }

export const DEFAULT_CONFIG: Omit<Config, 'donoUid' | 'donoColaboradorId'> = {
  empresa: 'RDCM Transportes e Guincho',
  pctComissao: 10,
  pctDono: 50,
}

type AuthState = { status: 'loading' } | { status: 'out' } | { status: 'in'; user: AuthUser }

interface Ctx {
  be: Backend
  auth: AuthState
  perfil: Usuario | null
  perfilErro: string | null
  config: Config | null
  data: Data
  loaded: boolean
  isAdmin: boolean
  isDono: boolean
  meuColabId: string | null
  mes: string
  setMes: (m: string) => void
  cliente: (id: string) => Cliente | undefined
  veiculo: (id: string | null) => Veiculo | undefined
  colab: (id: string) => Colaborador | undefined
  nomeCliente: (id: string) => string
  nomeVeiculo: (id: string | null) => string
  nomeColab: (id: string) => string
  toast: (msg: string, tipo?: 'ok' | 'erro') => void
}

const StoreCtx = createContext<Ctx | null>(null)

export const useStore = () => {
  const c = useContext(StoreCtx)
  if (!c) throw new Error('StoreProvider ausente')
  return c
}

async function bootstrap(be: Backend, user: AuthUser): Promise<void> {
  const cfg = await be.getDoc<Config>(['config', 'geral'])
  const base = { nome: user.nome, email: user.email, criadoEm: new Date().toISOString() }
  if (cfg) {
    await be.setDoc(['usuarios', user.uid], { ...base, papel: 'pendente', colaboradorId: null })
    return
  }
  await be.setDoc(['config', 'geral'], { ...DEFAULT_CONFIG, donoUid: user.uid, donoColaboradorId: null })
  await be.setDoc(['usuarios', user.uid], { ...base, papel: 'dono', colaboradorId: null })
  const colId = await be.add('colaboradores', { nome: user.nome, telefone: '', funcao: 'Proprietário', ativo: true })
  await be.update('usuarios', user.uid, { colaboradorId: colId })
  await be.setDoc(['config', 'geral'], { ...DEFAULT_CONFIG, donoUid: user.uid, donoColaboradorId: colId })
}

export function StoreProvider({ be, children }: { be: Backend; children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' })
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [perfilErro, setPerfilErro] = useState<string | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [data, setData] = useState<Data>(EMPTY)
  const [loadedCols, setLoadedCols] = useState<Set<string>>(new Set())
  const [mes, setMes] = useState(monthOf(today()))
  const [toasts, setToasts] = useState<{ id: number; msg: string; tipo: 'ok' | 'erro' }[]>([])
  const tid = useRef(0)

  const toast = useCallback((msg: string, tipo: 'ok' | 'erro' = 'ok') => {
    const id = ++tid.current
    setToasts((t) => [...t, { id, msg, tipo }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  useEffect(() => be.onAuth((u) => setAuth(u ? { status: 'in', user: u } : { status: 'out' })), [be])

  const uid = auth.status === 'in' ? auth.user.uid : null
  useEffect(() => {
    setPerfil(null)
    setPerfilErro(null)
    setConfig(null)
    setData(EMPTY)
    setLoadedCols(new Set())
    if (auth.status !== 'in') return
    const user = auth.user
    let cancel = false
    let unsubs: (() => void)[] = []
    ;(async () => {
      try {
        const existing = await be.getDoc<Usuario>(['usuarios', user.uid])
        if (!existing) await bootstrap(be, user)
        if (cancel) return
        unsubs.push(be.watchDoc<Usuario>(['usuarios', user.uid], setPerfil, (e) => setPerfilErro(e.message)))
        unsubs.push(be.watchDoc<Config>(['config', 'geral'], setConfig))
      } catch (e) {
        setPerfilErro((e as Error).message)
      }
    })()
    return () => {
      cancel = true
      unsubs.forEach((u) => u())
      unsubs = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [be, uid])

  const papel = perfil?.papel
  const meuColabId = perfil?.colaboradorId ?? null
  const isAdmin = papel === 'dono' || papel === 'admin'

  useEffect(() => {
    if (!papel || papel === 'pendente') return
    if (!isAdmin && !meuColabId) return
    const set = <K extends keyof Data>(k: K) => (rows: Data[K]) => {
      setData((d) => ({ ...d, [k]: rows }))
      setLoadedCols((s) => (s.has(k) ? s : new Set(s).add(k)))
    }
    const err = (e: Error) => toast('Erro ao carregar dados: ' + e.message, 'erro')
    const own = (field: string) => (isAdmin ? null : { field, value: meuColabId! })
    const u = [
      be.watchCol('clientes', null, set('clientes'), err),
      be.watchCol('veiculos', null, set('veiculos'), err),
      be.watchCol('colaboradores', null, set('colaboradores'), err),
      be.watchCol('fretes', own('motoristaId'), set('fretes'), err),
      be.watchCol('gastos', own('quemId'), set('gastos'), err),
      be.watchCol('pagamentos', own('colaboradorId'), set('pagamentos'), err),
    ]
    if (isAdmin) u.push(be.watchCol('usuarios', null, set('usuarios'), err))
    return () => u.forEach((x) => x())
  }, [be, papel, isAdmin, meuColabId, toast])

  const value = useMemo<Ctx>(() => {
    const idx = <T extends { id: string }>(rows: T[]) => new Map(rows.map((r) => [r.id, r]))
    const C = idx(data.clientes), V = idx(data.veiculos), P = idx(data.colaboradores)
    return {
      be, auth, perfil, perfilErro, config, data,
      loaded: loadedCols.size >= 6,
      isAdmin,
      isDono: papel === 'dono',
      meuColabId,
      mes, setMes,
      cliente: (id) => C.get(id),
      veiculo: (id) => (id ? V.get(id) : undefined),
      colab: (id) => P.get(id),
      nomeCliente: (id) => C.get(id)?.nome ?? '—',
      nomeVeiculo: (id) => (id && V.get(id)?.nome) || '—',
      nomeColab: (id) => P.get(id)?.nome ?? '—',
      toast,
    }
  }, [be, auth, perfil, perfilErro, config, data, loadedCols, isAdmin, papel, meuColabId, mes, toast])

  return (
    <StoreCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-in pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
              t.tipo === 'erro' ? 'bg-red-600 text-white' : 'bg-ink text-white'
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </StoreCtx.Provider>
  )
}

export function errMsg(e: unknown): string {
  const m = String((e as Error)?.message || e)
  if (m.includes('invalid-credential') || m.includes('wrong-password') || m.includes('user-not-found')) return 'E-mail ou senha incorretos.'
  if (m.includes('email-already-in-use')) return 'Esse e-mail já tem conta. Use "Entrar".'
  if (m.includes('weak-password')) return 'Senha fraca: use pelo menos 6 caracteres.'
  if (m.includes('invalid-email')) return 'E-mail inválido.'
  if (m.includes('permission-denied') || m.includes('insufficient permissions')) return 'Sem permissão para essa ação.'
  if (m.includes('network') || m.includes('unavailable')) return 'Sem conexão. Tente de novo quando tiver sinal.'
  return m
}
