import { Router } from 'express';
import { pool } from '../db.js';
const router = Router();

router.get('/', async (req,res,next)=>{
  try{
    const [rows] = await pool.query('SELECT * FROM farm ORDER BY name');
    res.json(rows);
  }catch(e){ next(e); }
});

router.post('/', async (req,res,next)=>{
  try{
    const { name, area_ha, province, district } = req.body;
    await pool.query(
      `INSERT INTO farm (name, area_ha, province, district, status)
       VALUES (?,?,?,?, 'active')`,
      [name, Number(area_ha||0), province||null, district||null]
    );
    res.status(201).json({ message:'saved' });
  }catch(e){ next(e); }
});

export default router;
