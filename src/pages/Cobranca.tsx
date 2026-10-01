import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCheck, ChevronDown, FileText, HandCoins, MessageCircle, Search, Undo2 } from 'lucide-react'
import { errMsg, useStore } from '../lib/store'
import { dFull, dShort, money, monthLabel, normalize, sum, today, whatsappLink } from '../lib/format'
import type { Cliente, Frete } from '../lib/types'
import { Badge, Button, Card, Empty, Field, Input, Kpi, Modal, MonthPicker, PageHeader, Segmented, cx } from '../components/ui'

type Ordem = 'vencido' | 'valor' | 'nome'

export function Cobranca() {
  const { data, be, toast, nomeVeiculo, mes, setMes } = useStore()
  const [sel, setSel] = useState<Record<string, boolean>>({})
  const [aba, setAba] = useState<'aberto' | 'recebidos'>('aberto')
  const [ordem, setOrdem] = useState<Ordem>('vencido')
  const [q, setQ] = useState('')
  const [fechado, setFechado] = useState<Record<string, boolean>>({})
  const [nfModal, setNfModal] = useState<{ ids: string[] } | null>(null)
  const hoje = today()

  const grupos = useMemo(() => {
    const F = data.fretes.filter((f) => (aba === 'aberto' ? !f.pago : f.pago && (!mes || (f.recebidoEm ?? f.data).startsWith(mes))))
    const m = new Map<string, Frete[]>()
    F.forEach((f) => m.set(f.clienteId, [...(m.get(f.clienteId) ?? []), f]))
    const nq = normalize(q)
    return [...m.entries()]
      .map(([id, L]) => {
        const c = data.clientes.find((x) => x.id === id)
        return {
          id,
          c,
          nome: c?.nome ?? '—',
          L: L.sort((a, b) => a.data.localeCompare(b.data)),
          total: sum(L, (f) => f.valor),
          vencido: sum(L.filter((f) => f.vencimento && f.vencimento < hoje), (f) => f.valor),
        }
      })
      .filter((g) => !nq || normalize(`${g.nome} ${g.c?.codigo ?? ''}`).includes(nq))
      .sort((a, b) =>
        ordem === 'nome' ? a.nome.localeCompare(b.nome) : ordem === 'valor' ? b.total - a.total : b.vencido - a.vencido || b.total - a.total,
      )
  }, [data.fretes, data.clientes, aba, mes, q, ordem, hoje])

  const totalGeral = sum(grupos, (g) => g.total)
  const vencidoGeral = sum(grupos, (g) => g.vencido)

  async function receber(ids: string[], desfazer = false) {
    if (!ids.length) return
    try {
      await be.updateMany('fretes', ids, desfazer ? { pago: false, recebidoEm: null } : { pago: true, recebidoEm: today() })
      setSel((s) => {
        const n = { ...s }
        ids.forEach((i) => delete n[i])
        return n
      })
      toast(desfazer ? 'Voltou para a receber' : `${ids.length} frete(s) marcados como recebidos`)
    } catch (e) {
      toast(errMsg(e), 'erro')
    }
  }

  function cobrarWhats(c: Cliente | undefined, nome: string, L: Frete[]) {
    const linhas = L.map((f) => `• ${dShort(f.data)} — ${f.local || 'frete'} (${nomeVeiculo(f.veiculoId)})${f.nf ? ` NF ${f.nf}` : ''}: ${money(f.valor)}`)
    const txt = [
      `Olá, ${nome}! Segue o resumo dos fretes em aberto com a *RDCM Transportes e Guincho*:`,
      '',
      ...linhas,
      '',
      `*Total: ${money(sum(L, (f) => f.valor))}*`,
      '',
      'Qualquer dúvida estamos à disposição. Obrigado!',
    ].join('\n')
    window.open(whatsappLink(txt, c?.telefone), '_blank')
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Cobrança" subtitle="Fretes agrupados por cliente. Marque o que já recebeu.">
        <Segmented
          value={aba}
          onChange={setAba}
          options={[
            ['aberto', 'A receber'],
            ['recebidos', 'Recebidos'],
          ]}
        />
        {aba === 'recebidos' && <MonthPicker value={mes} onChange={setMes} />}
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="col-span-2 md:col-span-1">
          <Kpi
            tone="dark"
            icon={<HandCoins size={16} />}
            label={aba === 'aberto' ? 'Total a receber' : `Recebido · ${monthLabel(mes)}`}
            value={money(totalGeral)}
            hint={`${grupos.length} cliente(s) · ${sum(grupos, (g) => g.L.length)} frete(s)`}
          />
        </div>
        {aba === 'aberto' && (
          <>
            <Kpi tone="red" icon={<AlertTriangle size={14} />} label="Vencido" value={money(vencidoGeral)} />
            <Kpi label="A vencer" value={money(totalGeral - vencidoGeral)} />
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <Input className="h-10 bg-white pl-9" placeholder="Buscar cliente ou ID…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Segmented
          value={ordem}
          onChange={setOrdem}
          options={[
            ['vencido', 'Vencidos'],
            ['valor', 'Maior valor'],
            ['nome', 'A–Z'],
          ]}
        />
      </div>

      {!grupos.length && (
        <Card>
          <Empty icon={<CheckCheck size={26} />} title={aba === 'aberto' ? 'Nada a receber' : 'Nenhum recebimento'}>
            {aba === 'aberto' ? 'Todos os fretes foram recebidos.' : 'Nenhum frete recebido neste período.'}
          </Empty>
        </Card>
      )}

      {grupos.map((g) => {
        const ids = g.L.map((f) => f.id)
        const selIds = ids.filter((i) => sel[i])
        const all = selIds.length === ids.length
        const closed = fechado[g.id]
        return (
          <Card key={g.id} pad={false} className={cx(g.vencido > 0 && aba === 'aberto' && 'border-red-200')}>
            <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setFechado((s) => ({ ...s, [g.id]: !closed }))}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink font-display text-lg font-bold text-brand">
                {g.c?.codigo || g.nome.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg font-bold">{g.nome}</span>
                  {g.c?.codigo && <Badge>ID {g.c.codigo}</Badge>}
                  {g.vencido > 0 && aba === 'aberto' && <Badge tone="red">{money(g.vencido)} vencido</Badge>}
                </div>
                <div className="text-xs text-muted">
                  {g.L.length} frete(s) · de {dShort(g.L[0].data)} a {dShort(g.L[g.L.length - 1].data)}
                </div>
              </div>
              <div className="text-right">
                <div className={cx('num font-display text-xl font-bold', aba === 'aberto' ? 'text-red-700' : 'text-emerald-700')}>{money(g.total)}</div>
              </div>
              <ChevronDown size={18} className={cx('text-muted transition', !closed && 'rotate-180')} />
            </button>

            {!closed && (
              <>
                <div className="flex flex-wrap items-center gap-2 border-t border-line bg-paper/50 px-4 py-2">
                  {aba === 'aberto' ? (
                    <>
                      <label className="mr-1 flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-ink"
                          checked={all}
                          onChange={() => setSel((s) => ({ ...s, ...Object.fromEntries(ids.map((i) => [i, !all])) }))}
                        />
                        Todos
                      </label>
                      <Button size="sm" variant="success" disabled={!selIds.length} icon={<CheckCheck size={14} />} onClick={() => receber(selIds)}>
                        Receber selecionados{selIds.length ? ` (${money(sum(g.L.filter((f) => sel[f.id]), (f) => f.valor))})` : ''}
                      </Button>
                      <Button size="sm" variant="outline" disabled={!selIds.length} icon={<FileText size={14} />} onClick={() => setNfModal({ ids: selIds })}>
                        NF nos selecionados
                      </Button>
                      <div className="flex-1" />
                      <Button size="sm" variant="outline" icon={<MessageCircle size={14} />} onClick={() => cobrarWhats(g.c, g.nome, selIds.length ? g.L.filter((f) => sel[f.id]) : g.L)}>
                        Cobrar no WhatsApp
                      </Button>
                      <Button size="sm" variant="dark" onClick={() => confirm(`Marcar os ${ids.length} fretes de ${g.nome} (${money(g.total)}) como recebidos?`) && receber(ids)}>
                        Receber tudo
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted">Recebidos em {monthLabel(mes)}</span>
                  )}
                </div>
                <ul className="divide-y divide-line">
                  {g.L.map((f) => {
                    const venc = f.vencimento && f.vencimento < hoje && !f.pago
                    return (
                      <li key={f.id} className={cx('flex items-center gap-3 px-4 py-2.5', sel[f.id] && 'bg-brand/10')}>
                        {aba === 'aberto' && (
                          <input type="checkbox" aria-label={`Selecionar frete de ${dShort(f.data)}`} className="h-5 w-5 shrink-0 accent-ink" checked={!!sel[f.id]} onChange={(e) => setSel((s) => ({ ...s, [f.id]: e.target.checked }))} />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 text-sm">
                            <b>{dShort(f.data)}</b>
                            <span className="truncate text-muted">
                              {f.local || '—'} · {nomeVeiculo(f.veiculoId)}
                            </span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                            <button onClick={() => setNfModal({ ids: [f.id] })} className="rounded-md border border-dashed border-line px-1.5 py-0.5 font-medium hover:border-ink">
                              {f.nf ? `NF ${f.nf}` : '+ NF'}
                            </button>
                            {f.vencimento && <span className={cx(venc ? 'font-semibold text-red-700' : 'text-muted')}>vence {dFull(f.vencimento)}</span>}
                            {f.pago && f.recebidoEm && <span className="text-emerald-700">recebido {dFull(f.recebidoEm)}</span>}
                          </div>
                        </div>
                        <b className="num">{money(f.valor)}</b>
                        {aba === 'aberto' ? (
                          <Button size="sm" variant="outline" onClick={() => receber([f.id])}>
                            Recebi
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" icon={<Undo2 size={14} />} onClick={() => receber([f.id], true)}>
                            Desfazer
                          </Button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </Card>
        )
      })}

      <NfModal ids={nfModal?.ids ?? null} onClose={() => setNfModal(null)} />
    </div>
  )
}

function NfModal({ ids, onClose }: { ids: string[] | null; onClose: () => void }) {
  const { be, data, toast } = useStore()
  const first = ids && data.fretes.find((f) => f.id === ids[0])
  const [nf, setNf] = useState('')
  const [venc, setVenc] = useState('')
  const [key, setKey] = useState('')
  const k = ids?.join(',') ?? ''
  if (k !== key) {
    setKey(k)
    setNf(first?.nf ?? '')
    setVenc(first?.vencimento ?? '')
  }
  async function save() {
    if (!ids) return
    try {
      await be.updateMany('fretes', ids, { nf: nf.trim(), vencimento: venc || null })
      toast('NF salva')
      onClose()
    } catch (e) {
      toast(errMsg(e), 'erro')
    }
  }
  return (
    <Modal
      open={!!ids}
      onClose={onClose}
      title={ids && ids.length > 1 ? `NF para ${ids.length} fretes` : 'Nota fiscal'}
      footer={<Button onClick={save}>Salvar</Button>}
    >
      <div className="grid gap-3">
        <Field label="Número da NF">
          <Input autoFocus value={nf} onChange={(e) => setNf(e.target.value)} placeholder="Ex.: 1493" />
        </Field>
        <Field label="Vencimento">
          <Input type="date" value={venc} onChange={(e) => setVenc(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
