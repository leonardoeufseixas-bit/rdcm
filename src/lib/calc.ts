import type { Config, Frete, Gasto, Pagamento } from './types'
import { round2, sum } from './format'

/**
 * Regra da RDCM: frete de R$ 100 -> 10% do motorista (R$ 10),
 * o restante (R$ 90) é dividido: 50% Rafael (R$ 45) e 50% motorista (R$ 45).
 * Motorista fica com R$ 55, Rafael com R$ 45.
 * Quando o próprio Rafael dirige, o frete inteiro é dele.
 */
export function divisao(f: Pick<Frete, 'valor' | 'motoristaId' | 'pctComissao' | 'pctDono'>, donoColaboradorId: string | null) {
  const valor = f.valor || 0
  if (donoColaboradorId && f.motoristaId === donoColaboradorId) {
    return { comissao: 0, metadeMotorista: 0, motorista: 0, dono: valor }
  }
  const comissao = (valor * f.pctComissao) / 100
  const resto = valor - comissao
  const dono = (resto * f.pctDono) / 100
  const metadeMotorista = resto - dono
  return {
    comissao: round2(comissao),
    metadeMotorista: round2(metadeMotorista),
    motorista: round2(comissao + metadeMotorista),
    dono: round2(dono),
  }
}

export const pctMotoristaTotal = (cfg: Pick<Config, 'pctComissao' | 'pctDono'>) =>
  round2(cfg.pctComissao + ((100 - cfg.pctComissao) * (100 - cfg.pctDono)) / 100)

export interface ExtratoColaborador {
  fretes: Frete[]
  totalFrete: number
  ganhoFretes: number
  ganhoRecebido: number
  ganhoAguardando: number
  reembolsos: number
  gastosReembolso: Gasto[]
  pago: number
  vales: number
  pagamentos: Pagamento[]
  saldo: number
}

export function extrato(
  colaboradorId: string,
  fretes: Frete[],
  gastos: Gasto[],
  pagamentos: Pagamento[],
  donoColaboradorId: string | null,
): ExtratoColaborador {
  const F = fretes.filter((f) => f.motoristaId === colaboradorId)
  const G = gastos.filter((g) => g.quemId === colaboradorId && g.reembolsar)
  const P = pagamentos.filter((p) => p.colaboradorId === colaboradorId)
  const ganho = (f: Frete) => divisao(f, donoColaboradorId).motorista
  const ganhoFretes = round2(sum(F, ganho))
  const ganhoRecebido = round2(sum(F.filter((f) => f.pago), ganho))
  const reembolsos = round2(sum(G, (g) => g.valor))
  const pago = round2(sum(P.filter((p) => p.tipo === 'pagamento'), (p) => p.valor))
  const vales = round2(sum(P.filter((p) => p.tipo === 'vale'), (p) => p.valor))
  return {
    fretes: F,
    totalFrete: round2(sum(F, (f) => f.valor)),
    ganhoFretes,
    ganhoRecebido,
    ganhoAguardando: round2(ganhoFretes - ganhoRecebido),
    reembolsos,
    gastosReembolso: G,
    pago,
    vales,
    pagamentos: P,
    saldo: round2(ganhoFretes + reembolsos - pago - vales),
  }
}
