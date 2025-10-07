import { useEffect, useState } from 'react';
import { getFarms, createFarm } from '../api';

export default function Farms(){
  const [farms, setFarms] = useState([]);
  const [form, setForm] = useState({ name:'', area_ha:'', province:'', district:'' });
  const [msg, setMsg] = useState('');

  async function load(){ setFarms(await getFarms()); }
  useEffect(()=>{ load() },[]);

  async function submit(e){
    e.preventDefault(); setMsg('');
    try{
      await createFarm({
        name: form.name.trim(),
        area_ha: Number(form.area_ha || 0),
        province: form.province || null,
        district: form.district || null
      });
      setForm({ name:'', area_ha:'', province:'', district:'' });
      setMsg('✔️ Đã thêm nông trường');
      load();
    }catch(err){ setMsg('❌ ' + err.message); }
  }

  return (
    <section>
      <h2>Nông trường</h2>

      <form onSubmit={submit} style={{display:'grid', gap:10, maxWidth:520, marginBottom:16}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 160px', gap:10}}>
          <label>Tên
            <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required/>
          </label>
          <label>Diện tích (ha)
            <input type="number" step="0.01" value={form.area_ha}
              onChange={e=>setForm({...form, area_ha:e.target.value})}/>
          </label>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
          <label>Tỉnh/TP
            <input value={form.province} onChange={e=>setForm({...form, province:e.target.value})}/>
          </label>
          <label>Huyện/Thị xã
            <input value={form.district} onChange={e=>setForm({...form, district:e.target.value})}/>
          </label>
        </div>
        <button>Thêm nông trường</button>
        {msg && <p>{msg}</p>}
      </form>

      <table style={{borderCollapse:'collapse', width:'100%'}}>
        <thead><tr>
          <th style={th}>ID</th><th style={th}>Tên</th><th style={th}>Diện tích</th><th style={th}>Địa bàn</th>
        </tr></thead>
        <tbody>
          {farms.map(f=>(
            <tr key={f.id}>
              <td style={td}>{f.id}</td>
              <td style={td}>{f.name}</td>
              <td style={td}>{Number(f.area_ha||0).toLocaleString('vi-VN')} ha</td>
              <td style={td}>{[f.district,f.province].filter(Boolean).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
const th = { border:'1px solid #ddd', padding:8, background:'#f6f6f6' };
const td = { border:'1px solid #ddd', padding:8 };
