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

// GET /api/conversions?farm_id=optional
router.get('/', async (req, res, next) => {
  try {
    const farm_id = req.query.farm_id ? Number(req.query.farm_id) : null;
    const params = [];
    let sql = `SELECT c.id, c.farm_id, f.name AS farm_name, c.rubber_type_id, rt.code AS rubber_type, c.effective_from, c.factor_to_dry_ton
               FROM conversion c
               LEFT JOIN farm f ON c.farm_id = f.id
               JOIN rubber_type rt ON c.rubber_type_id = rt.id`;
    if (farm_id) {
      sql += ' WHERE c.farm_id = ?';
      params.push(farm_id);
    }
    sql += ' ORDER BY c.rubber_type_id, c.effective_from DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) { next(e); }
});
