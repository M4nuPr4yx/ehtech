const mysql = require('mysql2/promise');
require('dotenv').config();

// Detecta se a string de conexão é PostgreSQL / Neon
const connectionUri = (
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRESQL_URL ||
  process.env.MYSQL_URL ||
  process.env.CLEARDB_DATABASE_URL ||
  ''
).trim();

const isPostgres = 
  connectionUri.startsWith('postgres://') ||
  connectionUri.startsWith('postgresql://') ||
  Boolean(process.env.POSTGRES_URL) ||
  Boolean(process.env.PGHOST) ||
  (process.env.DB_HOST && process.env.DB_HOST.includes('neon.tech'));

let poolInstance;

if (isPostgres) {
  const { Pool } = require('pg');
  console.log('[EHtech DB] Modo PostgreSQL / Neon detectado.');

  const pgPool = connectionUri
    ? new Pool({
        connectionString: connectionUri,
        ssl: { rejectUnauthorized: false }
      })
    : new Pool({
        host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
        user: process.env.DB_USER || process.env.PGUSER || 'postgres',
        password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
        database: process.env.DB_DATABASE || process.env.PGDATABASE || 'ehtech',
        port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432', 10),
        ssl: { rejectUnauthorized: false }
      });

  // Tradutor de queries MySQL -> PostgreSQL (placeholders ?, DDL, RETURNING)
  function convertSqlForPostgres(sql) {
    let converted = sql;
    const insertIgnore = /^\s*INSERT\s+IGNORE\s+INTO/i.test(converted);
    const ratingUpsert = /ON\s+DUPLICATE\s+KEY\s+UPDATE\s+nota/i.test(converted);

    if (/create\s+table/i.test(converted)) {
      converted = converted
        .replace(/id_usuario\s+INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'id_usuario SERIAL PRIMARY KEY')
        .replace(/id_produto\s+INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'id_produto SERIAL PRIMARY KEY')
        .replace(/id\s+INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'id SERIAL PRIMARY KEY')
        .replace(/INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'SERIAL PRIMARY KEY')
        .replace(/AUTO_INCREMENT/gi, '')
        .replace(/LONGTEXT/gi, 'TEXT')
        .replace(/DATETIME/gi, 'TIMESTAMP')
        .replace(/UNIQUE\s+KEY\s+(\w+)\s*\(([^)]+)\)/gi, 'UNIQUE ($2)')
        .replace(/\s+ON\s+UPDATE\s+CURRENT_TIMESTAMP/gi, '')
        .replace(/,\s*INDEX\s+\w+\s*\([^)]+\)/gi, '')
        .replace(/INDEX\s+\w+\s*\([^)]+\),?/gi, '')
        .replace(/,\s*\)/g, '\n)');
    }

    converted = converted.replace(/^\s*INSERT\s+IGNORE\s+INTO/i, 'INSERT INTO');
    if (ratingUpsert) {
      converted = converted.replace(
        /ON\s+DUPLICATE\s+KEY\s+UPDATE\s+nota\s*=\s*\?,\s*comentario\s*=\s*\?/i,
        'ON CONFLICT (produto_id, avaliador_id) DO UPDATE SET nota = EXCLUDED.nota, comentario = EXCLUDED.comentario'
      );
    } else if (insertIgnore) {
      converted = converted.trim().replace(/;?$/, '') + ' ON CONFLICT DO NOTHING';
    }

    // Se for INSERT sem RETURNING, anexa RETURNING para obter o ID gerado
    if (/^\s*INSERT\s+INTO/i.test(converted) && !/RETURNING/i.test(converted)) {
      converted = converted.trim().replace(/;?$/, '') + ' RETURNING *';
    }

    // Converte ? em $1, $2, $3...
    let idx = 1;
    converted = converted.replace(/\?/g, () => `$${idx++}`);

    return converted;
  }

  // Wrapper compatível com a interface do mysql2/promise ([rows, fields])
  const universalExecute = async (sql, params = []) => {
    if (/ON\s+DUPLICATE\s+KEY\s+UPDATE\s+nota/i.test(sql)) params = params.slice(0, 4);
    const translatedSql = convertSqlForPostgres(sql);
    const res = await pgPool.query(translatedSql, params);
    const isSelect = /^\s*SELECT/i.test(translatedSql);
    const rows = res.rows || [];

    const firstRow = rows[0] || {};
    const insertId = firstRow.id_produto || firstRow.id_usuario || firstRow.id_servico || firstRow.id_contratacao || firstRow.id_pedido || firstRow.id_item || firstRow.id || null;

    if (isSelect) {
      return [rows, res.fields];
    }

    // Para INSERT / UPDATE / DELETE / CREATE
    const resultObj = {
      insertId,
      affectedRows: res.rowCount,
      ...firstRow
    };

    // Permite tanto [result] quanto result[0] ou rows[0]
    const finalRows = [resultObj];
    finalRows.insertId = insertId;
    finalRows.affectedRows = res.rowCount;

    return [finalRows, res.fields];
  };

  poolInstance = {
    execute: universalExecute,
    query: universalExecute,
    getConnection: async () => {
      const client = await pgPool.connect();
      return {
        release: () => client.release(),
        execute: universalExecute,
        query: universalExecute
      };
    },
    testConnection: async () => {
      try {
        const client = await pgPool.connect();
        client.release();
        return { ok: true, type: 'postgres' };
      } catch (err) {
        return { ok: false, error: err.message, type: 'postgres' };
      }
    }
  };
} else {
  // Modo MySQL (padrão local ou MySQL na nuvem)
  console.log('[EHtech DB] Modo MySQL detectado.');

  const getMySQLConfig = () => {
    if (connectionUri) {
      return {
        uri: connectionUri,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
      };
    }

    const host = process.env.DB_HOST || process.env.DB_LOCAL || 'localhost';
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    
    let sslOption = undefined;
    if (process.env.DB_SSL === 'true' || (!isLocalhost && process.env.DB_SSL !== 'false')) {
      sslOption = { rejectUnauthorized: false };
    }

    return {
      host,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'ehtech',
      port: parseInt(process.env.DB_PORT || process.env.DB_PORTA || '3306', 10),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      ssl: sslOption
    };
  };

  const poolConfig = getMySQLConfig();
  const rawPool = poolConfig.uri 
    ? mysql.createPool(poolConfig.uri) 
    : mysql.createPool(poolConfig);

  poolInstance = rawPool;
  poolInstance.testConnection = async () => {
    try {
      const connection = await rawPool.getConnection();
      connection.release();
      return { ok: true, type: 'mysql' };
    } catch (err) {
      return { ok: false, error: err.message, type: 'mysql' };
    }
  };
}

module.exports = poolInstance;
