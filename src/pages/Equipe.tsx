import { useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { useStore } from '../lib/store'
import { divisao, extrato } from '../lib/calc'
import { money, monthLabel, sum } from '../lib/format'
import { Avatar, Card, Empty, Kpi, MonthPicker, PageHeader, cx } from '../components/ui'
import { Extrato } from '../components/Extrato'

export function Equipe() {
  const { data, config, mes, setMes } = useStore()
  const dono = config?.donoColaboradorId ?? null
  const [sel, setSel] = useState<string>('')

  const lista = useMemo(() => {
    const inM = (d: string) => !mes || d.startsWith(mes)
    return data.colaboradores
      .filter((c) => c.id !== dono)
      .map((c) => {
        const e = extrato(c.id, data.fretes, data.gastos, data.pagamentos, dono)
        const Fm = e.fretes.filter((f) => inM(f.data))
        return {
          c,
          e,
          nMes: Fm.length,
          ganhoMes: sum(Fm, (f) => divisao(f, dono).motorista),
          pagoMes: sum(e.pagamentos.filter((p) => inM(p.data)), (p) => p.valor),
        }
      })
      .filter((x) => x.c.ativo || Math.abs(x.e.saldo) > 0.009)
      .sort((a, b) => b.e.saldo - a.e.saldo)
  }, [data, dono, mes])

  if (!sel && lista[0]) setSel(lista[0].c.id)
  const atual = lista.find((x) => x.c.id === sel) ?? lista[0]

  return (
    <div className="space-y-4">
      <PageHeader title="Pagamento da equipe" subtitle="Ganho de cada colaborador acumulando frete a frete, com vales e pagamentos.">
        <MonthPicker value={mes} onChange={setMes} />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="col-span-2 md:col-span-1">
          <Kpi tone="dark" label="Total a pagar à equipe (geral)" value={money(sum(lista, (x) => Math.max(0, x.e.saldo)))} hint={`${lista.length} colaboradores`} />
        </div>
        <Kpi label={`Ganhos · ${monthLabel(mes)}`} value={money(sum(lista, (x) => x.ganhoMes))} hint={`${sum(lista, (x) => x.nMes)} fretes`} />
        <Kpi tone="green" label={`Pago · ${monthLabel(mes)}`} value={money(sum(lista, (x) => x.pagoMes))} />
      </div>

      {!lista.length ? (
        <Card>
          <Empty icon={<Users size={26} />} title="Nenhum colaborador">
            Cadastre os motoristas em Cadastros → Colaboradores.
          </Empty>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {lista.map((x) => {
              const on = atual?.c.id === x.c.id
              return (
                <button
                  key={x.c.id}
                  onClick={() => setSel(x.c.id)}
                  className={cx(
                    'flex min-w-[220px] items-center gap-3 rounded-2xl border p-3 text-left transition lg:min-w-0',
                    on ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink/40',
                  )}
                >
                  <Avatar nome={x.c.nome} brand={on} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{x.c.nome}</div>
                    <div className={cx('text-xs', on ? 'text-white/60' : 'text-muted')}>
                      {x.nMes} fretes · {money(x.ganhoMes)} no mês
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cx('text-[10px] font-semibold uppercase', on ? 'text-white/50' : 'text-muted')}>a pagar</div>
                    <div className={cx('num font-display text-lg font-bold', on && 'text-brand', x.e.saldo < 0 && 'text-red-500')}>{money(x.e.saldo)}</div>
                  </div>
                </button>
              )
            })}
          </div>
          {atual && <Extrato key={atual.c.id} colabId={atual.c.id} />}
        </div>
      )}
    </div>
  )
}
