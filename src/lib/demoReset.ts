export const DEMO_KEY = 'rdcm_demo_v2'

export function resetDemo() {
  localStorage.removeItem(DEMO_KEY)
  location.reload()
}
