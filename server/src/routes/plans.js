import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

// GET /api/plans?farm_id=&period_type=&period_key=
router.get('/', async (req, res, next) => {
  try {
    const farmId = req.query.farm_id ? Number(req.query.farm_id) : null;
    const period_type = req.query.period_type || null;
    const period_key = req.query.period_key || null;

    const where = [];
    const params = [];
    if (farmId) { where.push('p.farm_id = ?'); params.push(farmId); }
    if (period_type) { where.push('p.period_type = ?'); params.push(period_type); }
    if (period_key) { where.push('p.period_key = ?'); params.push(period_key); }

    const sql = `
      SELECT p.id, p.farm_id, p.plot_id, p.rubber_type_id,
             p.period_type, p.period_key, p.version,
             p.planned_qty, p.note,
             f.name AS farm_name, rt.code AS rubber_type
      FROM plan p
      JOIN farm f ON p.farm_id = f.id
      JOIN rubber_type rt ON p.rubber_type_id = rt.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY f.id, COALESCE(p.plot_id,0), rt.code, p.version
    `;
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/plans
router.post('/', async (req, res, next) => {
  try {
    const { farm_id, plot_id, rubber_type_id, period_type, period_key, planned_qty, note } = req.body || {};
    if (!farm_id || !rubber_type_id || !period_type || !period_key) {
      return res.status(400).json({ error: 'Thiếu farm_id, rubber_type_id, period_type, period_key' });
    }
    const sql = `
      INSERT INTO plan (farm_id, plot_id, rubber_type_id, period_type, period_key, planned_qty, note)
      VALUES (?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE planned_qty=VALUES(planned_qty), note=VALUES(note)
    `;
    const params = [Number(farm_id), plot_id ? Number(plot_id) : null, Number(rubber_type_id), period_type, period_key, Number(planned_qty || 0), note || null];
    await pool.query(sql, params);
    res.status(201).json({ message: 'saved' });
  } catch (e) { next(e); }
});

// PUT /api/plans/:id
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const fields = [];
    const params = [];
    if (req.body.planned_qty != null) { fields.push('planned_qty = ?'); params.push(Number(req.body.planned_qty)); }
    if (req.body.note !== undefined) { fields.push('note = ?'); params.push(req.body.note || null); }
    if (!fields.length) return res.status(400).json({ error: 'No updates' });
    params.push(id);
    await pool.query(`UPDATE plan SET ${fields.join(', ')} WHERE id = ?`, params);
    res.json({ message: 'updated' });
  } catch (e) { next(e); }
});

// DELETE /api/plans/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    await pool.query('DELETE FROM plan WHERE id = ?', [id]);
    res.status(204).end();
  } catch (e) { next(e); }
});

// GET /api/plans/history?farm_id=&period_type=&period_key=
router.get('/history', async (req, res, next) => {
  try {
    const farmId = req.query.farm_id ? Number(req.query.farm_id) : null;
    const period_type = req.query.period_type || null;
    const period_key = req.query.period_key || null;
    if (!period_type || !period_key) return res.status(400).json({ error: 'Thiếu period_type/period_key' });
    const where = ['p.period_type = ?', 'p.period_key = ?'];
    const params = [period_type, period_key];
    if (farmId) { where.push('p.farm_id = ?'); params.push(farmId); }
    const sql = `
      SELECT rt.code AS rubber_type, p.version, p.planned_qty, p.note
      FROM plan p
      JOIN rubber_type rt ON p.rubber_type_id = rt.id
      WHERE ${where.join(' AND ')}
      ORDER BY rt.code, p.version
    `;
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/plans/bump-version { farm_id, period_type, period_key }
router.post('/bump-version', async (req, res, next) => {
  try {
    const { farm_id, period_type, period_key } = req.body || {};
    if (!farm_id || !period_type || !period_key) return res.status(400).json({ error: 'Thiếu farm_id/period_type/period_key' });
    const [[{ next_version }]] = await pool.query(
      `SELECT COALESCE(MAX(version),0)+1 AS next_version FROM plan WHERE farm_id=? AND period_type=? AND period_key=?`,
      [Number(farm_id), period_type, period_key]
    );
    const sql = `
      INSERT INTO plan (farm_id, plot_id, rubber_type_id, period_type, period_key, version, planned_qty, note)
      SELECT farm_id, plot_id, rubber_type_id, period_type, period_key, ?, planned_qty, note
      FROM plan
      WHERE farm_id=? AND period_type=? AND period_key=?
        AND version = (
          SELECT MAX(version) FROM plan WHERE farm_id=? AND period_type=? AND period_key=?
        )
      ON DUPLICATE KEY UPDATE planned_qty=VALUES(planned_qty), note=VALUES(note)
    `;
    const params = [next_version, Number(farm_id), period_type, period_key, Number(farm_id), period_type, period_key];
    await pool.query(sql, params);
    res.json({ message: 'bumped', version: next_version });
  } catch (e) { next(e); }
});

// POST /api/plans/bulk-copy { src:{farm_id,period_type,period_key}, dst:{farm_id,period_type,period_key,version} }
router.post('/bulk-copy', async (req, res, next) => {
  try {
    const { src, dst } = req.body || {};
    if (!src || !dst) return res.status(400).json({ error: 'Thiếu src/dst' });
    const sFarm = Number(src.farm_id);
    const sType = src.period_type; const sKey = src.period_key;
    const dFarm = Number(dst.farm_id);
    const dType = dst.period_type; const dKey = dst.period_key; const dVer = Number(dst.version || 1);
    if (!sFarm || !sType || !sKey || !dFarm || !dType || !dKey) return res.status(400).json({ error: 'Thiếu tham số bắt buộc' });

    const sql = `
      INSERT INTO plan (farm_id, plot_id, rubber_type_id, period_type, period_key, version, planned_qty, note)
      SELECT ?, plot_id, rubber_type_id, ?, ?, ?, planned_qty, note
      FROM plan
      WHERE farm_id=? AND period_type=? AND period_key=?
        AND version = (
          SELECT MAX(version) FROM plan WHERE farm_id=? AND period_type=? AND period_key=?
        )
      ON DUPLICATE KEY UPDATE planned_qty=VALUES(planned_qty), note=VALUES(note)
    `;
    const params = [dFarm, dType, dKey, dVer, sFarm, sType, sKey, sFarm, sType, sKey];
    await pool.query(sql, params);
    res.json({ message: 'copied', to: { farm_id: dFarm, period_type: dType, period_key: dKey, version: dVer } });
  } catch (e) { next(e); }
});

export default router;