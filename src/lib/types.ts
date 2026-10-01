export type Papel = 'dono' | 'admin' | 'colaborador' | 'pendente'

export interface Usuario {
  id: string
  nome: string
  email: string
  papel: Papel
  colaboradorId: string | null
  criadoEm: string
}

export interface Config {
  empresa: string
  donoUid: string
  donoColaboradorId: string | null
  /** % do frete que vai direto pro motorista antes da divisão */
  pctComissao: number
  /** % do restante que fica com o dono (o resto vai pro motorista) */
  pctDono: number
}

export interface Cliente {
  id: string
  nome: string
  codigo: string
  telefone: string
  documento: string
  prazoDias: number
  obs: string
  ativo: boolean
}

export interface Veiculo {
  id: string
  nome: string
  placa: string
  tipo: string
  ativo: boolean
}

export interface Colaborador {
  id: string
  nome: string
  telefone: string
  funcao: string
  ativo: boolean
}

export type Servico = 'frete' | 'guincho'

export interface Frete {
  id: string
  data: string
  servico: Servico
  clienteId: string
  local: string
  veiculoId: string
  motoristaId: string
  valor: number
  /** regra de divisão gravada no momento do lançamento */
  pctComissao: number
  pctDono: number
  pago: boolean
  recebidoEm: string | null
  nf: string
  vencimento: string | null
  obs: string
  criadoPor: string
  criadoEm: string
}

export const CATEGORIAS_GASTO = ['Diesel', 'Manutenção', 'Pneu', 'Pedágio', 'Alimentação', 'NF / Imposto', 'Parcela / Financiamento', 'Outros'] as const

export interface Gasto {
  id: string
  data: string
  descricao: string
  categoria: string
  veiculoId: string | null
  quemId: string
  valor: number
  /** pago do bolso do colaborador: entra no saldo dele a receber */
  reembolsar: boolean
  criadoPor: string
  criadoEm: string
}

export type TipoPagamento = 'pagamento' | 'vale'

export interface Pagamento {
  id: string
  data: string
  colaboradorId: string
  valor: number
  tipo: TipoPagamento
  obs: string
  criadoEm: string
}

export interface Collections {
  clientes: Cliente
  veiculos: Veiculo
  colaboradores: Colaborador
  fretes: Frete
  gastos: Gasto
  pagamentos: Pagamento
  usuarios: Usuario
}

export type ColName = keyof Collections
