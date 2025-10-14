// client/src/pages/RubberTypes.jsx
import { useEffect, useState } from 'react';
import { getRubberTypes /* , createRubberType */ } from '../api';

export default function RubberTypes() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ code: '', unit: 'kg', description: '' });
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true); setErr('');
    try {
      const data = await getRubberTypes();      // phải tồn tại trong api.js
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(String(e.message || e));
      setRows([]);                               // đảm bảo không crash map()
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault(); setMsg(''); setErr('');
    try {
      // Nếu bạn CHƯA làm API POST /rubber-types thì comment đoạn gọi bên dưới
      const res = await fetch(`${import.meta.env.VITE_API_URL}/rubber-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.trim(),
          unit: form.unit.trim(),
          description: form.description || null
        })
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg('✔️ Đã thêm loại mủ');
      setForm({ code: '', unit: 'kg', description: '' });
      load();
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  return (
    <section>
      <h2>Loại mủ cao su</h2>

      <form onSubmit={submit} style={{ display: 'grid', gap: 10, maxWidth: 520, marginBottom: 16 }}>
        <label>Mã<span style={{color:'#b00'}}> *</span>
          <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required />
        </label>
        <label>Đơn vị<span style={{color:'#b00'}}> *</span>
          <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} required />
        </label>
        <label>Mô tả
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </label>
  <button className="btn btn-primary">Thêm</button>
      </form>

      {loading && <p>Đang tải…</p>}
      {err && <p style={{ color: '#c33' }}>Lỗi: {err}</p>}
      {msg && <p style={{ color: '#0a6' }}>{msg}</p>}

      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={th}>ID</th>
            <th style={th}>Mã</th>
            <th style={th}>Đơn vị</th>
            <th style={th}>Mô tả</th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).map(r => (
            <tr key={r.id}>
              <td style={td}>{r.id}</td>
              <td style={td}>{r.code}</td>
              <td style={td}>{r.unit}</td>
              <td style={td}>{r.description || ''}</td>
            </tr>
          ))}
          {!rows?.length && !loading && !err && (
            <tr><td style={td} colSpan="4">Chưa có dữ liệu</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
const th = { padding:10, borderBottom:'1px solid #e5e7eb', textAlign:'left' };
const td = { borderBottom:'1px solid #f0f0f0', padding:10 };
