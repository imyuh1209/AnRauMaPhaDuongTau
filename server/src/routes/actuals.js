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

// GET /api/actuals?farm_id=&rubber_type_id=&plot_id=&date_from=&date_to=&limit=500
router.get('/', async (req, res, next) => {
  try {
    const { farm_id, rubber_type_id, plot_id, date_from, date_to } = req.query;
    const limit = Math.min(Number(req.query.limit || 500), 5000);
    const where = [];
    const params = [];
    if (farm_id) { where.push('a.farm_id = ?'); params.push(Number(farm_id)); }
    if (rubber_type_id) { where.push('a.rubber_type_id = ?'); params.push(Number(rubber_type_id)); }
    if (plot_id) { where.push('a.plot_id = ?'); params.push(Number(plot_id)); }
    if (date_from) { where.push('a.date >= ?'); params.push(date_from); }
    if (date_to) { where.push('a.date <= ?'); params.push(date_to); }
    const whereSql = where.length ? ('WHERE ' + where.join(' AND ')) : '';

    const sql = `
      SELECT a.id, a.date, a.farm_id, f.name AS farm_name, a.plot_id, a.rubber_type_id, rt.code AS rubber_type,
             a.qty, a.source, a.note
      FROM actual a
      JOIN farm f ON a.farm_id = f.id
      JOIN rubber_type rt ON a.rubber_type_id = rt.id
      ${whereSql}
      ORDER BY a.date DESC, a.id DESC
      LIMIT ${limit}
    `;
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) { next(e); }
});

// PUT /api/actuals/:id  -> chỉnh qty, note, date (optional)
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { qty, note, date } = req.body || {};
    const updates = [];
    const params = [];
    if (qty != null) { updates.push('qty = ?'); params.push(Number(qty)); }
    if (note !== undefined) { updates.push('note = ?'); params.push(note || null); }
    if (date) { updates.push('date = ?'); params.push(date); }
    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
    params.push(id);
    await pool.query(`UPDATE actual SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ message: 'updated' });
  } catch (e) { next(e); }
});

// DELETE /api/actuals/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    await pool.query('DELETE FROM actual WHERE id = ?', [id]);
    res.status(204).end();
  } catch (e) { next(e); }
});
