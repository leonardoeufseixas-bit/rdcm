import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Banknote, Fuel, MessageCircle, Trash2, Truck, Wallet } from 'lucide-react'
import { errMsg, useStore } from '../lib/store'
import { divisao, extrato, pctMotoristaTotal } from '../lib/calc'
import { dFull, dShort, money, monthLabel, round2, sum, today, whatsappLink } from '../lib/format'
import type { TipoPagamento } from '../lib/types'
import { Avatar, Badge, Button, Card, Field, Input, Kpi, Modal, MoneyInput, Segmented, cx } from './ui'

type Linha = {
  id: string
  data: string
  tipo: 'frete' | 'reembolso' | 'pagamento' | 'vale'
  titulo: string
  sub: string
  credito: number
  debito: number
  pendenteCliente?: boolean
}

export function Extrato({ colabId, readOnly }: { colabId: string; readOnly?: boolean }) {
  const { data, config, mes, colab, nomeCliente, nomeVeiculo, be, toast } = useStore()
  const dono = config?.donoColaboradorId ?? null
  const c = colab(colabId)
  const [pagModal, setPagModal] = useState<TipoPagamento | null>(null)

  const geral = useMemo(() => extrato(colabId, data.fretes, data.gastos, data.pagamentos, dono), [colabId, data, dono])

  const linhas = useMemo<Linha[]>(() => {
    const L: Linha[] = []
    geral.fretes.forEach((f) => {
      const d = divisao(f, dono)
      L.push({
        id: f.id, data: f.data, tipo: 'frete',
        titulo: `${nomeCliente(f.clienteId)}${f.local ? ' · ' + f.local : ''}`,
        sub: `${nomeVeiculo(f.veiculoId)} · frete ${money(f.valor)} → ${f.pctComissao}% ${money(d.comissao)} + metade ${money(d.metadeMotorista)}`,
        credito: d.motorista, debito: 0, pendenteCliente: !f.pago,
      })
    })
    geral.gastosReembolso.forEach((g) =>
      L.push({ id: g.id, data: g.data, tipo: 'reembolso', titulo: `Reembolso: ${g.descricao}`, sub: g.categoria, credito: g.valor, debito: 0 }),
    )
    geral.pagamentos.forEach((p) =>
      L.push({ id: p.id, data: p.data, tipo: p.tipo, titulo: p.tipo === 'vale' ? 'Vale / adiantamento' : 'Pagamento', sub: p.obs, credito: 0, debito: p.valor }),
    )
    return L.sort((a, b) => a.data.localeCompare(b.data) || (a.debito ? 1 : -1))
  }, [geral, dono, nomeCliente, nomeVeiculo])

  const inMes = (d: string) => !mes || d.startsWith(mes)
  const anteriores = mes ? linhas.filter((l) => l.data < mes + '-01') : []
  const saldoAnterior = round2(sum(anteriores, (l) => l.credito - l.debito))
  const doMes = linhas.filter((l) => inMes(l.data))
  let acc = saldoAnterior
  const comSaldo = doMes.map((l) => ({ ...l, saldo: (acc = round2(acc + l.credito - l.debito)) }))

  const fretesMes = doMes.filter((l) => l.tipo === 'frete')
  const ganhoMes = sum(fretesMes, (l) => l.credito)
  const freteMes = sum(geral.fretes.filter((f) => inMes(f.data)), (f) => f.valor)
  const pagoMes = sum(doMes.filter((l) => l.tipo === 'pagamento'), (l) => l.debito)
  const valeMes = sum(doMes.filter((l) => l.tipo === 'vale'), (l) => l.debito)
  const reembMes = sum(doMes.filter((l) => l.tipo === 'reembolso'), (l) => l.credito)

  async function delPag(id: string) {
    if (!confirm('Excluir este lançamento?')) return
    try {
      await be.remove('pagamentos', id)
      toast('Lançamento excluído')
    } catch (e) {
      toast(errMsg(e), 'erro')
    }
  }

  function enviarExtrato() {
    const txt = [
      `*Extrato ${c?.nome} — RDCM* (${monthLabel(mes)})`,
      '',
      ...(mes ? [`Saldo anterior: ${money(saldoAnterior)}`] : []),
      ...comSaldo.map((l) => `${dShort(l.data)} ${l.titulo}: ${l.credito ? '+' + money(l.credito) : '−' + money(l.debito)}`),
      '',
      `Fretes no período: ${fretesMes.length} · ganho ${money(ganhoMes)}`,
      `*Saldo a receber: ${money(geral.saldo)}*`,
    ].join('\n')
    window.open(whatsappLink(txt, c?.telefone), '_blank')
  }

  if (!c) return null
  const pctTot = config ? pctMotoristaTotal(config) : 55

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl bg-ink text-white">
        <div className="flex flex-wrap items-center gap-4 p-5">
          <Avatar nome={c.nome} brand className="h-14 w-14 text-xl" />
          <div className="min-w-0 flex-1">
            <div className="font-display text-2xl font-bold">{c.nome}</div>
            <div className="text-sm text-white/60">
              {c.funcao || 'Colaborador'} · recebe {pctTot}% do frete
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/60">{readOnly ? 'Você tem a receber' : 'Saldo a pagar (geral)'}</div>
            <div className={cx('num font-display text-4xl font-bold', geral.saldo < 0 ? 'text-red-300' : 'text-brand')}>{money(geral.saldo)}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-white/10 px-5 py-3">
          {!readOnly && (
            <>
              <Button size="sm" icon={<Banknote size={15} />} onClick={() => setPagModal('pagamento')}>
                Registrar pagamento
              </Button>
              <Button size="sm" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10" onClick={() => setPagModal('vale')}>
                Dar vale / adiantamento
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10" icon={<MessageCircle size={15} />} onClick={enviarExtrato}>
            {readOnly ? 'Compartilhar extrato' : 'Enviar extrato no WhatsApp'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={<Truck size={14} />} label={`Fretes · ${monthLabel(mes)}`} value={fretesMes.length} hint={`Frete total ${money(freteMes)}`} />
        <Kpi tone="brand" icon={<Wallet size={14} />} label="Ganho no período" value={money(ganhoMes)} hint={reembMes ? `+ ${money(reembMes)} reembolso` : undefined} />
        <Kpi tone="green" label="Pago no período" value={money(pagoMes + valeMes)} hint={valeMes ? `${money(valeMes)} em vales` : undefined} />
        <Kpi
          label="Cliente ainda não pagou"
          value={money(geral.ganhoAguardando)}
          hint="parte do seu ganho em fretes a receber"
        />
      </div>

      <Card title="Extrato acumulado" action={<span className="text-xs text-muted">{monthLabel(mes)}</span>} pad={false}>
        <ul className="divide-y divide-line">
          {mes && (
            <li className="flex items-center justify-between bg-paper/60 px-4 py-2.5 text-sm">
              <span className="font-medium text-muted">Saldo anterior a {monthLabel(mes)}</span>
              <b className="num">{money(saldoAnterior)}</b>
            </li>
          )}
          {comSaldo.map((l) => (
            <li key={l.tipo + l.id} className="flex items-start gap-3 px-4 py-3">
              <div
                className={cx(
                  'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                  l.tipo === 'frete' && 'bg-ink text-brand',
                  l.tipo === 'reembolso' && 'bg-sky-50 text-sky-700',
                  (l.tipo === 'pagamento' || l.tipo === 'vale') && 'bg-emerald-50 text-emerald-700',
                )}
              >
                {l.tipo === 'frete' ? <ArrowDownLeft size={17} /> : l.tipo === 'reembolso' ? <Fuel size={16} /> : <ArrowUpRight size={17} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <b>{dShort(l.data)}</b>
                  <span className="font-semibold">{l.titulo}</span>
                  {l.pendenteCliente && <Badge tone="amber">cliente não pagou</Badge>}
                  {l.tipo === 'vale' && <Badge tone="blue">vale</Badge>}
                </div>
                {l.sub && <div className="mt-0.5 text-xs text-muted">{l.sub}</div>}
              </div>
              <div className="text-right">
                <div className={cx('num font-semibold', l.credito ? 'text-ink' : 'text-emerald-700')}>{l.credito ? `+ ${money(l.credito)}` : `− ${money(l.debito)}`}</div>
                <div className="num text-xs text-muted">saldo {money(l.saldo)}</div>
              </div>
              {!readOnly && (l.tipo === 'pagamento' || l.tipo === 'vale') && (
                <button className="-mr-1 rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-700" aria-label="Excluir" onClick={() => delPag(l.id)}>
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          ))}
          {!comSaldo.length && <li className="px-4 py-8 text-center text-sm text-muted">Nenhum lançamento neste período.</li>}
          <li className="flex items-center justify-between bg-ink/[.03] px-4 py-3">
            <span className="font-display text-lg font-bold">Saldo {mes ? `ao fim de ${monthLabel(mes)}` : 'atual'}</span>
            <b className="num font-display text-xl">{money(acc)}</b>
          </li>
        </ul>
      </Card>

      <div className="grid gap-3 text-sm sm:grid-cols-4">
        <Resumo label="Ganho total em fretes" v={geral.ganhoFretes} />
        <Resumo label="Reembolsos de gastos" v={geral.reembolsos} />
        <Resumo label="Pagamentos" v={-geral.pago} />
        <Resumo label="Vales / adiantamentos" v={-geral.vales} />
      </div>

      {!readOnly && <PagamentoModal tipo={pagModal} colabId={colabId} sugestao={Math.max(0, geral.saldo)} onClose={() => setPagModal(null)} />}
    </div>
  )
}

function Resumo({ label, v: raw }: { label: string; v: number }) {
  const v = raw || 0
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2">
      <div className="text-xs text-muted">{label} (geral)</div>
      <div className={cx('num font-semibold', v < 0 && 'text-emerald-700')}>{v < 0 ? `− ${money(-v)}` : money(v)}</div>
    </div>
  )
}

function PagamentoModal({ tipo, colabId, sugestao, onClose }: { tipo: TipoPagamento | null; colabId: string; sugestao: number; onClose: () => void }) {
  const { be, toast, nomeColab } = useStore()
  const [t, setT] = useState<TipoPagamento>('pagamento')
  const [dataP, setDataP] = useState(today())
  const [valor, setValor] = useState('')
  const [obs, setObs] = useState('')
  const [last, setLast] = useState<TipoPagamento | null>(null)
  if (tipo !== last) {
    setLast(tipo)
    if (tipo) {
      setT(tipo)
      setDataP(today())
      setValor(tipo === 'pagamento' && sugestao ? sugestao.toFixed(2) : '')
      setObs('')
    }
  }
  async function save() {
    const v = round2(parseFloat(valor.replace(',', '.')) || 0)
    if (!v) return toast('Informe o valor', 'erro')
    try {
      await be.add('pagamentos', { data: dataP, colaboradorId: colabId, valor: v, tipo: t, obs: obs.trim(), criadoEm: new Date().toISOString() })
      toast(`${t === 'vale' ? 'Vale' : 'Pagamento'} de ${money(v)} registrado`)
      onClose()
    } catch (e) {
      toast(errMsg(e), 'erro')
    }
  }
  return (
    <Modal open={!!tipo} onClose={onClose} title={`Pagar ${nomeColab(colabId)}`} footer={<Button onClick={save}>Registrar</Button>}>
      <div className="grid gap-3">
        <Segmented
          value={t}
          onChange={setT}
          options={[
            ['pagamento', 'Pagamento / acerto'],
            ['vale', 'Vale / adiantamento'],
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <Input type="date" value={dataP} onChange={(e) => setDataP(e.target.value)} />
          </Field>
          <Field label="Valor" hint={sugestao ? `Saldo atual: ${money(sugestao)}` : undefined}>
            <MoneyInput autoFocus value={valor} onChange={(e) => setValor(e.target.value)} />
          </Field>
        </div>
        <Field label="Observação">
          <Input placeholder="Ex.: Pix, acerto de setembro" value={obs} onChange={(e) => setObs(e.target.value)} />
        </Field>
        <p className="text-xs text-muted">Registrado em {dFull(dataP)}. O valor é descontado do saldo acumulado.</p>
      </div>
    </Modal>
  )
}
