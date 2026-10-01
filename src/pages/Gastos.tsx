import { useMemo, useState } from 'react'
import { Fuel, Pencil, Plus, Trash2 } from 'lucide-react'
import { errMsg, useStore } from '../lib/store'
import { dFull, money, monthLabel, round2, sum, today } from '../lib/format'
import { CATEGORIAS_GASTO, type Gasto } from '../lib/types'
import { Badge, Bar, Button, Card, Empty, Field, Input, Kpi, Modal, MoneyInput, MonthPicker, PageHeader, Select } from '../components/ui'

export function Gastos() {
  const { data, mes, setMes, isAdmin, nomeColab, nomeVeiculo, be, toast, config } = useStore()
  const [edit, setEdit] = useState<Gasto | 'new' | null>(null)
  const [fCat, setFCat] = useState('')

  const G = useMemo(
    () => data.gastos.filter((g) => (!mes || g.data.startsWith(mes)) && (!fCat || g.categoria === fCat)).sort((a, b) => b.data.localeCompare(a.data)),
    [data.gastos, mes, fCat],
  )
  const porCat = useMemo(() => {
    const m = new Map<string, number>()
    data.gastos.filter((g) => !mes || g.data.startsWith(mes)).forEach((g) => m.set(g.categoria, (m.get(g.categoria) ?? 0) + g.valor))
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [data.gastos, mes])
  const maxCat = porCat[0]?.[1] || 1
  const reemb = sum(G.filter((g) => g.reembolsar && g.quemId !== config?.donoColaboradorId), (g) => g.valor)

  async function del(g: Gasto) {
    if (!confirm(`Excluir o gasto "${g.descricao}" de ${money(g.valor)}?`)) return
    try {
      await be.remove('gastos', g.id)
      toast('Gasto excluído')
    } catch (e) {
      toast(errMsg(e), 'erro')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={isAdmin ? 'Gastos' : 'Meus gastos'} subtitle={isAdmin ? 'Diesel, manutenção, pedágio e tudo que sai do caixa.' : 'Gastos que você pagou do seu bolso entram no seu acerto.'}>
        <MonthPicker value={mes} onChange={setMes} />
        <Button icon={<Plus size={18} />} onClick={() => setEdit('new')}>
          Lançar gasto
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi tone="dark" label={`Gastos · ${monthLabel(mes)}`} value={money(sum(G, (g) => g.valor))} hint={`${G.length} lançamentos`} />
        <Kpi label="A reembolsar p/ equipe" value={money(reemb)} hint="pago do bolso do colaborador" />
        <div className="col-span-2 md:col-span-1">
          <Kpi label="Maior categoria" value={porCat[0]?.[0] ?? '—'} hint={porCat[0] ? money(porCat[0][1]) : undefined} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card
          pad={false}
          title="Lançamentos"
          action={
            <Select className="h-9 w-auto" value={fCat} onChange={(e) => setFCat(e.target.value)}>
              <option value="">Todas categorias</option>
              {CATEGORIAS_GASTO.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          }
        >
          {!G.length ? (
            <Empty icon={<Fuel size={26} />} title="Nenhum gasto">
              Nada lançado neste período.
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {G.map((g) => (
                <li key={g.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700">
                    <Fuel size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{g.descricao}</span>
                      <Badge>{g.categoria}</Badge>
                      {g.reembolsar && g.quemId !== config?.donoColaboradorId && <Badge tone="blue">reembolsar</Badge>}
                    </div>
                    <div className="mt-0.5 text-sm text-muted">
                      {dFull(g.data)} · pago por {nomeColab(g.quemId)}
                      {g.veiculoId ? ` · ${nomeVeiculo(g.veiculoId)}` : ''}
                    </div>
                  </div>
                  <b className="num font-display text-lg">{money(g.valor)}</b>
                  {isAdmin && (
                    <div className="flex">
                      <button className="rounded-lg p-1.5 text-muted hover:bg-black/5" aria-label="Editar" onClick={() => setEdit(g)}>
                        <Pencil size={15} />
                      </button>
                      <button className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-700" aria-label="Excluir" onClick={() => del(g)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Por categoria">
          <ul className="space-y-3">
            {porCat.map(([c, v]) => (
              <li key={c}>
                <button className="w-full text-left" onClick={() => setFCat(fCat === c ? '' : c)}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className={fCat === c ? 'font-bold' : 'font-medium'}>{c}</span>
                    <b className="num">{money(v)}</b>
                  </div>
                  <Bar pct={(v / maxCat) * 100} className="bg-red-500" />
                </button>
              </li>
            ))}
            {!porCat.length && <li className="text-sm text-muted">Sem gastos.</li>}
          </ul>
        </Card>
      </div>

      <GastoForm gasto={edit} onClose={() => setEdit(null)} />
    </div>
  )
}

function GastoForm({ gasto, onClose }: { gasto: Gasto | 'new' | null; onClose: () => void }) {
  const { data, be, toast, isAdmin, meuColabId, perfil, config } = useStore()
  const [d, setD] = useState({ data: today(), descricao: '', categoria: 'Diesel', veiculoId: '', quemId: '', valor: '', reembolsar: false })
  const [last, setLast] = useState<typeof gasto>(null)
  if (gasto !== last) {
    setLast(gasto)
    if (gasto === 'new') {
      const quem = isAdmin ? (config?.donoColaboradorId ?? '') : (meuColabId ?? '')
      setD({ data: today(), descricao: '', categoria: 'Diesel', veiculoId: '', quemId: quem, valor: '', reembolsar: !isAdmin })
    } else if (gasto) {
      setD({ ...gasto, veiculoId: gasto.veiculoId ?? '', valor: String(gasto.valor) })
    }
  }
  const set = (k: keyof typeof d, v: string | boolean) => setD((x) => ({ ...x, [k]: v }))
  const donoPagou = d.quemId === config?.donoColaboradorId

  async function save() {
    const valor = round2(parseFloat(d.valor.replace(',', '.')) || 0)
    if (!d.descricao.trim()) return toast('Informe a descrição', 'erro')
    if (!valor) return toast('Informe o valor', 'erro')
    const payload = {
      data: d.data,
      descricao: d.descricao.trim(),
      categoria: d.categoria,
      veiculoId: d.veiculoId || null,
      quemId: isAdmin ? d.quemId : meuColabId!,
      valor,
      reembolsar: !donoPagou && d.reembolsar,
    }
    try {
      if (gasto && gasto !== 'new') await be.update('gastos', gasto.id, payload)
      else await be.add('gastos', { ...payload, criadoPor: perfil!.id, criadoEm: new Date().toISOString() })
      toast('Gasto salvo')
      onClose()
    } catch (e) {
      toast(errMsg(e), 'erro')
    }
  }

  return (
    <Modal open={!!gasto} onClose={onClose} title={gasto === 'new' ? 'Lançar gasto' : 'Editar gasto'} footer={<Button onClick={save}>Salvar</Button>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data">
          <Input type="date" value={d.data} onChange={(e) => set('data', e.target.value)} />
        </Field>
        <Field label="Valor">
          <MoneyInput autoFocus value={d.valor} onChange={(e) => set('valor', e.target.value)} placeholder="0,00" />
        </Field>
        <Field label="Descrição" className="col-span-2">
          <Input value={d.descricao} onChange={(e) => set('descricao', e.target.value)} placeholder="Ex.: Diesel posto Shell" />
        </Field>
        <Field label="Categoria">
          <Select value={d.categoria} onChange={(e) => set('categoria', e.target.value)}>
            {CATEGORIAS_GASTO.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Veículo">
          <Select value={d.veiculoId} onChange={(e) => set('veiculoId', e.target.value)}>
            <option value="">— Nenhum / geral —</option>
            {data.veiculos.filter((v) => v.ativo || v.id === d.veiculoId).map((v) => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
          </Select>
        </Field>
        {isAdmin && (
          <Field label="Quem pagou" className="col-span-2">
            <Select value={d.quemId} onChange={(e) => set('quemId', e.target.value)}>
              {data.colaboradores.filter((c) => c.ativo || c.id === d.quemId).map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </Select>
          </Field>
        )}
        {!donoPagou && (
          <label className="col-span-2 flex cursor-pointer items-start gap-3 rounded-xl border border-line px-3 py-3">
            <input type="checkbox" className="mt-0.5 h-5 w-5 accent-sky-600" checked={d.reembolsar} onChange={(e) => set('reembolsar', e.target.checked)} />
            <span className="text-sm">
              <b>Pago do bolso do colaborador</b>
              <span className="block text-muted">O valor entra no saldo dele para devolver no acerto.</span>
            </span>
          </label>
        )}
      </div>
    </Modal>
  )
}
