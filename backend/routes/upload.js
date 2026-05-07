const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const pool = require('../db');

// ================================
// ABORDAGEM 1: UPLOAD DIRETO (Multer)
// Salva arquivo no disco/servidor
// ================================

// Configuração do Multer para upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    // Nome único: timestamp + hash aleatório + extensão
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `img-${uniqueSuffix}${ext}`);
  }
});

// Filtro: apenas imagens
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo inválido. Use: JPG, PNG, GIF ou WEBP'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  }
});

// POST /upload/imagem - Upload direto de arquivo
router.post('/imagem', upload.single('imagem'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhuma imagem enviada' });
    }

    // Monta a URL do arquivo
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imagemUrl = `${baseUrl}/uploads/${req.file.filename}`;

    console.log('[upload] Arquivo salvo:', req.file.filename);

    res.json({
      sucesso: true,
      url: imagemUrl,
      filename: req.file.filename,
      tamanho: req.file.size,
      tipo: req.file.mimetype
    });
  } catch (error) {
    console.error('[upload] Erro:', error.message);
    res.status(500).json({ erro: 'Erro ao processar upload' });
  }
});

// POST /upload/imagem-base64 - Recebe base64 e salva como arquivo
// Útil quando o frontend já tem a imagem em base64
router.post('/imagem-base64', async (req, res) => {
  try {
    const { imagem } = req.body; //expecta: "data:image/png;base64,iVBORw0KG..."

    if (!imagem || typeof imagem !== 'string') {
      return res.status(400).json({ erro: 'Imagem base64 não fornecida' });
    }

    // Extrai o tipo MIME e os dados base64
    const match = imagem.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ erro: 'Formato base64 inválido' });
    }

    const ext = match[1]; // png, jpeg, etc
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Limite de 5MB
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ erro: 'Imagem muito grande (máx 5MB)' });
    }

    // Salva no disco
    const filename = `img-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const filepath = path.join(__dirname, '../uploads', filename);
    require('fs').writeFileSync(filepath, buffer);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imagemUrl = `${baseUrl}/uploads/${filename}`;

    console.log('[upload-base64] Arquivo salvo:', filename, 'Tamanho:', buffer.length);

    res.json({
      sucesso: true,
      url: imagemUrl,
      filename,
      tamanho: buffer.length
    });
  } catch (error) {
    console.error('[upload-base64] Erro:', error.message);
    res.status(500).json({ erro: 'Erro ao processar imagem' });
  }
});

// ================================
// ABORDAGEM 2: ARMAZENAR URL
// Recebe URL externa e salva apenas a referência
// ================================

// POST /upload/imagem-url - Salva URL de imagem externa
router.post('/imagem-url', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ erro: 'URL não fornecida' });
    }

    // Valida URL básica
    const urlValida = url.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i);
    if (!urlValida) {
      return res.status(400).json({ erro: 'URL de imagem inválida' });
    }

    console.log('[upload-url] URL salva:', url);

    res.json({
      sucesso: true,
      url: url, // Apenas armazena a URL, não faz download
      tipo: 'url_externa'
    });
  } catch (error) {
    console.error('[upload-url] Erro:', error.message);
    res.status(500).json({ erro: 'Erro ao processar URL' });
  }
});

// DELETE /upload/imagem/:filename - Remove arquivo do disco
router.delete('/imagem/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, '../uploads', filename);

    if (require('fs').existsSync(filepath)) {
      require('fs').unlinkSync(filepath);
      console.log('[upload] Arquivo removido:', filename);
      res.json({ sucesso: true });
    } else {
      res.status(404).json({ erro: 'Arquivo não encontrado' });
    }
  } catch (error) {
    console.error('[upload] Erro ao remover:', error.message);
    res.status(500).json({ erro: 'Erro ao remover arquivo' });
  }
});

module.exports = router;
