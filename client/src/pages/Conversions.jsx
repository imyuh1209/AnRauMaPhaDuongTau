import { useEffect, useState, useCallback } from 'react';
import { getFarms, getRubberTypes, createConversion, listConversions } from '../api';
import { fmtDDMMYYYY } from '../utils/date';
import DateInput from '../components/DateInput.jsx';

export default function Conversions(){
  const [farms, setFarms] = useState([]);
  const [rubberTypes, setRubberTypes] = useState([]);
  const [form, setForm] = useState({ farm_id:'', rubber_type_id:'', effective_from:'', factor_to_dry_ton:'' });
  const [msg, setMsg] = useState('');
  const [viewFarmId, setViewFarmId] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  function fmtDate(s){
    return fmtDDMMYYYY(s);
  }

  useEffect(()=>{ (async()=>{
    setFarms(await getFarms());
    setRubberTypes(await getRubberTypes().catch(()=>([{id:1,code:'mu_nuoc'},{id:2,code:'mu_tap'}])));
  })() },[]);

  const load = useCallback(async ()=>{
    setLoading(true); setErr('');
    try{
      const data = await listConversions({ ...(viewFarmId?{farm_id:viewFarmId}:{}) });
      setRows(data||[]);
    }catch(e){ setErr(String(e)); }
    setLoading(false);
  }, [viewFarmId]);

  useEffect(()=>{ load() }, [load]);

  async function submit(e){
    e.preventDefault(); setMsg('');
    try{
      await createConversion({
        farm_id: form.farm_id ? Number(form.farm_id) : null, // null = mặc định toàn hệ thống
        rubber_type_id: Number(form.rubber_type_id),
        effective_from: form.effective_from,
        factor_to_dry_ton: Number(form.factor_to_dry_ton)
      });
      setMsg('✔️ Đã lưu hệ số');
      setForm({ farm_id:'', rubber_type_id:'', effective_from:'', factor_to_dry_ton:'' });
      await load();
    }catch(err){ setMsg('❌ '+err.message); }
  }

  return (
    <section>
      <h2>Hệ số quy khô</h2>

      <div className="toolbar">
        <label>Danh sách theo nông trường<br/>
          <select value={viewFarmId} onChange={e=>setViewFarmId(e.target.value)}>
            <option value="">Tất cả</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        <button className="btn btn-primary btn-sm" onClick={load}>Xem</button>
      </div>

      {loading && <p className="loading">Đang tải…</p>}
      {err && <p className="message error">{err}</p>}

      <table>
        <thead>
          <tr>
            <th>Nông trường</th>
            <th>Loại mủ</th>
            <th>Hiệu lực từ</th>
            <th>Hệ số</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>
              <td>{r.farm_name || 'Mặc định'}</td>
              <td>{r.rubber_type}</td>
              <td>{fmtDate(r.effective_from)}</td>
              <td>{Number(r.factor_to_dry_ton||0).toFixed(4)}</td>
            </tr>
          ))}
          {!rows.length && !loading && !err && (
            <tr><td colSpan="4"><div className="empty">Chưa có dữ liệu</div></td></tr>
          )}
        </tbody>
      </table>

      <div className="card" style={{marginTop:16, maxWidth:560}}>
        <form onSubmit={submit} style={{display:'grid', gap:10}}>
          <label>Nông trường (bỏ trống = mặc định)
            <select value={form.farm_id} onChange={e=>setForm({...form, farm_id:e.target.value})}>
              <option value="">-- Mặc định toàn hệ thống --</option>
              {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </label>
          <label>Loại mủ
            <select value={form.rubber_type_id} onChange={e=>setForm({...form, rubber_type_id:e.target.value})} required>
              <option value="">-- chọn --</option>
              {rubberTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.code}</option>)}
            </select>
          </label>
          <label>Hiệu lực từ ngày
            <DateInput value={form.effective_from} onChange={v=>setForm({...form, effective_from:v})} required/>
          </label>
          <label>Hệ số (VD: 0.3300)
            <input type="number" step="0.0001" value={form.factor_to_dry_ton}
                   onChange={e=>setForm({...form, factor_to_dry_ton:e.target.value})} required/>
          </label>
  <button className="btn btn-primary">Lưu</button>
          {msg && <p className="message info">{msg}</p>}
        </form>
      </div>
    </section>
  );
}
