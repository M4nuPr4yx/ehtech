-- Migration: Atualizar colunas de imagem para LONGTEXT (suporta base64 grande)
-- Execute este SQL no seu banco MySQL
-- Aplica-se se colunas forem TEXT (limitado a ~65KB) ou VARCHAR

-- Verificar tipo atual:
-- DESCRIBE produtos;
-- DESCRIBE usuarios;

-- 1. Alterar coluna 'imagem' em produtos para LONGTEXT (suporta até 4GB)
ALTER TABLE produtos MODIFY COLUMN imagem LONGTEXT;

-- 2. Alterar coluna 'foto' em usuarios para LONGTEXT
ALTER TABLE usuarios MODIFY COLUMN foto LONGTEXT;

-- 3. Adicionar colunas que podem estar faltando (IF NOT EXISTS não funciona no MySQL comum, use procedimentos)
-- Para adicionar apenas se não existir, use:
-- ALTER TABLE usuarios ADD COLUMN nome VARCHAR(255) AFTER role;
-- ALTER TABLE usuarios ADD COLUMN data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP AFTER nome;
-- ALTER TABLE usuarios ADD COLUMN username VARCHAR(50) UNIQUE AFTER data_criacao;
-- ALTER TABLE produtos ADD COLUMN vendedor_id INT AFTER vendedor;
