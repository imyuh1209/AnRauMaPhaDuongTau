import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { authLogout, authMe } from './api';
import { useEffect, useState } from 'react';

export default function App(){
  const [user, setUser] = useState(null);
  const nav = useNavigate();
  useEffect(()=>{ (async()=>{ try{ const me = await authMe(); setUser(me.user); }catch{ /* ignore */ } })() },[]);
  function doLogout(){ authLogout(); setUser(null); nav('/login'); }
  return (
    <div>
      <header className="app-header">
        <div className="bar container">
          <div className="brand">
            <NavLink to="/app" className="brand-link" end>
              <img src="/logoRubber1.png" alt="Logo" className="brand-logo" />
              {/* <span>Quản lý Cao su</span> */}
            </NavLink>
          </div>
          <nav className="nav">
            <NavLink to="/app" end className={({isActive})=>`nav-link ${isActive?'active':''}`}>Tiến độ</NavLink>
            <NavLink to="/app/farms" className={({isActive})=>`nav-link ${isActive?'active':''}`}>Nông trường</NavLink>
            <NavLink to="/app/plots" className={({isActive})=>`nav-link ${isActive?'active':''}`}>Lô</NavLink>
            <NavLink to="/app/plans" className={({isActive})=>`nav-link ${isActive?'active':''}`}>Kế hoạch</NavLink>
            <NavLink to="/app/actuals" className={({isActive})=>`nav-link ${isActive?'active':''}`}>Thực tế</NavLink>
            <NavLink to="/app/conversions" className={({isActive})=>`nav-link ${isActive?'active':''}`}>Quy đổi</NavLink>
            <NavLink to="/app/rubber-types" className={({isActive})=>`nav-link ${isActive?'active':''}`}>Loại mủ</NavLink>
          </nav>
          <div className="nav-spacer" />
          <div className="row" style={{color:'#fff'}}>
            {user ? (
              <>
                <strong>{user.username}</strong>
                <button className="btn btn-ghost" onClick={doLogout}>Đăng xuất</button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="nav-link">Đăng nhập</NavLink>
                <NavLink to="/register" className="btn btn-secondary">Đăng ký</NavLink>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="container"><Outlet /></main>
    </div>
  );
}
