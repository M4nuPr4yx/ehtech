const foto = '/profile/default-environment.webp'
const fotos = Object.freeze([
  foto,
  '/profile/environment-clouds.webp',
  '/profile/environment-sunset.webp',
  '/profile/environment-forest.webp',
  '/profile/environment-autumn.webp',
  '/profile/environment-waterfall.webp'
])
const isDefaultProfilePhoto = value => fotos.includes(value)
function defaultProfilePhoto(accountId) {
  const id = Number(accountId)
  return fotos[Number.isSafeInteger(id) && id > 0 ? (id - 1) % fotos.length : 0]
}
function profilePhoto(user) {
  return user.foto && !isDefaultProfilePhoto(user.foto) ? user.foto : defaultProfilePhoto(user.id_usuario)
}
module.exports = { foto, fotos, isDefaultProfilePhoto, defaultProfilePhoto, profilePhoto }
