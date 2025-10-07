import { useEffect, useState } from 'react';
import { getFarms, listPlots, createPlot } from '../api';

export default function Plots(){
  const [farms, setFarms] = useState([]);
  const [farmId, setFarmId] = useState('');
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ code:'', planting_year:'', area_ha:'', clone:'', tapping_start_date:'' });
  const [msg, setMsg] = useState('');

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

  return (
    <section>
      <h2>Quản lý Lô</h2>
      <div style={{marginBottom:12}}>
        <label>Nông trường: </label>
        <select value={farmId} onChange={e=>setFarmId(e.target.value)}>
          <option value="">-- chọn --</option>
          {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      {farmId && (
        <>
          <form onSubmit={submit} style={{display:'grid', gap:10, maxWidth:680, marginBottom:16}}>
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
                <input type="date" value={form.tapping_start_date}
                  onChange={e=>setForm({...form, tapping_start_date:e.target.value})}/>
              </label>
            </div>
            <button>Thêm lô</button>
            {msg && <p>{msg}</p>}
          </form>

          <table style={{borderCollapse:'collapse', width:'100%'}}>
            <thead><tr>
              <th style={th}>Mã</th><th style={th}>Diện tích</th><th style={th}>Năm trồng</th><th style={th}>Giống</th><th style={th}>Ngày mở cạo</th>
            </tr></thead>
            <tbody>
              {rows.map(r=>(
                <tr key={r.id}>
                  <td style={td}>{r.code}</td>
                  <td style={td}>{Number(r.area_ha||0).toLocaleString('vi-VN')}</td>
                  <td style={td}>{r.planting_year||''}</td>
                  <td style={td}>{r.clone||''}</td>
                  <td style={td}>{r.tapping_start_date||''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
const th = { border:'1px solid #ddd', padding:8, background:'#f6f6f6' };
const td = { border:'1px solid #ddd', padding:8 };
