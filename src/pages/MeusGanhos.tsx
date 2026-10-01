import { useStore } from '../lib/store'
import { MonthPicker, PageHeader } from '../components/ui'
import { Extrato } from '../components/Extrato'

export function MeusGanhos() {
  const { meuColabId, mes, setMes, perfil } = useStore()
  return (
    <div>
      <PageHeader title={`Olá, ${perfil?.nome?.split(' ')[0] ?? ''}`} subtitle="Seus fretes, ganhos e pagamentos recebidos.">
        <MonthPicker value={mes} onChange={setMes} />
      </PageHeader>
      {meuColabId && <Extrato colabId={meuColabId} readOnly />}
    </div>
  )
}
