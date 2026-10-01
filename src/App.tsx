import { useEffect, useState, type ReactNode } from 'react'
import {
  ClipboardList,
  Fuel,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings2,
  Truck,
  Users,
  Wallet,
} from 'lucide-react'
import { useStore } from './lib/store'
import { Avatar, Button, Modal, Spinner, cx } from './components/ui'
import { FreteModalProvider, useFreteModal } from './components/FreteModal'
import { Logo } from './components/Logo'
import { Login } from './pages/Login'
import { Pendente } from './pages/Pendente'
import { Painel } from './pages/Painel'
import { Fretes } from './pages/Fretes'
import { Cobranca } from './pages/Cobranca'
import { Equipe } from './pages/Equipe'
import { Gastos } from './pages/Gastos'
import { Cadastros } from './pages/Cadastros'
import { MeusGanhos } from './pages/MeusGanhos'
import { resetDemo } from './lib/demoReset'

type Route = { key: string; label: string; short?: string; icon: ReactNode; el: () => ReactNode }

const ADMIN: Route[] = [
  { key: 'painel', label: 'Visão geral', short: 'Início', icon: <LayoutDashboard size={20} />, el: () => <Painel /> },
  { key: 'fretes', label: 'Fretes', icon: <Truck size={20} />, el: () => <Fretes /> },
  { key: 'cobranca', label: 'Cobrança', short: 'Cobrar', icon: <HandCoins size={20} />, el: () => <Cobranca /> },
  { key: 'equipe', label: 'Pagamento da equipe', short: 'Equipe', icon: <Users size={20} />, el: () => <Equipe /> },
  { key: 'gastos', label: 'Gastos', icon: <Fuel size={20} />, el: () => <Gastos /> },
  { key: 'cadastros', label: 'Cadastros', icon: <Settings2 size={20} />, el: () => <Cadastros /> },
]
const COLAB: Route[] = [
  { key: 'inicio', label: 'Meus ganhos', short: 'Ganhos', icon: <Wallet size={20} />, el: () => <MeusGanhos /> },
  { key: 'fretes', label: 'Meus fretes', short: 'Fretes', icon: <ClipboardList size={20} />, el: () => <Fretes /> },
  { key: 'gastos', label: 'Meus gastos', short: 'Gastos', icon: <Fuel size={20} />, el: () => <Gastos /> },
]
const MOBILE_ADMIN = ['painel', 'fretes', 'cobranca', 'equipe']

const readHash = () => location.hash.replace(/^#\/?/, '').split('?')[0]

export function App() {
  const { auth, perfil, perfilErro, be } = useStore()
  if (auth.status === 'loading') return <Splash />
  if (auth.status === 'out') return <Login />
  if (perfilErro)
    return (
      <Splash>
        <p className="max-w-sm text-center text-sm text-white/70">Erro ao abrir seu perfil: {perfilErro}</p>
        <Button variant="outline" onClick={() => be.signOut()}>
          Sair
        </Button>
      </Splash>
    )
  if (!perfil) return <Splash />
  if (perfil.papel === 'pendente' || (perfil.papel === 'colaborador' && !perfil.colaboradorId)) return <Pendente />
  return (
    <FreteModalProvider>
      <Shell />
    </FreteModalProvider>
  )
}

function Splash({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ink text-white">
      <Logo big />
      {children ?? <Spinner />}
    </div>
  )
}

function Shell() {
  const { isAdmin, perfil, be, loaded, auth } = useStore()
  const routes = isAdmin ? ADMIN : COLAB
  const [hash, setHash] = useState(readHash)
  const [more, setMore] = useState(false)
  const openFrete = useFreteModal()
  useEffect(() => {
    const h = () => setHash(readHash())
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  const route = routes.find((r) => r.key === hash) ?? routes[0]
  const go = (k: string) => {
    location.hash = '/' + k
    setMore(false)
    window.scrollTo({ top: 0 })
  }
  const mobile = isAdmin ? routes.filter((r) => MOBILE_ADMIN.includes(r.key)) : routes
  const extra = isAdmin ? routes.filter((r) => !MOBILE_ADMIN.includes(r.key)) : []
  const papelLabel = perfil?.papel === 'dono' ? 'Proprietário' : perfil?.papel === 'admin' ? 'Administrador' : 'Colaborador'
  const nome = perfil?.nome || (auth.status === 'in' ? auth.user.nome : '')

  return (
    <div className="min-h-dvh md:pl-64">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-ink text-white md:flex">
        <div className="px-5 pt-6 pb-5">
          <Logo />
        </div>
        <div className="hazard h-1.5 opacity-90" />
        <nav className="flex-1 space-y-1 px-3 py-4">
          {routes.map((r) => (
            <button
              key={r.key}
              onClick={() => go(r.key)}
              className={cx(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-semibold transition',
                route.key === r.key ? 'bg-brand text-ink' : 'text-white/70 hover:bg-white/5 hover:text-white',
              )}
            >
              {r.icon}
              {r.label}
            </button>
          ))}
          <div className="px-1 pt-4">
            <Button className="w-full" variant="outline" icon={<Plus size={18} />} onClick={() => openFrete()}>
              Lançar frete
            </Button>
          </div>
        </nav>
        {be.demo && <DemoNote />}
        <div className="flex items-center gap-3 border-t border-white/10 px-4 py-4">
          <Avatar nome={nome} brand />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{nome}</div>
            <div className="text-xs text-white/50">{papelLabel}</div>
          </div>
          <button title="Sair" className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white" onClick={() => be.signOut()}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <header className="no-print safe-top sticky top-0 z-30 bg-ink text-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo />
          <button onClick={() => setMore(true)} className="flex items-center gap-2 rounded-full bg-white/10 py-1 pr-3 pl-1">
            <Avatar nome={nome} brand className="h-8 w-8 text-sm" />
            <Menu size={18} />
          </button>
        </div>
        <div className="hazard h-1" />
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-5 pb-32 md:px-8 md:pt-8 md:pb-12">
        {!loaded ? (
          <div className="flex justify-center py-24">
            <Spinner />
          </div>
        ) : (
          route.el()
        )}
      </main>

      <button
        onClick={() => openFrete()}
        aria-label="Lançar frete"
        className="no-print fixed right-4 bottom-[calc(76px+env(safe-area-inset-bottom,0px))] z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-ink shadow-xl shadow-black/20 active:scale-95 md:hidden"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>

      <nav className="no-print safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur md:hidden">
        <div className="flex">
          {mobile.map((r) => (
            <button
              key={r.key}
              onClick={() => go(r.key)}
              className={cx('flex flex-1 flex-col items-center gap-0.5 pt-2 pb-2 text-[11px] font-semibold', route.key === r.key ? 'text-ink' : 'text-muted')}
            >
              <span className={cx('flex h-7 w-12 items-center justify-center rounded-full transition', route.key === r.key && 'bg-brand')}>{r.icon}</span>
              {r.short ?? r.label}
            </button>
          ))}
          {extra.length > 0 && (
            <button onClick={() => setMore(true)} className={cx('flex flex-1 flex-col items-center gap-0.5 pt-2 pb-2 text-[11px] font-semibold', extra.some((r) => r.key === route.key) ? 'text-ink' : 'text-muted')}>
              <span className={cx('flex h-7 w-12 items-center justify-center rounded-full', extra.some((r) => r.key === route.key) && 'bg-brand')}>
                <Menu size={20} />
              </span>
              Mais
            </button>
          )}
        </div>
      </nav>

      <Modal open={more} onClose={() => setMore(false)} title={nome}>
        <p className="-mt-2 mb-4 text-sm text-muted">
          {papelLabel} · {perfil?.email}
        </p>
        <div className="grid gap-2">
          {routes.map((r) => (
            <button
              key={r.key}
              onClick={() => go(r.key)}
              className={cx('flex items-center gap-3 rounded-xl border px-4 py-3 text-left font-semibold', route.key === r.key ? 'border-brand bg-brand/15' : 'border-line')}
            >
              {r.icon}
              {r.label}
            </button>
          ))}
          <button onClick={() => be.signOut()} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-left font-semibold text-red-700">
            <LogOut size={20} /> Sair
          </button>
        </div>
        {be.demo && (
          <div className="mt-4">
            <DemoNote light />
          </div>
        )}
      </Modal>
    </div>
  )
}

function DemoNote({ light }: { light?: boolean }) {
  return (
    <div className={cx('mx-3 mb-3 rounded-xl p-3 text-xs', light ? 'bg-amber-50 text-amber-900' : 'bg-white/5 text-white/70')}>
      <b className={light ? '' : 'text-brand'}>Modo demonstração.</b> Dados de exemplo salvos só neste navegador.{' '}
      <button className="underline" onClick={() => confirm('Apagar tudo e voltar aos dados de exemplo?') && resetDemo()}>
        Restaurar exemplo
      </button>
    </div>
  )
}
