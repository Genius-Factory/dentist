export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export const money = (cents) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
export function presetRange(preset) {
  const end = new Date()
  const start = new Date(end)
  if (preset === 'Week') start.setDate(start.getDate() - (start.getDay() + 6) % 7)
  if (preset === 'Month') start.setDate(1)
  if (preset === 'Year') start.setMonth(0, 1)
  return { start: localDate(start), end: localDate(end) }
}
