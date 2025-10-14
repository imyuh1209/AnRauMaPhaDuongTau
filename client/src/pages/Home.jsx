import { Link } from 'react-router-dom';

export default function Home(){
  return (
    <section>
  <h2>Trang chào mừng</h2>
  <p>Hệ thống quản lý kế hoạch và sản lượng cao su.</p>
      <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
        <Link to="/login">Đăng nhập</Link>
        <Link to="/register">Đăng ký</Link>
  <Link to="/app">Vào ứng dụng</Link>
      </div>
    </section>
  );
}
