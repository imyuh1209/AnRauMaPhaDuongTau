// server/src/routes/reports.js
import { Router } from 'express';
import { pool } from '../db.js';
import dayjs from 'dayjs';

const router = Router();

/**
 * GET /api/reports/dashboard?date=YYYY-MM-DD&farm_id=optional
 * Trả:
 *  { date, ym, farms:[{id,name}], rows:[{rubber_type, actual_today, actual_mtd, plan_m, completion_pct}] }
 */
router.get('/dashboard', async (req, res) => {
  const date = req.query.date || dayjs().format('YYYY-MM-DD');
  const ym = dayjs(date).format('YYYY-MM');
  const farmId = req.query.farm_id ? Number(req.query.farm_id) : null;

  // Lũy kế theo loại mủ trong tháng + thực tế hôm nay
  // Kế hoạch lấy bản version mới nhất trong tháng, theo farm nếu có
  const sql = `
    SELECT
      rt.code AS rubber_type,
      COALESCE(SUM(CASE WHEN a.date = ? THEN a.qty END), 0) AS actual_today,
      COALESCE(SUM(CASE WHEN DATE_FORMAT(a.date,'%Y-%m') = ? THEN a.qty END), 0) AS actual_mtd,
      (
        SELECT p.planned_qty FROM plan p
        WHERE p.rubber_type_id = rt.id
          AND p.period_type = 'MONTH'
          AND p.period_key = ?
          ${farmId ? ' AND p.farm_id = ? ' : ''}
        ORDER BY p.version DESC
        LIMIT 1
      ) AS plan_m
    FROM rubber_type rt
    LEFT JOIN actual a
      ON a.rubber_type_id = rt.id
      ${farmId ? ' AND a.farm_id = ? ' : ''}
    GROUP BY rt.id, rt.code
    ORDER BY rt.code
  `;

  const params = farmId
    ? [date, ym, ym, farmId, farmId]   // plan..farmId , actual..farmId
    : [date, ym, ym];

  const [rowsRaw] = await pool.query(sql, params);

  const rows = rowsRaw.map(r => ({
    rubber_type: r.rubber_type,
    actual_today: Number(r.actual_today || 0),
    actual_mtd: Number(r.actual_mtd || 0),
    plan_m: r.plan_m == null ? null : Number(r.plan_m),
    completion_pct:
      r.plan_m == null || Number(r.plan_m) === 0
        ? null
        : Number((100 * Number(r.actual_mtd || 0) / Number(r.plan_m)).toFixed(1))
  }));

  const [farms] = await pool.query('SELECT id, name FROM farm ORDER BY name');

  res.json({ date, ym, farms, rows });
});

export default router;
