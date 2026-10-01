import { useState } from 'react'
import { KeyRound, LogIn, UserPlus } from 'lucide-react'
import { errMsg, useStore } from '../lib/store'
import { Button, Field, Input, Segmented } from '../components/ui'
import { Logo } from '../components/Logo'

export function Login() {
  const { be } = useStore()
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setInfo('')
    setBusy(true)
    try {
      if (modo === 'entrar') await be.signIn(email.trim(), senha)
      else await be.signUp(nome.trim(), email.trim(), senha)
    } catch (e) {
      setErro(errMsg(e))
    } finally {
      setBusy(false)
    }
  }

  async function reset() {
    if (!email.trim()) return setErro('Digite seu e-mail acima para receber o link.')
    try {
      await be.resetPassword(email.trim())
      setInfo('Enviamos um link para redefinir a senha no seu e-mail.')
    } catch (e) {
      setErro(errMsg(e))
    }
  }

  const demoLogin = async (e: string) => {
    setBusy(true)
    await be.signIn(e, '').catch((x) => setErro(errMsg(x)))
    setBusy(false)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ink md:flex-row">
      <div className="relative flex flex-col justify-between overflow-hidden px-6 pt-12 pb-8 text-white md:w-1/2 md:p-12">
        <Logo big />
        <div className="mt-10 hidden md:block">
          <h1 className="font-display text-5xl leading-[1.05] font-bold">
            Fretes, cobrança e equipe
            <br />
            <span className="text-brand">num lugar só.</span>
          </h1>
          <p className="mt-4 max-w-md text-white/60">
            Lance o frete uma vez e ele já aparece na cobrança do cliente, no pagamento do motorista e no resultado do mês. Sem copiar de caderno em caderno.
          </p>
        </div>
        <div className="hazard absolute inset-x-0 bottom-0 h-2 md:hidden" />
      </div>

      <div className="flex flex-1 items-start justify-center bg-paper px-5 py-8 md:items-center md:rounded-l-[2.5rem]">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div>
            <h2 className="font-display text-3xl font-bold">{modo === 'entrar' ? 'Entrar' : 'Criar conta'}</h2>
            <p className="mt-1 text-sm text-muted">
              {modo === 'entrar' ? 'Use o e-mail e a senha cadastrados.' : 'Depois de criar, o Rafael libera o seu acesso.'}
            </p>
          </div>
          <Segmented
            value={modo}
            onChange={(m) => {
              setModo(m)
              setErro('')
            }}
            options={[
              ['entrar', 'Entrar'],
              ['criar', 'Criar conta'],
            ]}
          />
          {modo === 'criar' && (
            <Field label="Seu nome">
              <Input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: João" autoComplete="name" />
            </Field>
          )}
          <Field label="E-mail">
            <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
          </Field>
          <Field label="Senha">
            <Input
              required={!be.demo}
              type="password"
              minLength={be.demo ? 0 : 6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            />
          </Field>
          {erro && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
          {info && <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</div>}
          <Button size="lg" className="w-full" disabled={busy} icon={modo === 'entrar' ? <LogIn size={18} /> : <UserPlus size={18} />}>
            {busy ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </Button>
          {modo === 'entrar' && !be.demo && (
            <button type="button" onClick={reset} className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
              <KeyRound size={14} /> Esqueci minha senha
            </button>
          )}

          {be.demo && (
            <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4">
              <div className="text-sm font-bold text-amber-900">Modo demonstração</div>
              <p className="mt-1 text-xs text-amber-900/80">Dados de exemplo dos cadernos. Entre como:</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button type="button" variant="dark" size="sm" onClick={() => demoLogin('rafael@rdcm.demo')}>
                  Rafael (dono)
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => demoLogin('joao@rdcm.demo')}>
                  João (motorista)
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
