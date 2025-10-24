import { useState } from 'react';
import { authLogin, authMe } from '../api';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function Login(){
  const [form, setForm] = useState({ username:'', password:'' });
  const [msg, setMsg] = useState('');
  const nav = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/app';
  async function submit(e){
    e.preventDefault(); setMsg('');
    try{
      await authLogin(form);
      // optional verify; ignore failures to keep UX snappy
  try{ await authMe(); }catch{/* ignore */}
      nav(from, { replace: true });
    }catch(e){ setMsg('❌ ' + (e.message||e)); }
  }
  return (
    <section className="auth-hero">
      <div className="auth-card">
        <div className="auth-brand">
          <img src="/logoRubber2.png" alt="Logo" />
          <div className="brand-text">Rubber Farm</div>
        </div>
        <h2>Đăng nhập</h2>
        <form onSubmit={submit}>
          <label>Tên đăng nhập
            <input value={form.username} onChange={e=>setForm({...form, username:e.target.value})} required/>
          </label>
          <label>Mật khẩu
            <input type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} required/>
          </label>
          <div className="actions">
            <button className="btn btn-primary" type="submit">Đăng nhập</button>
          </div>
          <div className="subtle-link">
            Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
          </div>
          {msg && <p className="muted">{msg}</p>}
        </form>
      </div>
    </section>
  );
}
