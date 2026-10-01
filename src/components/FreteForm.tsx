import { useEffect, useMemo, useState } from 'react'
import { Truck, Wrench } from 'lucide-react'
import { useStore, errMsg } from '../lib/store'
import type { Frete, Servico } from '../lib/types'
import { addDays, money, normalize, round2, today } from '../lib/format'
import { divisao } from '../lib/calc'
import { Button, Field, Input, Modal, MoneyInput, Segmented, Select } from './ui'

type Draft = {
  data: string
  servico: Servico
  cliente: string
  local: string
  veiculoId: string
  motoristaId: string
  valor: string
  nf: string
  vencimento: string
  pago: boolean
  obs: string
}

export function FreteForm({ open, onClose, frete }: { open: boolean; onClose: () => void; frete: Frete | null }) {
  const { be, data, config, isAdmin, meuColabId, perfil, nomeCliente, toast, cliente: getCliente } = useStore()
  const clientes = data.clientes.filter((c) => c.ativo || c.id === frete?.clienteId)
  const veiculos = data.veiculos.filter((v) => v.ativo || v.id === frete?.veiculoId)
  const colabs = data.colaboradores.filter((c) => c.ativo || c.id === frete?.motoristaId)

  const blank = (): Draft => ({
    data: today(),
    servico: 'frete',
    cliente: '',
    local: '',
    veiculoId: veiculos[0]?.id ?? '',
    motoristaId: isAdmin ? (config?.donoColaboradorId ?? colabs[0]?.id ?? '') : (meuColabId ?? ''),
    valor: '',
    nf: '',
    vencimento: '',
    pago: false,
    obs: '',
  })
  const [d, setD] = useState<Draft>(blank)
  const [vencManual, setVencManual] = useState(false)
  const [saving, setSaving] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!open) return
    setCount(0)
    setVencManual(!!frete)
    setD(
      frete
        ? {
            data: frete.data,
            servico: frete.servico ?? 'frete',
            cliente: nomeCliente(frete.clienteId),
            local: frete.local,
            veiculoId: frete.veiculoId,
            motoristaId: frete.motoristaId,
            valor: String(frete.valor),
            nf: frete.nf,
            vencimento: frete.vencimento ?? '',
            pago: frete.pago,
            obs: frete.obs ?? '',
          }
        : blank(),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, frete])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const match = useMemo(() => clientes.find((c) => normalize(c.nome) === normalize(d.cliente)), [clientes, d.cliente])

  useEffect(() => {
    if (vencManual) return
    const prazo = match?.prazoDias ?? 0
    setD((x) => ({ ...x, vencimento: prazo > 0 && x.data ? addDays(x.data, prazo) : '' }))
  }, [match, d.data, vencManual])

  const pctC = frete?.pctComissao ?? config?.pctComissao ?? 10
  const pctD = frete?.pctDono ?? config?.pctDono ?? 50
  const valor = round2(parseFloat(d.valor.replace(',', '.')) || 0)
  const div = divisao({ valor, motoristaId: d.motoristaId, pctComissao: pctC, pctDono: pctD }, config?.donoColaboradorId ?? null)
  const donoDirige = d.motoristaId === config?.donoColaboradorId

  async function save(again: boolean) {
    if (!d.cliente.trim()) return toast('Informe o cliente', 'erro')
    if (!valor) return toast('Informe o valor do frete', 'erro')
    if (!d.motoristaId) return toast('Escolha o motorista', 'erro')
    setSaving(true)
    try {
      let clienteId = match?.id
      if (!clienteId) {
        clienteId = await be.add('clientes', { nome: d.cliente.trim(), codigo: '', telefone: '', documento: '', prazoDias: 0, obs: '', ativo: true })
      }
      const payload = {
        data: d.data,
        servico: d.servico,
        clienteId,
        local: d.local.trim(),
        veiculoId: d.veiculoId,
        motoristaId: isAdmin ? d.motoristaId : meuColabId!,
        valor,
        nf: d.nf.trim(),
        vencimento: d.vencimento || null,
        obs: d.obs.trim(),
      }
      if (frete) {
        const recebidoEm = d.pago ? (frete.recebidoEm ?? today()) : null
        await be.update('fretes', frete.id, { ...payload, pago: d.pago, recebidoEm })
        toast('Frete atualizado')
        onClose()
      } else {
        await be.add('fretes', {
          ...payload,
          pctComissao: pctC,
          pctDono: pctD,
          pago: isAdmin ? d.pago : false,
          recebidoEm: isAdmin && d.pago ? today() : null,
          criadoPor: perfil!.id,
          criadoEm: new Date().toISOString(),
        })
        toast(`Frete de ${money(valor)} lançado`)
        if (again) {
          setCount((c) => c + 1)
          setD((x) => ({ ...x, local: '', valor: '', nf: '', obs: '', pago: false }))
        } else onClose()
      }
    } catch (e) {
      toast(errMsg(e), 'erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={frete ? 'Editar frete' : 'Lançar frete'}
      footer={
        <>
          {count > 0 && <span className="mr-auto self-center text-sm text-muted">{count} lançado(s) nesta sequência</span>}
          {!frete && (
            <Button variant="outline" disabled={saving} onClick={() => save(true)}>
              Salvar e lançar outro
            </Button>
          )}
          <Button disabled={saving} onClick={() => save(false)}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <form
        className="grid grid-cols-2 gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          save(false)
        }}
      >
        <div className="col-span-2">
          <Segmented<Servico>
            value={d.servico}
            onChange={(v) => set('servico', v)}
            options={[
              ['frete', <span className="flex items-center gap-1.5"><Truck size={16} /> Frete</span>],
              ['guincho', <span className="flex items-center gap-1.5"><Wrench size={16} /> Guincho</span>],
            ]}
          />
        </div>
        <Field label="Data">
          <Input type="date" required value={d.data} onChange={(e) => set('data', e.target.value)} />
        </Field>
        <Field label="Valor">
          <MoneyInput required autoFocus={!frete} placeholder="0,00" value={d.valor} onChange={(e) => set('valor', e.target.value)} />
        </Field>
        <Field
          label="Cliente"
          className="col-span-2"
          hint={d.cliente && !match ? 'Cliente novo: será cadastrado automaticamente.' : match?.codigo ? `ID ${match.codigo}` : undefined}
        >
          <Input list="dl-clientes" required placeholder="Ex.: Terra Verde" value={d.cliente} onChange={(e) => set('cliente', e.target.value)} />
          <datalist id="dl-clientes">
            {clientes.map((c) => (
              <option key={c.id} value={c.nome}>
                {c.codigo ? `ID ${c.codigo}` : ''}
              </option>
            ))}
          </datalist>
        </Field>
        <Field label="Local / destino" className="col-span-2">
          <Input placeholder="Ex.: Itapira → Descalvado/MG" value={d.local} onChange={(e) => set('local', e.target.value)} />
        </Field>
        <Field label="Veículo">
          <Select value={d.veiculoId} onChange={(e) => set('veiculoId', e.target.value)}>
            {veiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
                {v.placa ? ` · ${v.placa}` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Motorista">
          <Select value={d.motoristaId} disabled={!isAdmin} onChange={(e) => set('motoristaId', e.target.value)}>
            {colabs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </Field>

        {valor > 0 && (
          <div className="col-span-2 grid grid-cols-2 gap-2 rounded-2xl bg-ink p-3 text-white">
            {donoDirige ? (
              <div className="col-span-2 text-sm">
                <span className="text-white/60">O dono dirigiu: o frete inteiro fica com ele · </span>
                <b className="num text-brand">{money(div.dono)}</b>
              </div>
            ) : (
              <>
                <div>
                  <div className="text-xs text-white/60">
                    Motorista ({pctC}% + {round2(((100 - pctC) * (100 - pctD)) / 100)}%)
                  </div>
                  <div className="num font-display text-xl font-bold text-brand">{money(div.motorista)}</div>
                </div>
                <div>
                  <div className="text-xs text-white/60">Rafael ({round2(((100 - pctC) * pctD) / 100)}%)</div>
                  <div className="num font-display text-xl font-bold">{money(div.dono)}</div>
                </div>
              </>
            )}
          </div>
        )}

        <Field label="Nº da NF">
          <Input placeholder="Opcional" value={d.nf} onChange={(e) => set('nf', e.target.value)} />
        </Field>
        <Field label="Vencimento" hint={!vencManual && match?.prazoDias ? `Prazo do cliente: ${match.prazoDias} dias` : undefined}>
          <Input
            type="date"
            value={d.vencimento}
            onChange={(e) => {
              setVencManual(true)
              set('vencimento', e.target.value)
            }}
          />
        </Field>
        <Field label="Observação" className="col-span-2">
          <Input placeholder="Opcional" value={d.obs} onChange={(e) => set('obs', e.target.value)} />
        </Field>
        {isAdmin && (
          <label className="col-span-2 flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-3">
            <input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={d.pago} onChange={(e) => set('pago', e.target.checked)} />
            <span className="text-sm font-medium">Já recebi esse frete do cliente</span>
          </label>
        )}
        <button type="submit" className="hidden" />
      </form>
      {frete && getCliente(frete.clienteId) === undefined && <p className="mt-2 text-xs text-muted">Cliente original não encontrado.</p>}
    </Modal>
  )
}
