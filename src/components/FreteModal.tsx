import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { Frete } from '../lib/types'
import { FreteForm } from './FreteForm'

const Ctx = createContext<(f?: Frete | null) => void>(() => {})

export const useFreteModal = () => useContext(Ctx)

export function FreteModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; frete: Frete | null }>({ open: false, frete: null })
  const open = useCallback((f?: Frete | null) => setState({ open: true, frete: f ?? null }), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  return (
    <Ctx.Provider value={open}>
      {children}
      <FreteForm open={state.open} frete={state.frete} onClose={close} />
    </Ctx.Provider>
  )
}
