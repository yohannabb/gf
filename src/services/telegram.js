export const tg = window.Telegram?.WebApp || null

export function initTelegram() {
  if (!tg) return
  tg.ready()
  tg.expand()
  // stops the app from closing when the user scrolls inside sheets
  tg.disableVerticalSwipes?.()
}

export const haptic = (kind = 'light') => tg?.HapticFeedback?.impactOccurred?.(kind)

export function shareInvite(link, text) {
  const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`
  if (tg?.openTelegramLink) tg.openTelegramLink(url)
  else window.open(url, '_blank')
}

// Confirm dialog that works inside Telegram and in a normal browser
export function ask(message) {
  return new Promise((resolve) => {
    if (tg?.showConfirm) tg.showConfirm(message, (ok) => resolve(!!ok))
    else resolve(window.confirm(message))
  })
}
