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

// GET /api/plans?farm_id=&period_type=&period_key=
router.get('/', async (req, res, next) => {
  try {
    const { farm_id, period_type, period_key } = req.query;
    const where = [];
    const params = [];
    if (farm_id) { where.push('p.farm_id = ?'); params.push(Number(farm_id)); }
    if (period_type) { where.push('p.period_type = ?'); params.push(period_type); }
    if (period_key) { where.push('p.period_key = ?'); params.push(period_key); }

    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    const sql = `
      SELECT p.id, p.farm_id, f.name AS farm_name, p.plot_id, p.rubber_type_id,
             rt.code AS rubber_type, p.period_type, p.period_key, p.version, p.planned_qty, p.note
      FROM plan p
      JOIN farm f ON p.farm_id = f.id
      JOIN rubber_type rt ON p.rubber_type_id = rt.id
      ${whereSql}
      ORDER BY f.name, rt.code, p.period_key, p.version DESC
    `;

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) { next(e); }
});

// PUT /api/plans/:id  -> cập nhật planned_qty, note
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { planned_qty, note } = req.body;
    const updates = [];
    const params = [];
    if (planned_qty != null) { updates.push('planned_qty = ?'); params.push(Number(planned_qty)); }
    if (note !== undefined) { updates.push('note = ?'); params.push(note || null); }
    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
    params.push(id);
    const sql = `UPDATE plan SET ${updates.join(', ')} WHERE id = ?`;
    await pool.query(sql, params);
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

export default router;

// ===== Extensions for plans: history, bump-version, bulk-copy =====

// GET /api/plans/history?farm_id=&period_type=&period_key=&rubber_type_id=&plot_id=
router.get('/history', async (req, res, next) => {
  try {
    const { farm_id, period_type, period_key, rubber_type_id, plot_id } = req.query;
    const where = [];
    const params = [];
    if (farm_id) { where.push('p.farm_id = ?'); params.push(Number(farm_id)); }
    if (period_type) { where.push('p.period_type = ?'); params.push(period_type); }
    if (period_key) { where.push('p.period_key = ?'); params.push(period_key); }
    if (rubber_type_id) { where.push('p.rubber_type_id = ?'); params.push(Number(rubber_type_id)); }
    if (plot_id) { where.push('p.plot_id = ?'); params.push(Number(plot_id)); }
    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    const sql = `
      SELECT p.id, p.farm_id, f.name AS farm_name, p.plot_id,
             p.rubber_type_id, rt.code AS rubber_type,
             p.period_type, p.period_key, p.version, p.planned_qty, p.note
      FROM plan p
      JOIN farm f ON p.farm_id = f.id
      JOIN rubber_type rt ON p.rubber_type_id = rt.id
      ${whereSql}
      ORDER BY rt.code, COALESCE(p.plot_id, 0), p.version DESC
    `;
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/plans/bump-version { farm_id, period_type, period_key, rubber_type_id?, plot_id? }
router.post('/bump-version', async (req, res, next) => {
  try {
    const { farm_id, period_type, period_key, rubber_type_id, plot_id } = req.body || {};
    if (!farm_id || !period_type || !period_key) {
      return res.status(400).json({ error: 'Thiếu farm_id, period_type, period_key' });
    }

    // next version for the group (same farm/period)
    const where = ['farm_id=?', 'period_type=?', 'period_key=?'];
    const params = [Number(farm_id), period_type, period_key];
    if (rubber_type_id) { where.push('rubber_type_id=?'); params.push(Number(rubber_type_id)); }
    if (plot_id) { where.push('plot_id ' + (plot_id==null ? 'IS NULL' : '= ?')); if (plot_id!=null) params.push(Number(plot_id)); }

    const [[{ nextVersion }]] = await pool.query(
      `SELECT COALESCE(MAX(version), 0) + 1 AS nextVersion FROM plan WHERE ${where.join(' AND ')}`,
      params
    );

    const insertSql = `
      INSERT INTO plan (farm_id, plot_id, rubber_type_id, period_type, period_key, version, planned_qty, note)
      SELECT farm_id, plot_id, rubber_type_id, period_type, period_key, ?, planned_qty, note
      FROM plan
      WHERE ${where.join(' AND ')}
    `;
    const [result] = await pool.query(insertSql, [nextVersion, ...params]);
    res.json({ message: 'bumped', version: Number(nextVersion), inserted: result.affectedRows });
  } catch (e) { next(e); }
});

// POST /api/plans/bulk-copy {
//   src: { farm_id, period_type, period_key, rubber_type_id?, plot_id? },
//   dst: { farm_id, period_type, period_key, version? }
// }
router.post('/bulk-copy', async (req, res, next) => {
  try {
    const { src, dst } = req.body || {};
    if (!src || !dst) return res.status(400).json({ error: 'Thiếu src/dst' });
    const { farm_id: sf, period_type: spt, period_key: spk, rubber_type_id: srt, plot_id: spl } = src;
    const { farm_id: df, period_type: dpt, period_key: dpk, version: dv } = dst;
    if (!sf || !spt || !spk || !df || !dpt || !dpk) {
      return res.status(400).json({ error: 'Thiếu trường bắt buộc trong src/dst' });
    }
    const targetVersion = dv != null ? Number(dv) : 1;

    // Build source filter
    const sw = ['farm_id=?', 'period_type=?', 'period_key=?'];
    const sp = [Number(sf), spt, spk];
    if (srt) { sw.push('rubber_type_id=?'); sp.push(Number(srt)); }
    if (spl) { sw.push('plot_id=?'); sp.push(Number(spl)); }

    // Copy rows, changing farm/period/version to destination
    const sql = `
      INSERT INTO plan (farm_id, plot_id, rubber_type_id, period_type, period_key, version, planned_qty, note)
      SELECT ?, plot_id, rubber_type_id, ?, ?, ?, planned_qty, note
      FROM (
        SELECT plot_id, rubber_type_id, planned_qty, note
        FROM plan
        WHERE ${sw.join(' AND ')}
      ) s
      ON DUPLICATE KEY UPDATE planned_qty = VALUES(planned_qty), note = VALUES(note)
    `;
    const [result] = await pool.query(sql, [Number(df), dpt, dpk, targetVersion, ...sp]);
    res.json({ message: 'copied', into: { farm_id: Number(df), period_type: dpt, period_key: dpk, version: targetVersion }, affected: result.affectedRows });
  } catch (e) { next(e); }
});
