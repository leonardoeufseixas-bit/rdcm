import { Clock, LogOut } from 'lucide-react'
import { useStore } from '../lib/store'
import { Button } from '../components/ui'
import { Logo } from '../components/Logo'

export function Pendente() {
  const { perfil, be } = useStore()
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-ink px-6 text-center text-white">
      <Logo big />
      <div className="max-w-sm rounded-3xl bg-white/5 p-6">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-ink">
          <Clock size={28} />
        </div>
        <h1 className="font-display text-2xl font-bold">Aguardando liberação</h1>
        <p className="mt-2 text-sm text-white/70">
          Olá, {perfil?.nome}. Sua conta ({perfil?.email}) foi criada. Peça ao Rafael para liberar seu acesso em <b>Cadastros → Acessos</b>. Esta tela atualiza sozinha.
        </p>
      </div>
      <Button variant="outline" icon={<LogOut size={16} />} onClick={() => be.signOut()}>
        Sair
      </Button>
    </div>
  )
}
