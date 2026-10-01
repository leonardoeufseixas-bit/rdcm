import { initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import type { Backend } from './backend'

export function firebaseBackend(): Backend {
  const env = import.meta.env
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  })
  const auth = getAuth(app)
  // cache local: o app continua abrindo e lançando sem sinal; sincroniza quando voltar
  const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })

  return {
    demo: false,
    onAuth: (cb) =>
      onAuthStateChanged(auth, (u) =>
        cb(u ? { uid: u.uid, email: u.email || '', nome: u.displayName || u.email?.split('@')[0] || '' } : null),
      ),
    signIn: async (email, senha) => {
      await signInWithEmailAndPassword(auth, email, senha)
    },
    signUp: async (nome, email, senha) => {
      const cred = await createUserWithEmailAndPassword(auth, email, senha)
      await updateProfile(cred.user, { displayName: nome })
    },
    resetPassword: (email) => sendPasswordResetEmail(auth, email),
    signOut: () => signOut(auth),
    watchCol: (col, filter, cb, onError) => {
      const ref = collection(db, col)
      const q = filter ? query(ref, where(filter.field, '==', filter.value)) : ref
      return onSnapshot(
        q,
        (snap) => cb(snap.docs.map((d) => ({ ...(d.data() as object), id: d.id }) as never)),
        (e) => onError?.(e),
      )
    },
    watchDoc: (path, cb, onError) =>
      onSnapshot(
        doc(db, ...path),
        (d) => cb(d.exists() ? ({ ...d.data(), id: d.id } as never) : null),
        (e) => onError?.(e),
      ),
    getDoc: async (path) => {
      const d = await getDoc(doc(db, ...path))
      return d.exists() ? ({ ...d.data(), id: d.id } as never) : null
    },
    setDoc: (path, data) => setDoc(doc(db, ...path), data),
    add: async (col, data) => (await addDoc(collection(db, col), data)).id,
    update: (col, id, patch) => updateDoc(doc(db, col, id), patch as never),
    updateMany: async (col, ids, patch) => {
      for (let i = 0; i < ids.length; i += 450) {
        const b = writeBatch(db)
        ids.slice(i, i + 450).forEach((id) => b.update(doc(db, col, id), patch as never))
        await b.commit()
      }
    },
    remove: (col, id) => deleteDoc(doc(db, col, id)),
  }
}
