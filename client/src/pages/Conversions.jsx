import { useEffect, useState } from 'react';
import { getFarms, getRubberTypes, createConversion } from '../api';

export default function Conversions(){
  const [farms, setFarms] = useState([]);
  const [rubberTypes, setRubberTypes] = useState([]);
  const [form, setForm] = useState({ farm_id:'', rubber_type_id:'', effective_from:'', factor_to_dry_ton:'' });
  const [msg, setMsg] = useState('');

  useEffect(()=>{ (async()=>{
    setFarms(await getFarms());
    setRubberTypes(await getRubberTypes().catch(()=>([{id:1,code:'mu_nuoc'},{id:2,code:'mu_tap'}])));
  })() },[]);

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
    }catch(err){ setMsg('❌ '+err.message); }
  }

  return (
    <section>
      <h2>Hệ số quy khô</h2>
      <form onSubmit={submit} style={{display:'grid', gap:10, maxWidth:520}}>
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
          <input type="date" value={form.effective_from} onChange={e=>setForm({...form, effective_from:e.target.value})} required/>
        </label>
        <label>Hệ số (VD: 0.3300)
          <input type="number" step="0.0001" value={form.factor_to_dry_ton}
                 onChange={e=>setForm({...form, factor_to_dry_ton:e.target.value})} required/>
        </label>
  <button className="btn btn-primary">Lưu</button>
        {msg && <p>{msg}</p>}
      </form>
    </section>
  );
}
