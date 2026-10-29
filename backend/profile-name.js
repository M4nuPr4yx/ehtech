const NAME_MESSAGE = 'Informe um nome de 2 a 80 caracteres, sem símbolos de marcação ou caracteres de controle.'
function normalizeProfileName(value) {
  if (typeof value !== 'string' || value.length > 240 || /[<>\p{Cc}\p{Cf}]/u.test(value)) return null
  const name = value.normalize('NFC').trim().replace(/\s+/gu, ' ')
  return [...name].length >= 2 && [...name].length <= 80 ? name : null
}
module.exports = { normalizeProfileName, NAME_MESSAGE }
