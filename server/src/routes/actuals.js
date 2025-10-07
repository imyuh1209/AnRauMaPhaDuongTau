import { Router } from 'express';
import { pool } from '../db.js';
const router = Router();

// Lưu thẳng 1 bản ghi actual (upsert theo farm_id/plot_id/rubber_type_id/date)
router.post('/', async (req, res, next) => {
  try {
    const { date, farm_id, plot_id, rubber_type_id, qty, note } = req.body;
    if (!date || !farm_id || !rubber_type_id) {
      return res.status(400).json({ error: 'Thiếu date, farm_id, rubber_type_id' });
    }
    await pool.query(
      `INSERT INTO actual (farm_id, plot_id, rubber_type_id, date, qty, source, note)
       VALUES (?,?,?,?,?,'manual',?)
       ON DUPLICATE KEY UPDATE qty=VALUES(qty), note=VALUES(note)`,
      [Number(farm_id), plot_id ? Number(plot_id) : null, Number(rubber_type_id), date, Number(qty||0), note || null]
    );
    res.status(201).json({ message: 'saved' });
  } catch (e) { next(e); }
});

export default router;
