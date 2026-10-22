const validator = require('validator')
const isValidPassword = senha => typeof senha === 'string' && senha.length >= 8
function isAllowedUserEmail(email) {
  if (typeof email !== 'string') return false
  const normalized = email.trim().toLowerCase()
  return validator.isEmail(normalized) && ['gmail.com', 'hotmail.com', 'outlook.com'].includes(normalized.split('@')[1])
}
module.exports = { isValidPassword, isAllowedUserEmail }
