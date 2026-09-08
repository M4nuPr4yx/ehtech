const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');

// Fallback seguro em memória caso API_SEGREDO não esteja no .env
let fallbackSecret = null;

function getApiSecret() {
  if (process.env.API_SEGREDO && process.env.API_SEGREDO.trim() !== '' && process.env.API_SEGREDO !== 'defaultsecret') {
    return process.env.API_SEGREDO.trim();
  }

  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    throw new Error('API_SEGREDO deve ser configurado com uma chave exclusiva em produção');
  }

  if (!fallbackSecret) {
    fallbackSecret = crypto.randomBytes(32).toString('hex');
    console.warn('\n⚠️ [SEGURANÇA] API_SEGREDO não definido ou usando valor padrão no .env.');
    console.warn('⚠️ [SEGURANÇA] Foi gerada uma chave temporária segura para esta sessão.\n');
  }

  return fallbackSecret;
}

function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ mensagem: 'Token não fornecido', error: 'Token não fornecido' });
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ mensagem: 'Formato de token inválido. Use: Bearer <token>', error: 'Formato inválido' });
  }

  const token = parts[1];

  jwt.verify(token, getApiSecret(), { algorithms: ['HS256'] }, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({
          mensagem: 'Sessão expirada. Faça login novamente.',
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(403).json({
        mensagem: 'Token inválido ou sessão encerrada.',
        error: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }

    req.user = decoded;
    next();
  });
}

async function verifyAdmin(req, res, next) {
  autenticarToken(req, res, async () => {
    try {
      if (!req.user || !req.user.email) {
        return res.status(403).json({ mensagem: 'Acesso admin requerido' });
      }

      const [rows] = await pool.execute(
        'SELECT id_usuario, email, role FROM usuarios WHERE id_usuario = ? AND email = ?',
        [req.user.id, req.user.email]
      );

      if (rows.length === 0 || rows[0].role !== 'admin') {
        return res.status(403).json({ mensagem: 'Acesso restrito a administradores' });
      }

      req.user.role = 'admin';
      next();
    } catch (error) {
      console.error('[auth] Erro ao validar admin:', error.message);
      return res.status(500).json({ mensagem: 'Erro interno ao validar permissões' });
    }
  });
}

module.exports = {
  getApiSecret,
  autenticarToken,
  verifyAdmin
};
