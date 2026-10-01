import { useMemo, useState } from 'react'
import { Check, Download, FileText, MoreVertical, Pencil, Plus, Search, Trash2, Truck, Undo2, Wrench } from 'lucide-react'
import { errMsg, useStore } from '../lib/store'
import { divisao } from '../lib/calc'
import { dFull, money, monthLabel, normalize, sum, today } from '../lib/format'
import type { Frete } from '../lib/types'
import { Badge, Button, Card, Empty, Input, Kpi, MonthPicker, PageHeader, Select, cx } from '../components/ui'
import { useFreteModal } from '../components/FreteModal'

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export function Fretes() {
  const { data, config, isAdmin, mes, setMes, nomeCliente, nomeVeiculo, nomeColab, cliente, be, toast } = useStore()
  const openFrete = useFreteModal()
  const dono = config?.donoColaboradorId ?? null
  const [q, setQ] = useState('')
  const [fCli, setFCli] = useState('')
  const [fMot, setFMot] = useState('')
  const [fVei, setFVei] = useState('')
  const [fSt, setFSt] = useState<'' | 'aberto' | 'pago'>('')
  const [menu, setMenu] = useState<string | null>(null)

  const F = useMemo(() => {
    const nq = normalize(q)
    return data.fretes
      .filter(
        (f) =>
          (!mes || f.data.startsWith(mes)) &&
          (!fCli || f.clienteId === fCli) &&
          (!fMot || f.motoristaId === fMot) &&
          (!fVei || f.veiculoId === fVei) &&
          (!fSt || (fSt === 'pago') === f.pago) &&
          (!nq || normalize(`${nomeCliente(f.clienteId)} ${f.local} ${f.nf} ${f.obs} ${nomeVeiculo(f.veiculoId)} ${nomeColab(f.motoristaId)}`).includes(nq)),
      )
      .sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.fretes, mes, q, fCli, fMot, fVei, fSt])

  const dias = useMemo(() => {
    const m = new Map<string, Frete[]>()
    F.forEach((f) => m.set(f.data, [...(m.get(f.data) ?? []), f]))
    return [...m.entries()]
  }, [F])

  const tot = sum(F, (f) => f.valor)
  const mot = sum(F, (f) => divisao(f, dono).motorista)
  const raf = sum(F, (f) => divisao(f, dono).dono)

  async function togglePago(f: Frete) {
    try {
      await be.update('fretes', f.id, { pago: !f.pago, recebidoEm: f.pago ? null : today() })
      toast(f.pago ? 'Marcado como a receber' : 'Marcado como recebido')
    } catch (e) {
      toast(errMsg(e), 'erro')
    }
  }
  async function del(f: Frete) {
    if (!confirm(`Excluir o frete de ${money(f.valor)} (${nomeCliente(f.clienteId)}, ${dFull(f.data)})?`)) return
    try {
      await be.remove('fretes', f.id)
      toast('Frete excluído')
    } catch (e) {
      toast(errMsg(e), 'erro')
    }
  }

  function exportCsv() {
    const head = ['Data', 'Serviço', 'Cliente', 'ID cliente', 'Local', 'Veículo', 'Motorista', 'Valor', 'Motorista recebe', 'Rafael', 'Status', 'Recebido em', 'NF', 'Vencimento', 'Obs']
    const rows = F.map((f) => {
      const d = divisao(f, dono)
      return [f.data, f.servico, nomeCliente(f.clienteId), cliente(f.clienteId)?.codigo ?? '', f.local, nomeVeiculo(f.veiculoId), nomeColab(f.motoristaId),
        f.valor, d.motorista, d.dono, f.pago ? 'Recebido' : 'A receber', f.recebidoEm ?? '', f.nf, f.vencimento ?? '', f.obs]
    })
    const csv = [head, ...rows]
      .map((r) => r.map((c) => (typeof c === 'number' ? c.toFixed(2).replace('.', ',') : `"${String(c ?? '').replace(/"/g, '""')}"`)).join(';'))
      .join('\r\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `fretes-${mes || 'tudo'}.csv`
    a.click()
  }

  const ativos = <T extends { ativo: boolean }>(a: T[]) => a.filter((x) => x.ativo)
  const filtros = [fCli, fMot, fVei, fSt, q].filter(Boolean).length

  return (
    <div className="space-y-4">
      <PageHeader title={isAdmin ? 'Fretes' : 'Meus fretes'} subtitle={monthLabel(mes)}>
        <MonthPicker value={mes} onChange={setMes} />
        {isAdmin && (
          <Button variant="outline" icon={<Download size={16} />} onClick={exportCsv} className="hidden sm:inline-flex">
            Planilha
          </Button>
        )}
        <Button icon={<Plus size={18} />} onClick={() => openFrete()} className="hidden md:inline-flex">
          Lançar frete
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Serviços" value={F.length} hint={`${F.filter((f) => !f.pago).length} a receber`} />
        <Kpi label="Valor total" value={money(tot)} />
        <Kpi label={isAdmin ? 'Motoristas recebem' : 'Meu ganho'} value={money(mot)} tone={isAdmin ? 'default' : 'brand'} />
        {isAdmin ? <Kpi label="Parte do Rafael" value={money(raf)} tone="dark" /> : <Kpi label="Recebido do cliente" value={money(sum(F.filter((f) => f.pago), (f) => f.valor))} tone="green" />}
      </div>

      <Card pad={false}>
        <div className="flex flex-wrap gap-2 p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <Input className="h-10 pl-9" placeholder="Buscar cliente, local, NF…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {isAdmin && (
            <>
              <Select className="h-10 w-auto min-w-[140px]" value={fCli} onChange={(e) => setFCli(e.target.value)}>
                <option value="">Todos clientes</option>
                {data.clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </Select>
              <Select className="h-10 w-auto min-w-[140px]" value={fMot} onChange={(e) => setFMot(e.target.value)}>
                <option value="">Todos motoristas</option>
                {ativos(data.colaboradores).map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </Select>
            </>
          )}
          <Select className="h-10 w-auto min-w-[130px]" value={fVei} onChange={(e) => setFVei(e.target.value)}>
            <option value="">Todos veículos</option>
            {data.veiculos.map((v) => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
          </Select>
          <Select className="h-10 w-auto" value={fSt} onChange={(e) => setFSt(e.target.value as typeof fSt)}>
            <option value="">Todos status</option>
            <option value="aberto">A receber</option>
            <option value="pago">Recebidos</option>
          </Select>
          {filtros > 0 && (
            <Button size="md" variant="ghost" onClick={() => { setQ(''); setFCli(''); setFMot(''); setFVei(''); setFSt('') }}>
              Limpar
            </Button>
          )}
        </div>
      </Card>

      {!F.length ? (
        <Card>
          <Empty icon={<Truck size={26} />} title="Nenhum frete aqui">
            {filtros ? 'Nenhum frete com esses filtros.' : 'Toque em “Lançar frete” para registrar o primeiro do período.'}
          </Empty>
        </Card>
      ) : (
        <div className="space-y-4">
          {dias.map(([dia, L]) => (
            <div key={dia}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <div className="font-display text-lg font-bold">
                  {dFull(dia)} <span className="text-sm font-medium text-muted capitalize">· {DIAS[new Date(dia + 'T12:00:00').getDay()]}</span>
                </div>
                <div className="num text-sm font-semibold text-muted">{money(sum(L, (f) => f.valor))}</div>
              </div>
              <Card pad={false}>
                <ul className="divide-y divide-line">
                  {L.map((f) => {
                    const d = divisao(f, dono)
                    const vencido = !f.pago && f.vencimento && f.vencimento < today()
                    return (
                      <li key={f.id} className="flex items-start gap-3 px-4 py-3">
                        <div className={cx('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', f.servico === 'guincho' ? 'bg-brand text-ink' : 'bg-ink text-brand')}>
                          {f.servico === 'guincho' ? <Wrench size={18} /> : <Truck size={18} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-semibold">{nomeCliente(f.clienteId)}</span>
                            {f.pago ? <Badge tone="green">Recebido</Badge> : vencido ? <Badge tone="red">Vencido</Badge> : <Badge tone="amber">A receber</Badge>}
                            {f.nf && (
                              <Badge>
                                <FileText size={11} /> NF {f.nf}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-0.5 truncate text-sm text-muted">
                            {f.local || 'Sem local'} · {nomeVeiculo(f.veiculoId)} · {nomeColab(f.motoristaId)}
                          </div>
                          {f.obs && <div className="mt-0.5 text-xs text-muted italic">{f.obs}</div>}
                        </div>
                        <div className="text-right">
                          <div className="num font-display text-lg font-bold">{money(f.valor)}</div>
                          <div className="num text-xs text-muted">
                            {isAdmin ? (d.motorista ? `mot. ${money(d.motorista)}` : 'Rafael dirigiu') : <span className="font-semibold text-ink">você: {money(d.motorista)}</span>}
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="relative">
                            <button className="-mr-2 rounded-lg p-2 text-muted hover:bg-black/5" aria-label="Ações" onClick={() => setMenu(menu === f.id ? null : f.id)}>
                              <MoreVertical size={18} />
                            </button>
                            {menu === f.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
                                <div className="absolute top-9 right-0 z-20 w-48 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-xl">
                                  <MenuItem icon={<Pencil size={16} />} onClick={() => { setMenu(null); openFrete(f) }}>Editar</MenuItem>
                                  <MenuItem icon={f.pago ? <Undo2 size={16} /> : <Check size={16} />} onClick={() => { setMenu(null); togglePago(f) }}>
                                    {f.pago ? 'Voltar p/ a receber' : 'Marcar recebido'}
                                  </MenuItem>
                                  <MenuItem icon={<Trash2 size={16} />} danger onClick={() => { setMenu(null); del(f) }}>Excluir</MenuItem>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon, children, onClick, danger }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cx('flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium hover:bg-paper', danger && 'text-red-700')}>
      {icon}
      {children}
    </button>
  )
}
