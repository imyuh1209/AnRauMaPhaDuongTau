import { useState } from 'react';
import { saveActual } from '../api';
import DateInput from '../components/DateInput.jsx';

export default function ActualForm(){
  const today = new Date().toISOString().slice(0,10);
  const [form, setForm] = useState({ date: today, farm_id:'1', plot_id:'', rubber_type_id:'1', qty:'', note:'' });
  const [msg, setMsg] = useState('');

  async function submit(e){
    e.preventDefault(); setMsg('');
    try{
      await saveActual({
        date: form.date,
        farm_id: Number(form.farm_id),
        plot_id: form.plot_id ? Number(form.plot_id) : null,
        rubber_type_id: Number(form.rubber_type_id),
        qty: Number(form.qty||0),
        note: form.note || null
      });
      setMsg('✔️ Đã lưu vào database');
    }catch(err){ setMsg('❌ ' + err.message); }
  }

  return (
    <section>
      <h2>Nhập sản lượng</h2>
      <div className="card" style={{maxWidth:520}}>
        <form onSubmit={submit} style={{display:'grid', gap:10}}>
          <label>Ngày
            <DateInput value={form.date} onChange={v=>setForm({...form, date:v})} required/>
          </label>
          <label>Farm ID <input value={form.farm_id} onChange={e=>setForm({...form, farm_id:e.target.value})} required/></label>
          <label>Plot ID (tuỳ chọn) <input value={form.plot_id} onChange={e=>setForm({...form, plot_id:e.target.value})}/></label>
          <label>Loại mủ
            <select value={form.rubber_type_id} onChange={e=>setForm({...form, rubber_type_id:e.target.value})}>
              <option value="1">mu_nuoc</option>
              <option value="2">mu_tap</option>
            </select>
          </label>
          <label>Số lượng (kg) <input type="number" step="0.001" value={form.qty} onChange={e=>setForm({...form, qty:e.target.value})} required/></label>
          <label>Ghi chú <input value={form.note} onChange={e=>setForm({...form, note:e.target.value})}/></label>
          <button className="btn btn-primary">Lưu</button>
          {msg && <p className="message info">{msg}</p>}
        </form>
      </div>
    </section>
  );
}
