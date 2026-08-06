-- --------------------------------------------------------
-- Servidor:                     127.0.0.1
-- Versão do servidor:           10.4.32-MariaDB - mariadb.org binary distribution
-- OS do Servidor:               Win64
-- HeidiSQL Versão:              12.10.0.7000
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Copiando estrutura do banco de dados para ehtech
DROP DATABASE IF EXISTS `ehtech`;
CREATE DATABASE IF NOT EXISTS `ehtech` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin */;
USE `ehtech`;

-- Copiando estrutura para tabela ehtech.avaliacoes
DROP TABLE IF EXISTS `avaliacoes`;
CREATE TABLE IF NOT EXISTS `avaliacoes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `produto_id` int(11) NOT NULL,
  `avaliador_id` int(11) NOT NULL,
  `nota` int(11) NOT NULL,
  `comentario` text DEFAULT NULL,
  `data_avaliacao` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_avaliacao` (`produto_id`,`avaliador_id`),
  KEY `idx_produto` (`produto_id`),
  KEY `idx_avaliador` (`avaliador_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Copiando dados para a tabela ehtech.avaliacoes: ~2 rows (aproximadamente)
DELETE FROM `avaliacoes`;
INSERT INTO `avaliacoes` (`id`, `produto_id`, `avaliador_id`, `nota`, `comentario`, `data_avaliacao`) VALUES
	(1, 5, 20, 3, '~çççççççç', '2026-04-30 18:57:39'),
	(3, 8, 23, 5, 'wdsawdsawdaw', '2026-05-07 18:23:07'),
	(4, 9, 23, 5, 'qDAWDADADADWASDSA', '2026-05-07 20:01:45');

-- Copiando estrutura para tabela ehtech.pagamento
DROP TABLE IF EXISTS `pagamento`;
CREATE TABLE IF NOT EXISTS `pagamento` (
  `id_pagamento` int(11) NOT NULL AUTO_INCREMENT,
  `id_pedido` int(11) DEFAULT NULL,
  `forma_pag` varchar(30) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id_pagamento`),
  KEY `id_pedido` (`id_pedido`),
  CONSTRAINT `id_pedido` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id_pedido`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Copiando dados para a tabela ehtech.pagamento: ~0 rows (aproximadamente)
DELETE FROM `pagamento`;

-- Copiando estrutura para tabela ehtech.password_resets
DROP TABLE IF EXISTS `password_resets`;
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`),
  KEY `idx_token` (`token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Copiando dados para a tabela ehtech.password_resets: ~0 rows (aproximadamente)
DELETE FROM `password_resets`;

-- Copiando estrutura para tabela ehtech.notificacoes
DROP TABLE IF EXISTS `notificacoes`;
CREATE TABLE IF NOT EXISTS `notificacoes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `produto_id` int(11) DEFAULT NULL,
  `tipo` varchar(50) NOT NULL,
  `mensagem` text NOT NULL,
  `lida` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_notificacoes_usuario` (`usuario_id`),
  KEY `idx_notificacoes_lida` (`usuario_id`,`lida`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Copiando dados para a tabela ehtech.notificacoes: ~0 rows (aproximadamente)
DELETE FROM `notificacoes`;

-- Copiando estrutura para tabela ehtech.pedidos
DROP TABLE IF EXISTS `pedidos`;
CREATE TABLE IF NOT EXISTS `pedidos` (
  `id_pedido` int(11) NOT NULL AUTO_INCREMENT,
  `id_comprador` int(11) NOT NULL,
  `data` date NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT '',
  `valortotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id_pedido`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Copiando dados para a tabela ehtech.pedidos: ~0 rows (aproximadamente)
DELETE FROM `pedidos`;

-- Copiando estrutura para tabela ehtech.produtos
DROP TABLE IF EXISTS `produtos`;
CREATE TABLE IF NOT EXISTS `produtos` (
  `id_produto` int(11) NOT NULL AUTO_INCREMENT,
  `nome` longtext NOT NULL,
  `descricao` longtext NOT NULL,
  `preco` decimal(10,2) NOT NULL DEFAULT 0.00,
  `estoque` int(11) NOT NULL DEFAULT 0,
  `categoria` varchar(60) NOT NULL,
  `vendedor` varchar(60) NOT NULL,
  `imagem` text DEFAULT NULL,
  `vendedor_id` int(11) DEFAULT NULL,
  `status_aprovacao` varchar(20) NOT NULL DEFAULT 'pendente',
  PRIMARY KEY (`id_produto`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Copiando dados para a tabela ehtech.produtos: ~2 rows (aproximadamente)
DELETE FROM `produtos`;
INSERT INTO `produtos` (`id_produto`, `nome`, `descricao`, `preco`, `estoque`, `categoria`, `vendedor`, `imagem`, `vendedor_id`, `status_aprovacao`) VALUES
	(8, 'wadasdwad', 'sawdsawdd', 12121.21, 0, 'acessorios', 'Hugo', 'http://localhost:3000/uploads/img-1778174987698-473fc9a242ad.png', 20, 'aprovado'),
	(9, 'wadsawd', 'wadsawdsa', 1212121.21, 0, 'computadores', 'Hugo', 'http://localhost:3000/uploads/img-1778178129569-196468bb5bc8.png', 20, 'aprovado');

-- Copiando estrutura para tabela ehtech.usuarios
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id_usuario` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(50) DEFAULT NULL,
  `senha` longtext DEFAULT NULL,
  `role` varchar(20) DEFAULT NULL,
  `data_criacao` datetime DEFAULT current_timestamp(),
  `foto` varchar(1024) DEFAULT NULL,
  `username` varchar(50) DEFAULT NULL,
  `nome` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Copiando dados para a tabela ehtech.usuarios: ~8 rows (aproximadamente)
DELETE FROM `usuarios`;
INSERT INTO `usuarios` (`id_usuario`, `email`, `senha`, `role`, `data_criacao`, `foto`, `username`, `nome`) VALUES
	(17, 'emanuel@email.com', '$2b$10$/nAXxHvX5hbxf3TQUBSpp.FVx/n6WFwa0zLckFCVH6G0UpcnHdlq6', 'user', '2026-04-30 10:52:06', NULL, NULL, NULL),
	(18, 'hugo@email.com', '$2b$10$KsfUsjEKsOa6FslGWVq22uGdgMAnWUz.CikH.VphHHrj9vX3Ajxlu', 'user', '2026-04-30 10:52:06', 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wgARCAINAqcDASIAAhEBAxEB/8QAHAAAAgMBAQEBAAAAAAAAAAAAAgMAAQQFBgcI/8QAGAEBAQEBAQAAAAAAAAAAAAAAAAECAwT/2gAMAwEAAhADEAAAAdeVPE5PqOv5f7mXr0QRSmKizW9GUcpdwqCjsTTaE2yxVOqMS9ipcVayObn7qI4OnbddA4dAl2ZboApue0tRVKxpsRcjYkENFqGRUHRMHCFUVLoYsZBWN1KirDGq1ACqQhBFh8ka1CkHebOqCsTqA', NULL, NULL),
	(19, 'hugo@email.com', '$2b$10$i/rv5kZmW6Vdo/gcvQK6eOuy9gxcBJ1/4UR5VTlMVld2ug9wkcYwu', 'user', '2026-04-30 10:54:52', 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wgARCAINAqcDASIAAhEBAxEB/8QAHAAAAgMBAQEBAAAAAAAAAAAAAgMAAQQFBgcI/8QAGAEBAQEBAQAAAAAAAAAAAAAAAAECAwT/2gAMAwEAAhADEAAAAdeVPE5PqOv5f7mXr0QRSmKizW9GUcpdwqCjsTTaE2yxVOqMS9ipcVayObn7qI4OnbddA4dAl2ZboApue0tRVKxpsRcjYkENFqGRUHRMHCFUVLoYsZBWN1KirDGq1ACqQhBFh8ka1CkHebOqCsTqA', NULL, NULL),
	(20, 'hugo@email1.com', '$2b$10$mlivcu6aN2LiYk0PDbB.9u609fMNlna57FsaJG1QlajYY5ZUS0xFO', 'user', '2026-04-30 15:36:08', 'http://localhost:3000/uploads/img-1778177721804-278c3306c301.jfif', 'Hugo', NULL),
	(21, 'maneli@email.com', '$2b$10$D5oQIC3O/yIV0og.yy.6cejf9f3yog4jctX02JKDp810iVtEi2gmy', 'user', '2026-04-30 16:05:24', 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxITEhUTEhAVFRAXEhUVFRAVEBAPEBAVFRUWFhUVFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OFxAQFSsZFRkrKystKystLS0tLS0tKysrNy03LS0tLS03Kzc3LS0tKy0rLS0rKystLS0rLSsrKysrK//AABEIAM0A9gMBIgACEQEDEQH/xAAcAAACAwEBAQEAAAAAAAAAAAAEBQIDBgABBwj/xABAEAABAwIEBAQDBQUGBwEAAAABAAIDBBEFEiExBiJBURNhcYEHMpEUI1Kx0UKSofDxFVRicoPBFyRDgpPS4Qj/xAAZAQADAQEBAAAAAAAAAAAAAAAAAQIDBAX/xAAjEQEBAAIDAQACAgMBAAAAAAAAAQIRAxIhMTJBBBMiI1EU/9oADAMBAAIRAxEAPwD5KaQ5cx37IZosU', 'Maneli', NULL),
	(22, 'admin@ehtech.com', '$2b$10$CVcySBStOZBzW2ckBy.m4.mX4U1s8mdhbJL2r9ZKiR0X2sj1R1/gi', 'admin', '2026-05-07 13:59:32', NULL, 'admin', NULL),
	(23, 'hugo2@email.com', '$2b$10$BBFL38FfMtXpydcg4P/CZe7BmYf35r0cu7qxYTyPW/cvbi5ViECw6', 'user', '2026-05-07 14:01:58', 'http://localhost:3000/uploads/img-1778177799944-aabb9d1722ab.jfif', 'Hugo2', NULL),
	(24, 'emanuelteste@email.com', '$2b$10$Gzaqwk6BNnvgwql1JWIE/uTS8ihDBH0ES7QVPhu8ChARZkwRAFBKy', 'user', '2026-05-07 16:07:09', NULL, 'emanuel', NULL),
	(25, 'teste@gmail.com', '$2b$10$.ekAo29sw1xz22rast3fG.2hZ9d1OlmH2.UHPzbgvOEgFFNB3HmyC', 'user', '2026-05-07 16:16:18', NULL, 'teste', NULL);

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
