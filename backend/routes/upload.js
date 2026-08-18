const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { autenticarToken } = require('../middleware/auth');

const uploadsDir = path.resolve(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Extensões e MIME types estritamente permitidos (rejeita .svg, .html, .php, etc.)
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.jpg';
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `img-${uniqueSuffix}${safeExt}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ALLOWED_MIME_TYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Use apenas imagens JPG, PNG ou WEBP.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
    files: 1
  }
});

// Middleware auxiliar para capturar erros de Multer
function handleMulterError(uploadMiddleware) {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ erro: 'Arquivo muito grande. O limite máximo é de 5MB.' });
        }
        return res.status(400).json({ erro: `Erro no upload: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ erro: err.message || 'Erro ao processar arquivo.' });
      }
      next();
    });
  };
}

const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo por arquivo
    files: 8 // Até 8 imagens simultâneas
  }
});

// POST /upload/imagem - Upload autenticado de imagem única
router.post('/imagem', autenticarToken, handleMulterError(upload.single('imagem')), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhuma imagem enviada' });
    }

    const imagemUrl = `/uploads/${req.file.filename}`;

    return res.json({
      sucesso: true,
      url: imagemUrl,
      filename: req.file.filename,
      tamanho: req.file.size,
      tipo: req.file.mimetype
    });
  } catch (error) {
    console.error('[upload] Erro ao processar upload:', error.message);
    return res.status(500).json({ erro: 'Erro interno ao salvar arquivo' });
  }
});

// POST /upload/imagens - Upload autenticado de múltiplas imagens (até 8)
router.post('/imagens', autenticarToken, handleMulterError(uploadMultiple.array('imagens', 8)), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ erro: 'Nenhuma imagem enviada' });
    }

    const uploaded = req.files.map((file) => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      tamanho: file.size,
      tipo: file.mimetype
    }));

    const urls = uploaded.map(u => u.url);

    return res.json({
      sucesso: true,
      urls,
      arquivos: uploaded,
      total: urls.length
    });
  } catch (error) {
    console.error('[upload/imagens] Erro ao processar upload múltiplo:', error.message);
    return res.status(500).json({ erro: 'Erro interno ao salvar arquivos' });
  }
});

// POST /upload/imagem-base64 - Upload autenticado de Base64 com validação estrita
router.post('/imagem-base64', autenticarToken, async (req, res) => {
  try {
    const { imagem } = req.body;

    if (!imagem || typeof imagem !== 'string') {
      return res.status(400).json({ erro: 'Imagem base64 não fornecida' });
    }

    // Aceita apenas tipos de imagem seguros
    const match = imagem.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
    if (!match) {
      return res.status(400).json({ erro: 'Formato base64 inválido ou tipo de imagem não suportado. Use JPG, PNG ou WEBP.' });
    }

    const format = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
    const ext = `.${format}`;
    const base64Data = match[2];

    const buffer = Buffer.from(base64Data, 'base64');

    // Limite estrito de 5MB
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ erro: 'Imagem excede o limite de 5MB' });
    }

    const filename = `img-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const filepath = path.resolve(uploadsDir, filename);

    // Validação de escape de diretório
    if (!filepath.startsWith(uploadsDir + path.sep)) {
      return res.status(400).json({ erro: 'Caminho de gravação inválido' });
    }

    fs.writeFileSync(filepath, buffer);

    const imagemUrl = `/uploads/${filename}`;

    return res.json({
      sucesso: true,
      url: imagemUrl,
      filename,
      tamanho: buffer.length
    });
  } catch (error) {
    console.error('[upload-base64] Erro:', error.message);
    return res.status(500).json({ erro: 'Erro interno ao processar imagem base64' });
  }
});

// POST /upload/imagem-url - Salva referência de URL de imagem externa validada
router.post('/imagem-url', autenticarToken, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ erro: 'URL não fornecida' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url.trim());
    } catch {
      return res.status(400).json({ erro: 'URL inválida' });
    }

    // Apenas protocolos HTTP e HTTPS
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ erro: 'Protocolo de URL inválido. Use http ou https.' });
    }

    // Validar extensão de imagem na URL
    const pathname = parsedUrl.pathname.toLowerCase();
    const hasValidExt = Array.from(ALLOWED_EXTENSIONS).some(ext => pathname.endsWith(ext));
    if (!hasValidExt && !url.includes('/uploads/')) {
      return res.status(400).json({ erro: 'URL deve apontar para uma imagem válida (.jpg, .jpeg, .png, .webp)' });
    }

    return res.json({
      sucesso: true,
      url: parsedUrl.toString(),
      tipo: 'url_externa'
    });
  } catch (error) {
    console.error('[upload-url] Erro:', error.message);
    return res.status(500).json({ erro: 'Erro ao validar URL' });
  }
});

// DELETE /upload/imagem/:filename - Remoção segura contra Path Traversal
router.delete('/imagem/:filename', autenticarToken, async (req, res) => {
  try {
    const rawFilename = req.params.filename;
    if (!rawFilename || typeof rawFilename !== 'string') {
      return res.status(400).json({ erro: 'Nome de arquivo obrigatório' });
    }

    // Extrai estritamente o basename para eliminar qualquer ../ ou caracteres de caminho
    const safeFilename = path.basename(rawFilename);
    const targetPath = path.resolve(uploadsDir, safeFilename);

    // Garante que o arquivo está estritamente dentro da pasta uploads
    if (!targetPath.startsWith(uploadsDir + path.sep)) {
      return res.status(400).json({ erro: 'Tentativa de acesso a caminho inválido' });
    }

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      return res.json({ sucesso: true, mensagem: 'Arquivo removido com sucesso' });
    } else {
      return res.status(404).json({ erro: 'Arquivo não encontrado' });
    }
  } catch (error) {
    console.error('[upload] Erro ao remover arquivo:', error.message);
    return res.status(500).json({ erro: 'Erro interno ao remover arquivo' });
  }
});

module.exports = router;
