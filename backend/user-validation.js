const validator = require('validator')
const { hasVisibleText } = require('./validation')
const passwordValidationMessage = 'Use uma senha de pelo menos 8 caracteres, com caracteres visíveis e sem ultrapassar o limite de tamanho.'
const isValidPassword = senha => typeof senha === 'string' && senha.length >= 8 &&
  Buffer.byteLength(senha, 'utf8') <= 1024 && !/[\p{Cc}\p{Cs}]/u.test(senha) && hasVisibleText(senha)
function isAllowedUserEmail(email) {
  if (typeof email !== 'string') return false
  const normalized = email.trim().toLowerCase()
  return validator.isEmail(normalized) && ['gmail.com', 'hotmail.com', 'outlook.com'].includes(normalized.split('@')[1])
}
module.exports = { isValidPassword, isAllowedUserEmail, passwordValidationMessage }
