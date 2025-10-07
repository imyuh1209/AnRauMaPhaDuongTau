import { Router } from 'express';
import { pool } from '../db.js';
const router = Router();

// Tạo 1 dòng kế hoạch (version=1)
router.post('/', async (req, res, next) => {
  try {
    const { farm_id, plot_id, rubber_type_id, period_type, period_key, planned_qty, note } = req.body;
    if (!farm_id || !rubber_type_id || !period_type || !period_key) {
      return res.status(400).json({ error: 'Thiếu trường bắt buộc' });
    }
    await pool.query(
      `INSERT INTO plan (farm_id, plot_id, rubber_type_id, period_type, period_key, version, planned_qty, note)
       VALUES (?,?,?,?,?,?,?,?)`,
      [Number(farm_id), plot_id ? Number(plot_id) : null, Number(rubber_type_id),
       period_type, period_key, 1, Number(planned_qty||0), note || null]
    );
    res.status(201).json({ message: 'created' });
  } catch (e) { next(e); }
});

export default router;
