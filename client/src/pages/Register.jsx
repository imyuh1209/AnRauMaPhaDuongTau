import { useState } from 'react';
import { authRegister } from '../api';
import { Link, useNavigate } from 'react-router-dom';

export default function Register(){
  const [form, setForm] = useState({ username:'', password:'', role:'Planner' });
  const [msg, setMsg] = useState('');
  const nav = useNavigate();
  async function submit(e){
    e.preventDefault(); setMsg('');
    try{
      const res = await authRegister(form);
      if(res?.token){
        setMsg('✔️ Đăng ký thành công');
        nav('/login', { replace: true });
      }
    }catch(e){ setMsg('❌ ' + (e.message||e)); }
  }
  return (
    <section className="auth-hero">
      <div className="auth-card">
        <div className="auth-brand">
          <img src="/logoRubber2.png" alt="Logo" />
          <div className="brand-text">Rubber Farm</div>
        </div>
        <h2>Đăng ký</h2>
        <form onSubmit={submit}>
          <label>Tên đăng nhập
            <input value={form.username} onChange={e=>setForm({...form, username:e.target.value})} required/>
          </label>
          <label>Mật khẩu
            <input type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} required/>
          </label>
          <label>Vai trò
            <select value={form.role} onChange={e=>setForm({...form, role:e.target.value})}>
              <option>Planner</option>
              <option>Admin</option>
              <option>Reporter</option>
              <option>Field</option>
            </select>
          </label>
          <div className="actions">
            <button className="btn btn-primary" type="submit">Đăng ký</button>
          </div>
          <div className="subtle-link">
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </div>
          {msg && <p className="muted">{msg}</p>}
        </form>
      </div>
    </section>
  );
}
