function integer(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return NaN
  if (typeof value === 'string' && !/^\d+$/.test(value.trim())) return NaN
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : NaN
}

function money(value, { min = 0.01, max = 99999999.99 } = {}) {
  if (typeof value !== 'number' && typeof value !== 'string') return NaN
  if (typeof value === 'string' && !/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) return NaN
  const parsed = typeof value === 'string' ? Number(value.replace(',', '.')) : value
  return parsed >= min && parsed <= max && Number(parsed.toFixed(2)) === parsed ? parsed : NaN
}

function hasVisibleText(value) {
  return /[^\p{White_Space}\p{Default_Ignorable_Code_Point}]/u.test(value)
}

function truncateText(value, maxLength) {
  return value.slice(0, maxLength).replace(/[\uD800-\uDBFF]$/, '')
}

function cleanText(value, maxLength, { multiline = false } = {}) {
  if (typeof value !== 'string' || /[\p{Bidi_Control}\p{Cs}\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u.test(value)) return null
  if (!multiline && /[\t\n\r\u2028\u2029]/u.test(value)) return null
  const cleaned = truncateText(value.trim(), maxLength).trimEnd()
  return hasVisibleText(cleaned) ? cleaned : ''
}

module.exports = { integer, money, hasVisibleText, truncateText, cleanText }
