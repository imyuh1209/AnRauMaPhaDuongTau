import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(payload){
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// POST /api/auth/register { username, password, role? }
router.post('/register', async (req, res, next) => {
  try{
    const { username, password, role } = req.body || {};
    if(!username || !password){ return res.status(400).json({ error: 'Thiếu username/password' }); }

    const [[exists]] = await pool.query('SELECT id FROM app_user WHERE username=?', [username]);
    if (exists) return res.status(409).json({ error: 'Username đã tồn tại' });

    const hash = await bcrypt.hash(String(password), 10);
    const userRole = role && ['Admin','Planner','Reporter','Field'].includes(role) ? role : 'Planner';
    const [result] = await pool.query(
      'INSERT INTO app_user (username, hash_pw, role) VALUES (?,?,?)',
      [username, hash, userRole]
    );

    const token = signToken({ uid: result.insertId, username, role: userRole });
    res.status(201).json({ token, user: { id: result.insertId, username, role: userRole } });
  }catch(e){ next(e); }
});

// POST /api/auth/login { username, password }
router.post('/login', async (req, res, next) => {
  try{
    const { username, password } = req.body || {};
    if(!username || !password){ return res.status(400).json({ error: 'Thiếu username/password' }); }

    const [[user]] = await pool.query('SELECT id, username, hash_pw, role FROM app_user WHERE username=?', [username]);
    if(!user) return res.status(401).json({ error: 'Sai thông tin đăng nhập' });

    const ok = await bcrypt.compare(String(password), user.hash_pw);
    if(!ok) return res.status(401).json({ error: 'Sai thông tin đăng nhập' });

    const token = signToken({ uid: user.id, username: user.username, role: user.role });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  }catch(e){ next(e); }
});

// GET /api/auth/me (Authorization: Bearer <token>)
router.get('/me', async (req, res) => {
  try{
    const auth = req.headers.authorization || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if(!m) return res.status(401).json({ error: 'Missing token' });
    const payload = jwt.verify(m[1], JWT_SECRET);
    const [[user]] = await pool.query('SELECT id, username, role FROM app_user WHERE id=?', [payload.uid]);
    if(!user) return res.status(401).json({ error: 'User not found' });
    res.json({ user });
  }catch(e){
    return res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;