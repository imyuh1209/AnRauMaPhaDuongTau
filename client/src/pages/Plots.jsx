import { useEffect, useState } from 'react';
import { getFarms, listPlots, createPlot, deletePlot } from '../api';
import { fmtDDMMYYYY } from '../utils/date';
import DateInput from '../components/DateInput.jsx';

export default function Plots(){
  const [farms, setFarms] = useState([]);
  const [farmId, setFarmId] = useState('');
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ code:'', planting_year:'', area_ha:'', clone:'', tapping_start_date:'' });
  const [msg, setMsg] = useState('');

  function fmtDate(s){
    return fmtDDMMYYYY(s);
  }

  useEffect(()=>{ (async()=> setFarms(await getFarms()))() },[]);
  useEffect(()=>{ if(farmId) (async()=> setRows(await listPlots(farmId)))() },[farmId]);

  async function submit(e){
    e.preventDefault(); setMsg('');
    try{
      await createPlot({
        farm_id: Number(farmId),
        code: form.code.trim(),
        planting_year: form.planting_year ? Number(form.planting_year) : null,
        area_ha: Number(form.area_ha || 0),
        clone: form.clone || null,
        tapping_start_date: form.tapping_start_date || null,
      });
      setMsg('✔️ Đã thêm lô');
      setForm({ code:'', planting_year:'', area_ha:'', clone:'', tapping_start_date:'' });
      setRows(await listPlots(farmId));
    }catch(err){ setMsg('❌ ' + err.message); }
  }

  async function removePlot(id){
    if(!confirm('Xoá lô này?')) return;
    setMsg('');
    try{
      await deletePlot(id);
      setMsg('✔️ Đã xoá lô');
      setRows(await listPlots(farmId));
    }catch(err){ setMsg('❌ ' + err.message); }
  }

  return (
    <section>
      <h2>Quản lý Lô</h2>
      <div className="toolbar">
        <label>Nông trường<br/>
          <select value={farmId} onChange={e=>setFarmId(e.target.value)}>
            <option value="">-- chọn --</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
      </div>

      {farmId && (
        <>
          <div className="card" style={{maxWidth:720, marginBottom:16}}>
            <form onSubmit={submit} style={{display:'grid', gap:10}}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 130px 130px', gap:10}}>
                <label>Mã lô
                  <input value={form.code} onChange={e=>setForm({...form, code:e.target.value})} required />
                </label>
                <label>Năm trồng
                  <input type="number" value={form.planting_year} onChange={e=>setForm({...form, planting_year:e.target.value})}/>
                </label>
                <label>Diện tích (ha)
                  <input type="number" step="0.01" value={form.area_ha} onChange={e=>setForm({...form, area_ha:e.target.value})}/>
                </label>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 160px', gap:10}}>
                <label>Giống
                  <input value={form.clone} onChange={e=>setForm({...form, clone:e.target.value})}/>
                </label>
                <label>Ngày mở cạo
                  <DateInput value={form.tapping_start_date}
                    onChange={v=>setForm({...form, tapping_start_date:v})}/>
                </label>
              </div>
              <button className="btn btn-primary">Thêm lô</button>
              {msg && <p className="message info">{msg}</p>}
            </form>
          </div>

          <table>
            <thead><tr>
              <th>Mã</th><th>Diện tích</th><th>Năm trồng</th><th>Giống</th><th>Ngày mở cạo</th><th></th>
            </tr></thead>
            <tbody>
              {rows.map(r=>(
                <tr key={r.id}>
                  <td>{r.code}</td>
                  <td>{Number(r.area_ha||0).toLocaleString('vi-VN')}</td>
                  <td>{r.planting_year||''}</td>
                  <td>{r.clone||''}</td>
                  <td>{fmtDate(r.tapping_start_date)}</td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={()=>removePlot(r.id)}>Xoá</button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan="5"><div className="empty">Chưa có dữ liệu</div></td></tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
