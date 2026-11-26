export const fmt = (n) => Number(n).toLocaleString('en-US')
export const pad4 = (n) => String(n).padStart(4, '0')
export const two = (n) => String(n).padStart(2, '0')
export const timeAgo = (d) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(d)) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}
