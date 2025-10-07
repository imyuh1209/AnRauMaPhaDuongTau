// server/src/setup-db.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cho phép cấu hình file schema
const SCHEMA_FILE = process.env.SCHEMA_FILE || 'db/schema_mysql.sql';

// Các lỗi “đã tồn tại” sẽ bỏ qua để không dừng tiến trình
const NON_FATAL_CODES = new Set([
  'ER_DB_CREATE_EXISTS',        // DB đã tồn tại
  'ER_TABLE_EXISTS_ERROR',      // bảng đã tồn tại
  'ER_DUP_FIELDNAME',           // cột đã có
  'ER_DUP_KEYNAME',             // index/unique đã có
  'ER_CANNOT_ADD_FOREIGN',      // FK đã tồn tại (khi không check trước)
  'ER_TRG_ALREADY_EXISTS',      // trigger đã có (nếu bạn dùng)
]);

function splitSql(sqlText) {
  // Tách câu lệnh đơn giản theo dấu ; ở cuối dòng
  return sqlText
    .split(/;\s*[\r\n]+/g)
    .map(s => s.trim())
    .filter(Boolean);
}

export async function ensureDatabaseAndSchema() {
  const {
    DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME,
  } = process.env;

  if (!DB_HOST || !DB_USER || !DB_NAME) {
    throw new Error('Thiếu biến môi trường DB_HOST/DB_USER/DB_NAME');
  }

  // 1) Kết nối cấp server (chưa chọn DB) để đảm bảo DB tồn tại
  const serverConn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT || 3306),
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  // Tạo DB nếu chưa có (không xoá)
  await serverConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await serverConn.end();

  // 2) Kết nối đúng DB
  const pool = await mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT || 3306),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    connectionLimit: 5,
    multipleStatements: true,
    dateStrings: true,
  });

  // 3) Đọc & chạy schema “an toàn”
  const schemaPath = path.resolve(__dirname, '..', SCHEMA_FILE);
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Không tìm thấy file schema: ${schemaPath}`);
  }

  const raw = fs.readFileSync(schemaPath, 'utf8');
  const statements = splitSql(raw);

  console.log(`🔧 Áp dụng schema SAFE (không drop) – ${statements.length} câu`);
  let idx = 0;
  for (const sql of statements) {
    idx += 1;
    try {
      await pool.query(sql);
    } catch (e) {
      if (NON_FATAL_CODES.has(e?.code)) {
        // Lỗi “đã tồn tại” -> bỏ qua, log nhẹ cho biết
        console.log(`ℹ️  Bỏ qua (#${idx}) ${e.code}:`, sql.split('\n')[0]);
        continue;
      }
      console.error(`❌ Lỗi ở câu #${idx}: ${e?.code || e?.message}`);
      console.error('➡️ SQL:', sql);
      await pool.end();
      throw e;
    }
  }

  await pool.end();
  console.log('✅ Schema OK (SAFE) – dữ liệu giữ nguyên');
}
