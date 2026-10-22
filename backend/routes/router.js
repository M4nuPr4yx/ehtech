const express = require('express')
const { integer } = require('../validation')
module.exports = function createRouter() {
  const router = express.Router()
  for (const name of ['id', 'outroUsuarioId']) router.param(name, (req, res, next, value) => {
    if (!(integer(value) > 0)) return res.status(400).json({ mensagem: 'Identificador inválido.' })
    next()
  })
  return router
}
