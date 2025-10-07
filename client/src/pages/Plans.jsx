import { useEffect, useState } from 'react';
import { getFarms, listPlans, createPlan, updatePlan, deletePlan, getRubberTypes } from '../api';

export default function Plans(){
  const [farms, setFarms] = useState([]);
  const [rubberTypes, setRubberTypes] = useState([]);
  const [farmId, setFarmId] = useState('');
  const [periodKey, setPeriodKey] = useState(new Date().toISOString().slice(0,7)); // YYYY-MM
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ rubber_type_id:'', planned_qty:'', note:'' });
  const [msg, setMsg] = useState('');

  useEffect(()=>{ (async()=> {
    setFarms(await getFarms());
    setRubberTypes(await getRubberTypes().catch(()=>([{id:1,code:'mu_nuoc'},{id:2,code:'mu_tap'}])));
  })() },[]);

  async function load(){
    const data = await listPlans({ farm_id: farmId || undefined, period_key: periodKey, period_type: 'MONTH' });
    setRows(data);
  }
  useEffect(()=>{ load() },[]);

  async function addPlan(e){
    e.preventDefault(); setMsg('');
    try{
      await createPlan({
        farm_id: Number(farmId),
        plot_id: null,
        rubber_type_id: Number(form.rubber_type_id),
        period_type:'MONTH',
        period_key: periodKey,
        planned_qty: Number(form.planned_qty||0),
        note: form.note || null
      });
      setForm({ rubber_type_id:'', planned_qty:'', note:'' });
      setMsg('✔️ Đã tạo kế hoạch');
      load();
    }catch(e){ setMsg('❌ ' + e.message); }
  }

  async function onUpdateQty(id, qty){
    await updatePlan(id, { planned_qty: Number(qty||0) });
    load();
  }
  async function onDelete(id){
    if(!confirm('Xoá kế hoạch này?')) return;
    await deletePlan(id); load();
  }

  return (
    <section>
      <h2>Kế hoạch tháng</h2>
      <div style={{display:'flex', gap:12, alignItems:'end', marginBottom:12}}>
        <label>Tháng<br/><input type="month" value={periodKey} onChange={e=>setPeriodKey(e.target.value)} /></label>
        <label>Nông trường<br/>
          <select value={farmId} onChange={e=>setFarmId(e.target.value)}>
            <option value="">-- Chọn --</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        <button onClick={load}>Tải</button>
      </div>

      {farmId && (
        <form onSubmit={addPlan} style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:12}}>
          <select value={form.rubber_type_id} onChange={e=>setForm({...form, rubber_type_id:e.target.value})} required>
            <option value="">-- Loại mủ --</option>
            {rubberTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.code}</option>)}
          </select>
          <input type="number" placeholder="planned qty (kg)" value={form.planned_qty}
                 onChange={e=>setForm({...form, planned_qty:e.target.value})} required />
          <input placeholder="ghi chú" value={form.note} onChange={e=>setForm({...form, note:e.target.value})} />
          <button>Thêm</button>
          {msg && <span style={{marginLeft:8}}>{msg}</span>}
        </form>
      )}

      <table style={{borderCollapse:'collapse', width:'100%'}}>
        <thead><tr>
          <th style={th}>Farm</th><th style={th}>Loại mủ</th><th style={th}>Version</th>
          <th style={th}>Planned</th><th style={th}>Note</th><th style={th}></th>
        </tr></thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id}>
              <td style={td}>{r.farm_name}</td>
              <td style={td}>{r.rubber_type}</td>
              <td style={td}>{r.version}</td>
              <td style={td}>
                <input type="number" defaultValue={r.planned_qty} onBlur={e=>onUpdateQty(r.id, e.target.value)} style={{width:120}} />
              </td>
              <td style={td}>{r.note||''}</td>
              <td style={td}><button onClick={()=>onDelete(r.id)}>Xoá</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
const th = { border:'1px solid #ddd', padding:8, background:'#f6f6f6' };
const td = { border:'1px solid #ddd', padding:8 };
