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
  if (token.length > 8192) return res.status(403).json({ mensagem: 'Token inválido.', code: 'INVALID_TOKEN' });

  jwt.verify(token, getApiSecret(), { algorithms: ['HS256'] }, async (err, decoded) => {
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

    if (!Number.isSafeInteger(Number(decoded?.id)) || Number(decoded.id) <= 0 || typeof decoded.email !== 'string') {
      return res.status(403).json({ mensagem: 'Token inválido.', code: 'INVALID_TOKEN' });
    }
    try {
      const [users] = await pool.execute('SELECT id_usuario, username, email, role, session_version FROM usuarios WHERE id_usuario = ? AND email = ?', [decoded.id, decoded.email]);
      if (!users.length || (decoded.session_version ?? 0) !== Number(users[0].session_version)) return res.status(403).json({ mensagem: 'Sessão encerrada. Faça login novamente.', code: 'INVALID_TOKEN' });
      req.user = { ...decoded, username: users[0].username, role: users[0].role };
      next();
    } catch (error) {
      console.error('[auth] Erro ao validar sessão:', error.message);
      return res.status(503).json({ mensagem: 'Não foi possível validar sua sessão. Tente novamente.' });
    }
  });
}

async function verifyAdmin(req, res, next) {
  autenticarToken(req, res, async () => {
    if (req.user.role !== 'admin') return res.status(403).json({ mensagem: 'Acesso restrito a administradores' });
    next();
  });
}

module.exports = {
  getApiSecret,
  autenticarToken,
  verifyAdmin
};
