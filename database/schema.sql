-- Schema sem dados de usuários, senhas, tokens ou uploads.
CREATE DATABASE IF NOT EXISTS ehtech CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
USE ehtech;

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha LONGTEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
  foto VARCHAR(1024) DEFAULT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  nome VARCHAR(255) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS produtos (
  id_produto INT AUTO_INCREMENT PRIMARY KEY,
  nome LONGTEXT NOT NULL,
  descricao LONGTEXT NOT NULL,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  estoque INT NOT NULL DEFAULT 0,
  categoria VARCHAR(60) NOT NULL,
  vendedor VARCHAR(60) NOT NULL,
  imagem TEXT DEFAULT NULL,
  vendedor_id INT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS pedidos (
  id_pedido INT AUTO_INCREMENT PRIMARY KEY,
  id_comprador INT NOT NULL,
  data DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT '',
  valortotal DECIMAL(10,2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS pagamento (
  id_pagamento INT AUTO_INCREMENT PRIMARY KEY,
  id_pedido INT DEFAULT NULL,
  forma_pag VARCHAR(30) DEFAULT NULL,
  status VARCHAR(20) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_token (token_hash)
);

CREATE TABLE IF NOT EXISTS avaliacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  produto_id INT NOT NULL,
  avaliador_id INT NOT NULL,
  nota INT NOT NULL,
  comentario TEXT DEFAULT NULL,
  data_avaliacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_avaliacao (produto_id, avaliador_id),
  INDEX idx_produto (produto_id),
  INDEX idx_avaliador (avaliador_id)
);
