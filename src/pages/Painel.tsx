import { useMemo } from 'react'
import { AlertTriangle, ArrowRight, Fuel, HandCoins, Printer, TrendingUp, Truck, Users } from 'lucide-react'
import { useStore } from '../lib/store'
import { divisao, extrato } from '../lib/calc'
import { dShort, money, monthLabel, round2, sum, today } from '../lib/format'
import { Avatar, Badge, Bar, Button, Card, Kpi, MonthPicker, PageHeader } from '../components/ui'

const go = (k: string) => (location.hash = '/' + k)

export function Painel() {
  const { data, config, mes, setMes, nomeCliente, nomeVeiculo, cliente } = useStore()
  const dono = config?.donoColaboradorId ?? null
  const inM = (d: string) => !mes || d.startsWith(mes)

  const r = useMemo(() => {
    const F = data.fretes.filter((f) => inM(f.data))
    const G = data.gastos.filter((g) => inM(g.data))
    const div = F.map((f) => ({ f, ...divisao(f, dono) }))
    const total = sum(F, (f) => f.valor)
    const recebido = sum(F.filter((f) => f.pago), (f) => f.valor)
    const equipe = sum(div, (x) => x.motorista)
    const parteDono = sum(div, (x) => x.dono)
    const gastos = sum(G, (g) => g.valor)
    const resultado = round2(parteDono - gastos)

    const abertos = data.fretes.filter((f) => !f.pago)
    const hoje = today()
    const porCliAberto = new Map<string, { total: number; n: number; vencido: number; maisAntigo: string }>()
    abertos.forEach((f) => {
      const x = porCliAberto.get(f.clienteId) ?? { total: 0, n: 0, vencido: 0, maisAntigo: f.data }
      x.total += f.valor
      x.n++
      if (f.vencimento && f.vencimento < hoje) x.vencido += f.valor
      if (f.data < x.maisAntigo) x.maisAntigo = f.data
      porCliAberto.set(f.clienteId, x)
    })

    const porCli = new Map<string, number>()
    F.forEach((f) => porCli.set(f.clienteId, (porCli.get(f.clienteId) ?? 0) + f.valor))

    const porVeic = new Map<string, { frete: number; gasto: number; n: number }>()
    F.forEach((f) => {
      const x = porVeic.get(f.veiculoId) ?? { frete: 0, gasto: 0, n: 0 }
      x.frete += f.valor
      x.n++
      porVeic.set(f.veiculoId, x)
    })
    G.forEach((g) => {
      if (!g.veiculoId) return
      const x = porVeic.get(g.veiculoId) ?? { frete: 0, gasto: 0, n: 0 }
      x.gasto += g.valor
      porVeic.set(g.veiculoId, x)
    })

    const saldos = data.colaboradores
      .filter((c) => c.id !== dono)
      .map((c) => ({ c, e: extrato(c.id, data.fretes, data.gastos, data.pagamentos, dono) }))
      .filter((x) => Math.abs(x.e.saldo) > 0.009)
      .sort((a, b) => b.e.saldo - a.e.saldo)

    return {
      F, total, recebido, aReceberMes: total - recebido, equipe, parteDono, gastos, resultado,
      aReceberGeral: sum(abertos, (f) => f.valor),
      vencidoGeral: sum([...porCliAberto.values()], (x) => x.vencido),
      porCliAberto: [...porCliAberto.entries()].sort((a, b) => b[1].vencido - a[1].vencido || b[1].total - a[1].total),
      porCli: [...porCli.entries()].sort((a, b) => b[1] - a[1]),
      porVeic: [...porVeic.entries()].sort((a, b) => b[1].frete - a[1].frete),
      saldos,
      guincho: F.filter((f) => f.servico === 'guincho').length,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, mes, dono])

  const maxCli = r.porCli[0]?.[1] || 1
  const maxVeic = Math.max(1, ...r.porVeic.map(([, v]) => v.frete))
  const parts = [
    { k: 'Equipe', v: r.equipe, c: 'bg-sky-500' },
    { k: 'Gastos', v: r.gastos, c: 'bg-red-500' },
    { k: 'Resultado Rafael', v: Math.max(0, r.resultado), c: 'bg-brand' },
  ]
  const partsTot = Math.max(1, sum(parts, (p) => p.v))

  return (
    <div className="space-y-4">
      <PageHeader title="Visão geral" subtitle={`${monthLabel(mes)} · ${r.F.length} serviços${r.guincho ? ` (${r.guincho} de guincho)` : ''}`}>
        <MonthPicker value={mes} onChange={setMes} />
        <Button variant="outline" className="hidden md:inline-flex" icon={<Printer size={16} />} onClick={() => print()}>
          Imprimir
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <div className="col-span-2 xl:col-span-1">
          <Kpi
            tone="dark"
            icon={<TrendingUp size={16} />}
            label="Resultado do Rafael"
            value={money(r.resultado)}
            hint={`Parte dele ${money(r.parteDono)} − gastos ${money(r.gastos)}`}
          />
        </div>
        <Kpi label="Faturamento" value={money(r.total)} hint={`${r.F.length} serviços`} />
        <Kpi tone="green" label="Recebido" value={money(r.recebido)} hint={r.total ? `${Math.round((r.recebido / r.total) * 100)}% do período` : undefined} />
        <Kpi tone="red" label="A receber" value={money(r.aReceberMes)} hint="fretes do período" />
        <Kpi label="Equipe (motoristas)" value={money(r.equipe)} hint={`Gastos ${money(r.gastos)}`} />
      </div>

      <Card title="Para onde vai o faturamento">
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-paper">
          {parts.map((p) => (
            <div key={p.k} className={p.c} style={{ width: `${(p.v / partsTot) * 100}%` }} title={`${p.k}: ${money(p.v)}`} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          {parts.map((p) => (
            <div key={p.k} className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-sm ${p.c}`} />
              <span className="text-muted">{p.k}</span>
              <b className="num ml-auto sm:ml-1">{money(p.v)}</b>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          Regra: {config?.pctComissao}% do frete vai para o motorista e o restante é dividido {config?.pctDono}/{100 - (config?.pctDono ?? 50)} entre Rafael e o motorista. Quando o Rafael dirige, o frete inteiro é dele.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title={
            <span className="flex items-center gap-2">
              <HandCoins size={18} /> A receber dos clientes
            </span>
          }
          action={
            <Button size="sm" variant="ghost" onClick={() => go('cobranca')}>
              Cobrança <ArrowRight size={14} />
            </Button>
          }
          pad={false}
        >
          <div className="flex items-baseline gap-3 px-4 pt-4">
            <span className="num font-display text-3xl font-bold text-red-700">{money(r.aReceberGeral)}</span>
            {r.vencidoGeral > 0 && (
              <Badge tone="red">
                <AlertTriangle size={12} /> {money(r.vencidoGeral)} vencido
              </Badge>
            )}
          </div>
          <ul className="divide-y divide-line px-4 pb-2">
            {r.porCliAberto.slice(0, 6).map(([id, x]) => (
              <li key={id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">
                    {nomeCliente(id)} {cliente(id)?.codigo && <span className="text-xs text-muted">ID {cliente(id)?.codigo}</span>}
                  </div>
                  <div className="text-xs text-muted">
                    {x.n} frete(s) em aberto · desde {dShort(x.maisAntigo)}
                  </div>
                </div>
                {x.vencido > 0 && <Badge tone="red">vencido</Badge>}
                <b className="num">{money(x.total)}</b>
              </li>
            ))}
            {!r.porCliAberto.length && <li className="py-6 text-center text-sm text-muted">Tudo recebido.</li>}
          </ul>
        </Card>

        <Card
          title={
            <span className="flex items-center gap-2">
              <Users size={18} /> Saldo a pagar da equipe
            </span>
          }
          action={
            <Button size="sm" variant="ghost" onClick={() => go('equipe')}>
              Equipe <ArrowRight size={14} />
            </Button>
          }
          pad={false}
        >
          <div className="px-4 pt-4">
            <span className="num font-display text-3xl font-bold">{money(sum(r.saldos, (x) => Math.max(0, x.e.saldo)))}</span>
            <span className="ml-2 text-xs text-muted">acumulado, todos os meses</span>
          </div>
          <ul className="divide-y divide-line px-4 pb-2">
            {r.saldos.map(({ c, e }) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <Avatar nome={c.nome} className="h-8 w-8 text-xs" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{c.nome}</div>
                  <div className="text-xs text-muted">{e.fretes.length} fretes · ganhou {money(e.ganhoFretes)}</div>
                </div>
                <b className={`num ${e.saldo < 0 ? 'text-red-700' : ''}`}>{money(e.saldo)}</b>
              </li>
            ))}
            {!r.saldos.length && <li className="py-6 text-center text-sm text-muted">Ninguém com saldo pendente.</li>}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Faturamento por cliente">
          <ul className="space-y-3">
            {r.porCli.map(([id, v]) => (
              <li key={id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{nomeCliente(id)}</span>
                  <b className="num">{money(v)}</b>
                </div>
                <Bar pct={(v / maxCli) * 100} />
              </li>
            ))}
            {!r.porCli.length && <li className="text-sm text-muted">Sem fretes no período.</li>}
          </ul>
        </Card>
        <Card
          title={
            <span className="flex items-center gap-2">
              <Truck size={18} /> Por veículo
            </span>
          }
        >
          <ul className="space-y-3">
            {r.porVeic.map(([id, v]) => (
              <li key={id}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {nomeVeiculo(id)} <span className="text-xs text-muted">· {v.n} serv.</span>
                  </span>
                  <span className="num text-right">
                    <b>{money(v.frete)}</b>
                    {v.gasto > 0 && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-700">
                        <Fuel size={11} />−{money(v.gasto)}
                      </span>
                    )}
                  </span>
                </div>
                <Bar pct={(v.frete / maxVeic) * 100} className="bg-ink" />
              </li>
            ))}
            {!r.porVeic.length && <li className="text-sm text-muted">Sem fretes no período.</li>}
          </ul>
        </Card>
      </div>
    </div>
  )
}
