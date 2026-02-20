export function readStorage(key, fallback = '') {
  const value = localStorage.getItem(key)
  return value ?? fallback
}

export function writeStorage(key, value) {
  localStorage.setItem(key, value)
}

export function removeStorage(key) {
  localStorage.removeItem(key)
}
