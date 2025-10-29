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
      rt.id AS rubber_type_id,
      rt.code AS rubber_type,
      COALESCE(SUM(CASE WHEN a.date = ? THEN a.qty END), 0) AS actual_today,
      COALESCE(SUM(CASE WHEN DATE_FORMAT(a.date,'%Y-%m') = ? THEN a.qty END), 0) AS actual_mtd,
      (
        SELECT p.planned_qty FROM plan p
        WHERE p.rubber_type_id = rt.id
          AND p.period_type = 'MONTH'
          AND p.period_key = ?
          AND p.plot_id IS NULL
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
    rubber_type_id: Number(r.rubber_type_id),
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

  // === Tiến độ theo lô (chỉ khi chọn nông trường) ===
  let plots = [];
  if (farmId) {
    const sqlPlots = `
      SELECT
        p.id AS plot_id,
        p.code AS plot_code,
        rt.id AS rubber_type_id,
        rt.code AS rubber_type,
        COALESCE(SUM(CASE WHEN a.date = ? THEN a.qty END), 0) AS actual_today,
        COALESCE(SUM(CASE WHEN DATE_FORMAT(a.date,'%Y-%m') = ? THEN a.qty END), 0) AS actual_mtd,
        (
          SELECT pl.planned_qty FROM plan pl
          WHERE pl.farm_id = ?
            AND pl.plot_id = p.id
            AND pl.rubber_type_id = rt.id
            AND pl.period_type = 'MONTH'
            AND pl.period_key = ?
          ORDER BY pl.version DESC
          LIMIT 1
        ) AS plan_m
      FROM plot p
      CROSS JOIN rubber_type rt
      LEFT JOIN actual a
        ON a.plot_id = p.id AND a.rubber_type_id = rt.id AND a.farm_id = p.farm_id
      WHERE p.farm_id = ? AND p.status = 'active'
      GROUP BY p.id, p.code, rt.id, rt.code
      HAVING actual_mtd > 0 OR actual_today > 0 OR plan_m IS NOT NULL
      ORDER BY p.code, rt.code
    `;
    const paramsPlots = [date, ym, farmId, ym, farmId];
    const [plotsRaw] = await pool.query(sqlPlots, paramsPlots);
    const plotsRelevant = plotsRaw.map(r => ({
      plot_id: Number(r.plot_id),
      plot_code: r.plot_code,
      rubber_type_id: Number(r.rubber_type_id),
      rubber_type: r.rubber_type,
      actual_today: Number(r.actual_today || 0),
      actual_mtd: Number(r.actual_mtd || 0),
      plan_m: r.plan_m == null ? null : Number(r.plan_m),
      completion_pct:
        r.plan_m == null || Number(r.plan_m) === 0
          ? null
          : Number((100 * Number(r.actual_mtd || 0) / Number(r.plan_m)).toFixed(1))
    }));

    // Bổ sung các lô chưa có dữ liệu/kế hoạch để vẫn hiển thị trong bảng
    const [plotsAll] = await pool.query(
      "SELECT id AS plot_id, code AS plot_code FROM plot WHERE farm_id = ? AND status = 'active' ORDER BY code",
      [farmId]
    );
    const present = new Set(plotsRelevant.map(p => Number(p.plot_id)));
    const placeholders = [];
    for (const p of plotsAll) {
      const pid = Number(p.plot_id);
      if (!present.has(pid)) {
        placeholders.push({
          plot_id: pid,
          plot_code: p.plot_code,
          rubber_type_id: null,
          rubber_type: '-',
          actual_today: 0,
          actual_mtd: 0,
          plan_m: null,
          completion_pct: null,
        });
      }
    }
    plots = [...plotsRelevant, ...placeholders]
      .sort((a,b) => a.plot_code.localeCompare(b.plot_code) || String(a.rubber_type).localeCompare(String(b.rubber_type)));
  }

  res.json({ date, ym, farms, rows, plots });
});

/**
 * GET /api/reports/stats?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&farm_id=optional
 * Trả về thống kê sản lượng:
 *  - byFarm: tổng sản lượng theo nông trường và loại mủ trong khoảng thời gian
 *  - byPlot: tổng sản lượng theo lô và loại mủ (chỉ khi chọn nông trường)
 */
router.get('/stats', async (req, res, next) => {
  try {
    const dateTo = req.query.date_to || dayjs().format('YYYY-MM-DD');
    const dateFrom = req.query.date_from || dayjs(dateTo).startOf('month').format('YYYY-MM-DD');
    const farmId = req.query.farm_id ? Number(req.query.farm_id) : null;

    // Danh sách nông trường phục vụ filter
    const [farms] = await pool.query('SELECT id, name FROM farm ORDER BY name');

    // Tổng hợp theo nông trường
    const sqlByFarm = `
      SELECT
        a.farm_id,
        f.name AS farm_name,
        a.rubber_type_id,
        rt.code AS rubber_type,
        COALESCE(SUM(a.qty), 0) AS actual_qty
      FROM actual a
      JOIN farm f ON a.farm_id = f.id
      JOIN rubber_type rt ON a.rubber_type_id = rt.id
      WHERE a.date >= ? AND a.date <= ?
      ${farmId ? ' AND a.farm_id = ? ' : ''}
      GROUP BY a.farm_id, f.name, a.rubber_type_id, rt.code
      ORDER BY f.name, rt.code
    `;
    const paramsByFarm = farmId ? [dateFrom, dateTo, farmId] : [dateFrom, dateTo];
    const [byFarmRaw] = await pool.query(sqlByFarm, paramsByFarm);
    const byFarm = byFarmRaw.map(r => ({
      farm_id: Number(r.farm_id),
      farm_name: r.farm_name,
      rubber_type_id: Number(r.rubber_type_id),
      rubber_type: r.rubber_type,
      actual_qty: Number(r.actual_qty || 0),
    }));

    // Tổng hợp theo lô: chỉ trả khi chọn farm
    let byPlot = [];
    if (farmId) {
      const sqlByPlot = `
        SELECT
          p.id AS plot_id,
          p.code AS plot_code,
          a.rubber_type_id,
          rt.code AS rubber_type,
          COALESCE(SUM(a.qty), 0) AS actual_qty
        FROM plot p
        JOIN actual a ON a.plot_id = p.id AND a.farm_id = p.farm_id
        JOIN rubber_type rt ON a.rubber_type_id = rt.id
        WHERE p.farm_id = ? AND a.date >= ? AND a.date <= ?
        GROUP BY p.id, p.code, a.rubber_type_id, rt.code
        ORDER BY p.code, rt.code
      `;
      const [byPlotRaw] = await pool.query(sqlByPlot, [farmId, dateFrom, dateTo]);
      byPlot = byPlotRaw.map(r => ({
        plot_id: Number(r.plot_id),
        plot_code: r.plot_code,
        rubber_type_id: Number(r.rubber_type_id),
        rubber_type: r.rubber_type,
        actual_qty: Number(r.actual_qty || 0),
      }));
    }

    res.json({ date_from: dateFrom, date_to: dateTo, farms, byFarm, byPlot });
  } catch (e) { next(e); }
});

export default router;
