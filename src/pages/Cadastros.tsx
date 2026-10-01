import { useState } from 'react'
import { Archive, ArchiveRestore, Building2, KeyRound, Pencil, Plus, Settings, Trash2, Truck, Users } from 'lucide-react'
import { errMsg, useStore } from '../lib/store'
import { pctMotoristaTotal } from '../lib/calc'
import { money, round2 } from '../lib/format'
import type { Cliente, Colaborador, Config, Papel, Usuario, Veiculo } from '../lib/types'
import { Avatar, Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Segmented, Select, cx } from '../components/ui'

type Aba = 'clientes' | 'veiculos' | 'colaboradores' | 'acessos' | 'config'

export function Cadastros() {
  const { isDono, data } = useStore()
  const [aba, setAba] = useState<Aba>('clientes')
  const pend = data.usuarios.filter((u) => u.papel === 'pendente').length
  const opts: [Aba, React.ReactNode][] = [
    ['clientes', <span className="flex items-center gap-1.5"><Building2 size={15} /> Clientes</span>],
    ['veiculos', <span className="flex items-center gap-1.5"><Truck size={15} /> Veículos</span>],
    ['colaboradores', <span className="flex items-center gap-1.5"><Users size={15} /> Colaboradores</span>],
    ['acessos', <span className="flex items-center gap-1.5"><KeyRound size={15} /> Acessos{pend ? <Badge tone="red" className="ml-1">{pend}</Badge> : null}</span>],
  ]
  if (isDono) opts.push(['config', <span className="flex items-center gap-1.5"><Settings size={15} /> Regras</span>])
  return (
    <div className="space-y-4">
      <PageHeader title="Cadastros" subtitle="Clientes, veículos, equipe e quem pode acessar o sistema." />
      <Segmented value={aba} onChange={setAba} options={opts} />
      {aba === 'clientes' && <Clientes />}
      {aba === 'veiculos' && <Veiculos />}
      {aba === 'colaboradores' && <Colaboradores />}
      {aba === 'acessos' && <Acessos />}
      {aba === 'config' && isDono && <Regras />}
    </div>
  )
}

function useArchive<T extends { id: string; ativo: boolean }>(col: 'clientes' | 'veiculos' | 'colaboradores', emUso: (id: string) => boolean) {
  const { be, toast } = useStore()
  return {
    toggle: async (x: T) => {
      try {
        await be.update(col, x.id, { ativo: !x.ativo } as never)
        toast(x.ativo ? 'Arquivado' : 'Reativado')
      } catch (e) {
        toast(errMsg(e), 'erro')
      }
    },
    remove: async (x: T, nome: string) => {
      if (emUso(x.id)) return toast('Já tem lançamentos com esse cadastro. Use "Arquivar".', 'erro')
      if (!confirm(`Excluir "${nome}"?`)) return
      try {
        await be.remove(col, x.id)
        toast('Excluído')
      } catch (e) {
        toast(errMsg(e), 'erro')
      }
    },
  }
}

function Row({ children, ativo, onEdit, onArchive, onDelete }: { children: React.ReactNode; ativo: boolean; onEdit: () => void; onArchive: () => void; onDelete?: () => void }) {
  return (
    <li className={cx('flex items-center gap-3 px-4 py-3', !ativo && 'opacity-50')}>
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0">
        <button className="rounded-lg p-2 text-muted hover:bg-black/5" aria-label="Editar" title="Editar" onClick={onEdit}>
          <Pencil size={16} />
        </button>
        <button className="rounded-lg p-2 text-muted hover:bg-black/5" aria-label={ativo ? 'Arquivar' : 'Reativar'} title={ativo ? 'Arquivar' : 'Reativar'} onClick={onArchive}>
          {ativo ? <Archive size={16} /> : <ArchiveRestore size={16} />}
        </button>
        {onDelete && (
          <button className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-700" aria-label="Excluir" title="Excluir" onClick={onDelete}>
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </li>
  )
}

const sortAtivo = <T extends { ativo: boolean; nome: string }>(a: T[]) => [...a].sort((x, y) => Number(y.ativo) - Number(x.ativo) || x.nome.localeCompare(y.nome))

function Clientes() {
  const { data, be, toast } = useStore()
  const [edit, setEdit] = useState<Partial<Cliente> | null>(null)
  const arc = useArchive<Cliente>('clientes', (id) => data.fretes.some((f) => f.clienteId === id))
  const aberto = (id: string) => data.fretes.filter((f) => f.clienteId === id && !f.pago).reduce((s, f) => s + f.valor, 0)

  async function save() {
    if (!edit?.nome?.trim()) return toast('Informe o nome', 'erro')
    const p = {
      nome: edit.nome.trim(), codigo: edit.codigo?.trim() ?? '', telefone: edit.telefone?.trim() ?? '',
      documento: edit.documento?.trim() ?? '', prazoDias: Number(edit.prazoDias) || 0, obs: edit.obs?.trim() ?? '', ativo: edit.ativo ?? true,
    }
    if (p.codigo && data.clientes.some((c) => c.codigo === p.codigo && c.id !== edit.id)) return toast(`O ID ${p.codigo} já é de outro cliente`, 'erro')
    try {
      if (edit.id) await be.update('clientes', edit.id, p)
      else await be.add('clientes', p)
      toast('Cliente salvo')
      setEdit(null)
    } catch (e) {
      toast(errMsg(e), 'erro')
    }
  }
  const sugestaoId = String(Math.max(0, ...data.clientes.map((c) => parseInt(c.codigo) || 0)) + 1)

  return (
    <Card pad={false} title={`${data.clientes.filter((c) => c.ativo).length} clientes / fornecedores`} action={<Button size="sm" icon={<Plus size={15} />} onClick={() => setEdit({ codigo: sugestaoId })}>Novo cliente</Button>}>
      {!data.clientes.length && <Empty title="Nenhum cliente" />}
      <ul className="divide-y divide-line">
        {sortAtivo(data.clientes).map((c) => (
          <Row key={c.id} ativo={c.ativo} onEdit={() => setEdit(c)} onArchive={() => arc.toggle(c)} onDelete={() => arc.remove(c, c.nome)}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{c.nome}</span>
              {c.codigo && <Badge tone="dark">ID {c.codigo}</Badge>}
              {!c.ativo && <Badge>arquivado</Badge>}
              {aberto(c.id) > 0 && <Badge tone="amber">{money(aberto(c.id))} a receber</Badge>}
            </div>
            <div className="mt-0.5 text-xs text-muted">
              {[c.telefone, c.documento, c.prazoDias ? `prazo ${c.prazoDias} dias` : 'à vista', `${data.fretes.filter((f) => f.clienteId === c.id).length} fretes`].filter(Boolean).join(' · ')}
            </div>
          </Row>
        ))}
      </ul>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Editar cliente' : 'Novo cliente'} footer={<Button onClick={save}>Salvar</Button>}>
        {edit && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome" className="col-span-2">
              <Input autoFocus value={edit.nome ?? ''} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} placeholder="Ex.: Terra Verde" />
            </Field>
            <Field label="ID / código fixo" hint="Ex.: Terra Verde = 10">
              <Input value={edit.codigo ?? ''} onChange={(e) => setEdit({ ...edit, codigo: e.target.value })} />
            </Field>
            <Field label="Prazo p/ pagar (dias)" hint="Calcula o vencimento sozinho">
              <Input type="number" min="0" value={edit.prazoDias ?? 0} onChange={(e) => setEdit({ ...edit, prazoDias: Number(e.target.value) })} />
            </Field>
            <Field label="WhatsApp / telefone">
              <Input inputMode="tel" value={edit.telefone ?? ''} onChange={(e) => setEdit({ ...edit, telefone: e.target.value })} placeholder="(19) 99999-9999" />
            </Field>
            <Field label="CNPJ / CPF">
              <Input value={edit.documento ?? ''} onChange={(e) => setEdit({ ...edit, documento: e.target.value })} />
            </Field>
            <Field label="Observação" className="col-span-2">
              <Input value={edit.obs ?? ''} onChange={(e) => setEdit({ ...edit, obs: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>
    </Card>
  )
}

function Veiculos() {
  const { data, be, toast } = useStore()
  const [edit, setEdit] = useState<Partial<Veiculo> | null>(null)
  const arc = useArchive<Veiculo>('veiculos', (id) => data.fretes.some((f) => f.veiculoId === id) || data.gastos.some((g) => g.veiculoId === id))
  async function save() {
    if (!edit?.nome?.trim()) return toast('Informe o nome/apelido', 'erro')
    const p = { nome: edit.nome.trim(), placa: edit.placa?.trim().toUpperCase() ?? '', tipo: edit.tipo?.trim() ?? '', ativo: edit.ativo ?? true }
    try {
      if (edit.id) await be.update('veiculos', edit.id, p)
      else await be.add('veiculos', p)
      toast('Veículo salvo')
      setEdit(null)
    } catch (e) {
      toast(errMsg(e), 'erro')
    }
  }
  return (
    <Card pad={false} title={`${data.veiculos.filter((v) => v.ativo).length} veículos`} action={<Button size="sm" icon={<Plus size={15} />} onClick={() => setEdit({})}>Novo veículo</Button>}>
      {!data.veiculos.length && <Empty title="Nenhum veículo" />}
      <ul className="divide-y divide-line">
        {sortAtivo(data.veiculos).map((v) => (
          <Row key={v.id} ativo={v.ativo} onEdit={() => setEdit(v)} onArchive={() => arc.toggle(v)} onDelete={() => arc.remove(v, v.nome)}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{v.nome}</span>
              {v.placa && <Badge>{v.placa}</Badge>}
              {!v.ativo && <Badge>arquivado</Badge>}
            </div>
            <div className="mt-0.5 text-xs text-muted">{[v.tipo, `${data.fretes.filter((f) => f.veiculoId === v.id).length} serviços`].filter(Boolean).join(' · ')}</div>
          </Row>
        ))}
      </ul>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Editar veículo' : 'Novo veículo'} footer={<Button onClick={save}>Salvar</Button>}>
        {edit && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome / apelido" className="col-span-2" hint='Como aparece no caderno. Ex.: "9160", "3/4 RD"'>
              <Input autoFocus value={edit.nome ?? ''} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} />
            </Field>
            <Field label="Placa">
              <Input value={edit.placa ?? ''} onChange={(e) => setEdit({ ...edit, placa: e.target.value })} placeholder="ABC1D23" />
            </Field>
            <Field label="Tipo">
              <Input list="dl-tipos" value={edit.tipo ?? ''} onChange={(e) => setEdit({ ...edit, tipo: e.target.value })} placeholder="Caminhão, guincho…" />
              <datalist id="dl-tipos">
                {['Caminhão', 'Caminhão 3/4', 'Guincho plataforma', 'Guincho asa delta', 'Utilitário', 'Carreta'].map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </Field>
          </div>
        )}
      </Modal>
    </Card>
  )
}

function Colaboradores() {
  const { data, be, toast, config } = useStore()
  const [edit, setEdit] = useState<Partial<Colaborador> | null>(null)
  const arc = useArchive<Colaborador>('colaboradores', (id) => data.fretes.some((f) => f.motoristaId === id) || data.pagamentos.some((p) => p.colaboradorId === id) || data.usuarios.some((u) => u.colaboradorId === id))
  async function save() {
    if (!edit?.nome?.trim()) return toast('Informe o nome', 'erro')
    const p = { nome: edit.nome.trim(), telefone: edit.telefone?.trim() ?? '', funcao: edit.funcao?.trim() ?? '', ativo: edit.ativo ?? true }
    try {
      if (edit.id) await be.update('colaboradores', edit.id, p)
      else await be.add('colaboradores', p)
      toast('Colaborador salvo')
      setEdit(null)
    } catch (e) {
      toast(errMsg(e), 'erro')
    }
  }
  const conta = (id: string) => data.usuarios.find((u) => u.colaboradorId === id)
  return (
    <Card pad={false} title={`${data.colaboradores.filter((c) => c.ativo).length} colaboradores`} action={<Button size="sm" icon={<Plus size={15} />} onClick={() => setEdit({ funcao: 'Motorista' })}>Novo colaborador</Button>}>
      <ul className="divide-y divide-line">
        {sortAtivo(data.colaboradores).map((c) => (
          <Row key={c.id} ativo={c.ativo} onEdit={() => setEdit(c)} onArchive={() => (c.id === config?.donoColaboradorId ? toast('O dono não pode ser arquivado', 'erro') : arc.toggle(c))} onDelete={c.id === config?.donoColaboradorId ? undefined : () => arc.remove(c, c.nome)}>
            <div className="flex items-center gap-3">
              <Avatar nome={c.nome} />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{c.nome}</span>
                  {c.id === config?.donoColaboradorId && <Badge tone="dark">dono</Badge>}
                  {conta(c.id) ? <Badge tone="green">tem acesso</Badge> : <Badge>sem login</Badge>}
                  {!c.ativo && <Badge>arquivado</Badge>}
                </div>
                <div className="mt-0.5 text-xs text-muted">{[c.funcao, c.telefone, conta(c.id)?.email].filter(Boolean).join(' · ')}</div>
              </div>
            </div>
          </Row>
        ))}
      </ul>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Editar colaborador' : 'Novo colaborador'} footer={<Button onClick={save}>Salvar</Button>}>
        {edit && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome" className="col-span-2">
              <Input autoFocus value={edit.nome ?? ''} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} />
            </Field>
            <Field label="Função">
              <Input value={edit.funcao ?? ''} onChange={(e) => setEdit({ ...edit, funcao: e.target.value })} />
            </Field>
            <Field label="WhatsApp / telefone">
              <Input inputMode="tel" value={edit.telefone ?? ''} onChange={(e) => setEdit({ ...edit, telefone: e.target.value })} />
            </Field>
            <p className="col-span-2 text-xs text-muted">Para o colaborador entrar no sistema, ele cria a conta na tela de login e você libera em Acessos.</p>
          </div>
        )}
      </Modal>
    </Card>
  )
}

function Acessos() {
  const { data, be, toast, perfil, isDono } = useStore()
  const usuarios = [...data.usuarios].sort((a, b) => Number(b.papel === 'pendente') - Number(a.papel === 'pendente') || a.nome.localeCompare(b.nome))

  async function set(u: Usuario, patch: Partial<Usuario>) {
    try {
      await be.update('usuarios', u.id, patch)
      toast('Acesso atualizado')
    } catch (e) {
      toast(errMsg(e), 'erro')
    }
  }
  async function liberar(u: Usuario) {
    let colId = u.colaboradorId
    if (!colId) {
      const match = data.colaboradores.find((c) => c.nome.toLowerCase() === u.nome.toLowerCase() && !data.usuarios.some((x) => x.colaboradorId === c.id))
      colId = match?.id ?? (await be.add('colaboradores', { nome: u.nome, telefone: '', funcao: 'Motorista', ativo: true }))
    }
    await set(u, { papel: 'colaborador', colaboradorId: colId })
  }
  const livres = (u: Usuario) => data.colaboradores.filter((c) => c.ativo && (c.id === u.colaboradorId || !data.usuarios.some((x) => x.colaboradorId === c.id)))

  return (
    <Card pad={false} title="Quem pode entrar no sistema">
      <div className="border-b border-line bg-paper/60 px-4 py-3 text-sm text-muted">
        O colaborador cria a conta na tela de login com e-mail e senha. Ela aparece aqui como <b>pendente</b>: ligue ao nome dele na equipe e libere. O <b>colaborador</b> vê só os
        próprios fretes, gastos e ganhos. O <b>administrador</b> vê tudo, como o Rafael.
      </div>
      {!usuarios.length && <Empty title="Nenhuma conta ainda" />}
      <ul className="divide-y divide-line">
        {usuarios.map((u) => {
          const fixo = u.papel === 'dono' || u.id === perfil?.id
          return (
            <li key={u.id} className={cx('flex flex-wrap items-center gap-3 px-4 py-3', u.papel === 'pendente' && 'bg-amber-50/60')}>
              <Avatar nome={u.nome} />
              <div className="min-w-[160px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{u.nome}</span>
                  <Badge tone={u.papel === 'dono' ? 'dark' : u.papel === 'pendente' ? 'amber' : u.papel === 'admin' ? 'blue' : 'green'}>
                    {{ dono: 'dono', admin: 'administrador', colaborador: 'colaborador', pendente: 'pendente' }[u.papel]}
                  </Badge>
                </div>
                <div className="text-xs text-muted">{u.email}</div>
              </div>
              {!fixo && (
                <div className="flex flex-wrap items-center gap-2">
                  {u.papel === 'pendente' ? (
                    <>
                      <Button size="sm" variant="success" onClick={() => liberar(u)}>
                        Liberar como colaborador
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => be.remove('usuarios', u.id).then(() => toast('Conta recusada')).catch((e) => toast(errMsg(e), 'erro'))}>
                        Recusar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Select className="h-9 w-auto" value={u.colaboradorId ?? ''} onChange={(e) => set(u, { colaboradorId: e.target.value || null })}>
                        <option value="">— sem vínculo —</option>
                        {livres(u).map((c) => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </Select>
                      <Select className="h-9 w-auto" value={u.papel} disabled={!isDono && u.papel === 'admin'} onChange={(e) => set(u, { papel: e.target.value as Papel })}>
                        <option value="colaborador">Colaborador</option>
                        {isDono && <option value="admin">Administrador</option>}
                        <option value="pendente">Bloquear</option>
                      </Select>
                    </>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function Regras() {
  const { config, be, toast } = useStore()
  const [c, setC] = useState({ empresa: config?.empresa ?? '', pctComissao: config?.pctComissao ?? 10, pctDono: config?.pctDono ?? 50 })
  const exemplo = 100
  const com = (exemplo * c.pctComissao) / 100
  const dono = ((exemplo - com) * c.pctDono) / 100
  async function save() {
    if (!confirm('Mudar a regra vale só para fretes lançados daqui pra frente. Os antigos mantêm a regra com que foram lançados. Continuar?')) return
    try {
      if (!config) return
      const { id: _id, ...base } = config as Config & { id?: string }
      await be.setDoc(['config', 'geral'], { ...base, empresa: c.empresa, pctComissao: +c.pctComissao, pctDono: +c.pctDono })
      toast('Regras salvas')
    } catch (e) {
      toast(errMsg(e), 'erro')
    }
  }
  return (
    <Card title="Regra de divisão do frete">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-3">
          <Field label="Nome da empresa">
            <Input value={c.empresa} onChange={(e) => setC({ ...c, empresa: e.target.value })} />
          </Field>
          <Field label="Comissão do motorista (%)" hint="Sai primeiro, direto pro motorista">
            <Input type="number" min="0" max="100" value={c.pctComissao} onChange={(e) => setC({ ...c, pctComissao: +e.target.value })} />
          </Field>
          <Field label="Parte do Rafael no restante (%)" hint="O resto do restante vai pro motorista">
            <Input type="number" min="0" max="100" value={c.pctDono} onChange={(e) => setC({ ...c, pctDono: +e.target.value })} />
          </Field>
          <Button onClick={save} className="justify-self-start">
            Salvar regras
          </Button>
        </div>
        <div className="rounded-2xl bg-ink p-5 text-white">
          <div className="text-sm text-white/60">Exemplo: frete de {money(exemplo)}</div>
          <ol className="mt-3 space-y-2 text-sm">
            <li>
              1. {c.pctComissao}% do motorista: <b className="num">{money(com)}</b>
            </li>
            <li>
              2. Sobra <b className="num">{money(exemplo - com)}</b>, dividido {c.pctDono}/{100 - c.pctDono}
            </li>
            <li>
              3. Rafael: <b className="num">{money(dono)}</b> · Motorista: <b className="num">{money(exemplo - com - dono)}</b>
            </li>
          </ol>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
            <div>
              <div className="text-xs text-white/60">Motorista leva</div>
              <div className="num font-display text-3xl font-bold text-brand">{money(round2(com + exemplo - com - dono))}</div>
              <div className="text-xs text-white/50">{pctMotoristaTotal(c)}% do frete</div>
            </div>
            <div>
              <div className="text-xs text-white/60">Rafael fica com</div>
              <div className="num font-display text-3xl font-bold">{money(dono)}</div>
              <div className="text-xs text-white/50">{round2(100 - pctMotoristaTotal(c))}% do frete</div>
            </div>
          </div>
          <p className="mt-4 text-xs text-white/50">Quando o próprio Rafael dirige, o frete inteiro fica com ele.</p>
        </div>
      </div>
    </Card>
  )
}
