// server/src/routes/plots.js
import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// GET /api/plots?farm_id=1
router.get('/', async (req, res, next) => {
  try {
    const farm_id = Number(req.query.farm_id);
    if (!farm_id) return res.status(400).json({ error: 'farm_id là bắt buộc' });
    const [rows] = await pool.query(
      'SELECT * FROM plot WHERE farm_id=? ORDER BY code',
      [farm_id]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/plots
router.post('/', async (req, res, next) => {
  try {
    const { farm_id, code, planting_year, area_ha, clone, tapping_start_date } = req.body;
    if (!farm_id || !code) {
      return res.status(400).json({ error: 'farm_id, code là bắt buộc' });
    }
    await pool.query(
      `INSERT INTO plot (farm_id, code, planting_year, area_ha, clone, tapping_start_date, status)
       VALUES (?,?,?,?,?,?, 'active')
       ON DUPLICATE KEY UPDATE area_ha=VALUES(area_ha), clone=VALUES(clone),
                               tapping_start_date=VALUES(tapping_start_date), status='active'`,
      [Number(farm_id), code.trim(), planting_year || null, Number(area_ha || 0), clone || null, tapping_start_date || null]
    );
    res.status(201).json({ message: 'saved' });
  } catch (e) { next(e); }
});

export default router;
