import type { ColName, Collections } from './types'

export interface AuthUser {
  uid: string
  email: string
  nome: string
}

export interface Filter {
  field: string
  value: string
}

export type Unsub = () => void
export type DocPath = [col: string, id: string]

export interface Backend {
  demo: boolean
  onAuth(cb: (u: AuthUser | null) => void): Unsub
  signIn(email: string, senha: string): Promise<void>
  signUp(nome: string, email: string, senha: string): Promise<void>
  resetPassword(email: string): Promise<void>
  signOut(): Promise<void>
  watchCol<K extends ColName>(col: K, filter: Filter | null, cb: (rows: Collections[K][]) => void, onError?: (e: Error) => void): Unsub
  watchDoc<T>(path: DocPath, cb: (doc: T | null) => void, onError?: (e: Error) => void): Unsub
  getDoc<T>(path: DocPath): Promise<T | null>
  setDoc(path: DocPath, data: object): Promise<void>
  add<K extends ColName>(col: K, data: Omit<Collections[K], 'id'>): Promise<string>
  update<K extends ColName>(col: K, id: string, patch: Partial<Collections[K]>): Promise<void>
  updateMany<K extends ColName>(col: K, ids: string[], patch: Partial<Collections[K]>): Promise<void>
  remove(col: ColName, id: string): Promise<void>
}

export const isDemo = import.meta.env.VITE_DEMO === 'true' || !import.meta.env.VITE_FIREBASE_API_KEY

export async function createBackend(): Promise<Backend> {
  if (isDemo) return (await import('./demoBackend')).demoBackend()
  return (await import('./firebaseBackend')).firebaseBackend()
}
