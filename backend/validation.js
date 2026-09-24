function integer(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return NaN
  if (typeof value === 'string' && !/^\d+$/.test(value.trim())) return NaN
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : NaN
}

function money(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return NaN
  if (typeof value === 'string' && !/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return NaN
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 99999999.99 ? parsed : NaN
}

module.exports = { integer, money }
