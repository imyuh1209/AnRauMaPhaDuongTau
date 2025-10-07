import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// Lấy danh sách loại mủ
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM rubber_type ORDER BY id');
    res.json(rows);
  } catch (e) { next(e); }
});

// Tạo loại mủ mới
router.post('/', async (req, res, next) => {
  try {
    const { code, description, unit } = req.body;
    if (!code || !unit) {
      return res.status(400).json({ error: 'code và unit là bắt buộc' });
    }
    await pool.query(
      `INSERT INTO rubber_type (code, description, unit) VALUES (?,?,?)`,
      [code.trim(), description || null, unit.trim()]
    );
    res.status(201).json({ message: 'saved' });
  } catch (e) { next(e); }
});

export default router;
