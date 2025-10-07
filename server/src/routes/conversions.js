// server/src/routes/conversions.js
import { Router } from 'express';
import { pool } from '../db.js';
const router = Router();

// POST /api/conversions
router.post('/', async (req, res, next) => {
  try {
    const { farm_id, rubber_type_id, effective_from, factor_to_dry_ton } = req.body;
    if (!rubber_type_id || !effective_from || factor_to_dry_ton == null) {
      return res.status(400).json({ error: 'rubber_type_id, effective_from, factor_to_dry_ton là bắt buộc' });
    }
    await pool.query(
      `INSERT INTO conversion (farm_id, rubber_type_id, effective_from, factor_to_dry_ton)
       VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE factor_to_dry_ton=VALUES(factor_to_dry_ton)`,
      [farm_id ?? null, Number(rubber_type_id), effective_from, Number(factor_to_dry_ton)]
    );
    res.status(201).json({ message: 'saved' });
  } catch (e) { next(e); }
});

export default router;
