const express = require('express')
const mysql = require('mysql2/promise')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const porta = 3000
const app = express()
require('dotenv').config()

const api_chave = process.env.API_SEGREDO || 'defaultsecret'
console.log('API Secret:', api_chave ? 'OK' : 'FALTA .env')

app.use(cors())
app.use(express.json())
const pool = require('./db')

app.listen(porta, () => {
  console.log(`Backend: localhost:${porta}`)
})

// Middleware verify admin
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ mensagem: 'Token requerido' })
    
    const decoded = jwt.verify(token, api_chave)
    const [rows] = await pool.execute('SELECT role FROM usuarios WHERE email = ?', [decoded.email])
    if (rows.length === 0 || rows[0].role !== 'admin') {
      return res.status(403).json({ mensagem: 'Acesso admin requerido' })
    }
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ mensagem: 'Token inválido' })
  }
}

// CADASTRO USER NORMAL
app.post("/cadastro", async (req, res) => {
  const { email, senha } = req.body
  if (email.length <= 3) return res.json({ mensagem: "Preencha o e-mail!" })
  if (senha.length <= 6) return res.json({ mensagem: "Senha min 7 dígitos!" })

  try {
    const hash = await bcrypt.hash(senha, 10)
    await pool.execute("INSERT INTO usuarios (email, senha, role) VALUES (?, ?, 'user') ON DUPLICATE KEY UPDATE role='user'", [email, hash])
    res.json({ mensagem: "Usuário criado!" })
  } catch (error) {
    console.log(error)
    res.json({ mensagem: "Erro cadastro" })
  }
})

// LOGIN USER
app.post("/login", async (req, res) => {
  const { email, senha } = req.body
  try {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [email])
    if (rows.length === 0) return res.json({ mensagem: "Email não encontrado" })

    const validou = await bcrypt.compare(senha, rows[0].senha)
    if (!validou) return res.json({ mensagem: "Senha inválida" })

    const token = jwt.sign({ email }, api_chave, { expiresIn: "1h" })
    res.json({ mensagem: "Login OK", token })
  } catch (error) {
    console.log(error)
    res.json({ mensagem: "Erro login" })
  }
})

// ADMIN LOGIN - cria se não existe
app.post("/admin/login", async (req, res) => {
  const { email, senha } = req.body
  if (email !== 'admin@ehtech.com' || senha !== 'admin123') {
    return res.json({ mensagem: "Credenciais admin inválidas" })
  }
  
  try {
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE email = ?', [email])
    if (rows.length === 0) {
      const hash = await bcrypt.hash(senha, 10)
      await pool.execute('INSERT INTO usuarios (email, senha, role) VALUES (?, ?, "admin")', [email, hash])
    } else if (rows[0].role !== 'admin') {
      await pool.execute('UPDATE usuarios SET role="admin" WHERE email = ?', [email])
    }
    
    const token = jwt.sign({ email, role: 'admin' }, api_chave, { expiresIn: "24h" })
    res.json({ mensagem: "Admin login OK", token })
  } catch (error) {
    console.log(error)
    res.json({ mensagem: "Erro admin login" })
  }
})

// ADMIN - List users
app.get("/admin/users", verifyAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id_usuario, email, role FROM usuarios')
    res.json(rows)
  } catch (error) {
    console.log(error)
    res.json({ mensagem: "Erro listar" })
  }
})

// ADMIN - Update user
app.put("/admin/users/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params
  const { email, role } = req.body
  try {
    await pool.execute('UPDATE usuarios SET email = ?, role = ? WHERE id_usuario = ?', [email, role, id])
    res.json({ mensagem: "User atualizado" })
  } catch (error) {
    console.log(error)
    res.json({ mensagem: "Erro update" })
  }
})

// ADMIN - Delete user
app.delete("/admin/users/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params
  try {
    await pool.execute('DELETE FROM usuarios WHERE id_usuario = ?', [id])
    res.json({ mensagem: "User deletado" })
  } catch (error) {
    console.log(error)
    res.json({ mensagem: "Erro delete" })
  }
})

console.log('Admin routes OK: /admin/login POST, /admin/users GET/PUT/DELETE')
