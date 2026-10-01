import type { AuthUser, Backend, DocPath } from './backend'
import { DEMO_KEY } from './demoReset'
import type { Cliente, Colaborador, Config, Frete, Gasto, Pagamento, Usuario, Veiculo } from './types'

const KEY = DEMO_KEY
type Store = { auth: AuthUser | null; accounts: AuthUser[]; docs: Record<string, Record<string, Record<string, unknown>>> }

const now = () => new Date().toISOString()
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

function seed(): Store {
  const colab: Colaborador[] = [
    ['c-rafael', 'Rafael', 'Proprietário'],
    ['c-raphael', 'Raphael', 'Motorista'],
    ['c-gabriel', 'Gabriel', 'Motorista'],
    ['c-joao', 'João', 'Motorista'],
    ['c-ronaldo', 'Ronaldo', 'Motorista'],
  ].map(([id, nome, funcao]) => ({ id, nome, funcao, telefone: '', ativo: true }))

  const veic: Veiculo[] = [
    ['v-9160', '9160', 'Caminhão'],
    ['v-34', '3/4 RD', 'Caminhão 3/4'],
    ['v-cargo', 'Cargo RS', 'Caminhão'],
    ['v-exp', 'Exp. RD', 'Expresso'],
    ['v-1721', '1721 Sob', 'Guincho plataforma'],
    ['v-hr', 'HR RD', 'Utilitário'],
  ].map(([id, nome, tipo]) => ({ id, nome, tipo, placa: '', ativo: true }))

  const cli: Cliente[] = [
    ['k-mgm', 'Coop. MGM', '', 30],
    ['k-itapira', 'Coop. Itapira', '', 15],
    ['k-terra', 'Terra Verde', '10', 30],
    ['k-rental', 'Rod. Rental', '', 0],
  ].map(([id, nome, codigo, prazo]) => ({
    id: id as string, nome: nome as string, codigo: codigo as string, prazoDias: prazo as number,
    telefone: '', documento: '', obs: '', ativo: true,
  }))

  const fr: [string, string, string, string, number, string, boolean, string?][] = [
    ['2026-08-01', 'k-mgm', 'Estiva Gerbi', 'v-9160', 330, 'c-rafael', true],
    ['2026-08-03', 'k-mgm', 'Itapira', 'v-9160', 910, 'c-rafael', true],
    ['2026-08-18', 'k-itapira', 'Itapira', 'v-34', 590, 'c-joao', true],
    ['2026-08-27', 'k-terra', 'Descalvado/MG', 'v-cargo', 1780, 'c-rafael', true, '1452'],
    ['2026-09-01', 'k-itapira', 'Mogi Mirim', 'v-9160', 599.4, 'c-gabriel', false],
    ['2026-09-04', 'k-terra', 'Pouso Alegre/MG', 'v-cargo', 1250, 'c-raphael', false, '1488'],
    ['2026-09-09', 'k-terra', 'Rod. Rental', 'v-1721', 2600, 'c-raphael', false, '1493'],
    ['2026-09-10', 'k-mgm', 'S.A. Pinhal', 'v-9160', 1950, 'c-joao', false],
    ['2026-09-15', 'k-terra', 'Descalvado', 'v-34', 880, 'c-joao', false],
    ['2026-09-19', 'k-rental', 'Campinas', 'v-1721', 450, 'c-ronaldo', true],
    ['2026-09-22', 'k-mgm', 'Itapira', 'v-hr', 380, 'c-gabriel', false],
    ['2026-09-28', 'k-mgm', 'Itapira', 'v-9160', 642.6, 'c-gabriel', false],
  ]
  const fretes: Frete[] = fr.map(([data, clienteId, local, veiculoId, valor, motoristaId, pago, nf], i) => {
    const prazo = cli.find((c) => c.id === clienteId)!.prazoDias
    const d = new Date(data + 'T12:00:00')
    d.setDate(d.getDate() + prazo)
    return {
      id: 'f' + (i + 1), data, clienteId, local, veiculoId, motoristaId, valor,
      servico: veiculoId === 'v-1721' ? 'guincho' : 'frete',
      pctComissao: 10, pctDono: 50, pago, recebidoEm: pago ? data : null,
      nf: nf || '', vencimento: prazo ? d.toISOString().slice(0, 10) : null, obs: '',
      criadoPor: 'u-rafael', criadoEm: now(),
    }
  })

  const gastos: Gasto[] = [
    ['2026-08-04', 'Diesel posto', 'Diesel', 'v-9160', 'c-rafael', 684, false],
    ['2026-08-19', 'Troca de óleo', 'Manutenção', 'v-34', 'c-rafael', 563, false],
    ['2026-09-10', 'Diesel posto', 'Diesel', 'v-9160', 'c-joao', 450, true],
    ['2026-09-12', 'Pedágio Bandeirantes', 'Pedágio', 'v-cargo', 'c-raphael', 86.4, true],
    ['2026-09-20', 'Pneu dianteiro', 'Pneu', 'v-1721', 'c-rafael', 1290, false],
  ].map(([data, descricao, categoria, veiculoId, quemId, valor, reembolsar], i) => ({
    id: 'g' + (i + 1), data, descricao, categoria, veiculoId, quemId, valor, reembolsar,
    criadoPor: 'u-rafael', criadoEm: now(),
  })) as Gasto[]

  const pagamentos: Pagamento[] = [
    { id: 'p1', data: '2026-08-30', colaboradorId: 'c-joao', valor: 324.5, tipo: 'pagamento', obs: 'Acerto agosto', criadoEm: now() },
    { id: 'p2', data: '2026-09-12', colaboradorId: 'c-raphael', valor: 300, tipo: 'vale', obs: 'Vale', criadoEm: now() },
  ]

  const usuarios: Usuario[] = [
    { id: 'u-rafael', nome: 'Rafael', email: 'rafael@rdcm.demo', papel: 'dono', colaboradorId: 'c-rafael', criadoEm: now() },
    { id: 'u-joao', nome: 'João', email: 'joao@rdcm.demo', papel: 'colaborador', colaboradorId: 'c-joao', criadoEm: now() },
  ]

  const config: Config & { id: string } = {
    id: 'geral', empresa: 'RDCM Transportes e Guincho', donoUid: 'u-rafael', donoColaboradorId: 'c-rafael', pctComissao: 10, pctDono: 50,
  }

  const byId = <T extends { id: string }>(rows: T[]) => Object.fromEntries(rows.map((r) => [r.id, r as unknown as Record<string, unknown>]))
  return {
    auth: null,
    accounts: usuarios.map((u) => ({ uid: u.id, email: u.email, nome: u.nome })),
    docs: {
      colaboradores: byId(colab), veiculos: byId(veic), clientes: byId(cli), fretes: byId(fretes),
      gastos: byId(gastos), pagamentos: byId(pagamentos), usuarios: byId(usuarios), config: byId([config]),
    },
  }
}

export function demoBackend(): Backend {
  let S: Store
  try {
    S = JSON.parse(localStorage.getItem(KEY) || '') as Store
  } catch {
    S = seed()
  }
  const listeners = new Set<() => void>()
  const authListeners = new Set<(u: AuthUser | null) => void>()
  const persist = () => {
    localStorage.setItem(KEY, JSON.stringify(S))
    listeners.forEach((l) => l())
  }
  persist()
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return
    S = JSON.parse(e.newValue)
    listeners.forEach((l) => l())
    authListeners.forEach((l) => l(S.auth))
  })
  const colOf = (c: string) => (S.docs[c] ??= {})
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
  const setAuth = (u: AuthUser | null) => {
    S.auth = u
    persist()
    authListeners.forEach((l) => l(u))
  }
  const tick = () => new Promise((r) => setTimeout(r, 60))

  return {
    demo: true,
    onAuth: (cb) => {
      authListeners.add(cb)
      setTimeout(() => cb(S.auth), 0)
      return () => authListeners.delete(cb)
    },
    signIn: async (email) => {
      await tick()
      const acc = S.accounts.find((a) => a.email.toLowerCase() === email.toLowerCase().trim())
      if (!acc) throw new Error('auth/invalid-credential')
      setAuth(acc)
    },
    signUp: async (nome, email) => {
      await tick()
      if (S.accounts.some((a) => a.email === email)) throw new Error('auth/email-already-in-use')
      const acc = { uid: 'u-' + uid(), email, nome }
      S.accounts.push(acc)
      setAuth(acc)
    },
    resetPassword: async () => tick().then(() => undefined),
    signOut: async () => setAuth(null),
    watchCol: (col, filter, cb) => {
      const emit = () => {
        const rows = Object.values(colOf(col)).filter((d) => !filter || d[filter.field] === filter.value)
        cb(clone(rows) as never)
      }
      listeners.add(emit)
      setTimeout(emit, 0)
      return () => listeners.delete(emit)
    },
    watchDoc: <T,>(path: DocPath, cb: (d: T | null) => void) => {
      const emit = () => cb(clone(colOf(path[0])[path[1]] ?? null) as T | null)
      listeners.add(emit)
      setTimeout(emit, 0)
      return () => listeners.delete(emit)
    },
    getDoc: async <T,>(path: DocPath) => clone(colOf(path[0])[path[1]] ?? null) as T | null,
    setDoc: async (path, data) => {
      colOf(path[0])[path[1]] = { ...clone(data), id: path[1] }
      persist()
    },
    add: async (col, data) => {
      const id = uid()
      colOf(col)[id] = { ...clone(data), id }
      persist()
      return id
    },
    update: async (col, id, patch) => {
      const c = colOf(col)
      if (!c[id]) throw new Error('not-found')
      c[id] = { ...c[id], ...clone(patch), id }
      persist()
    },
    updateMany: async (col, ids, patch) => {
      const c = colOf(col)
      ids.forEach((id) => c[id] && (c[id] = { ...c[id], ...clone(patch), id }))
      persist()
    },
    remove: async (col, id) => {
      delete colOf(col)[id]
      persist()
    },
  }
}