import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFarms, listPlans, createPlan, updatePlan, deletePlan, getRubberTypes, getPlanHistory, bumpPlanVersion, copyPlans } from '../api';

export default function Plans(){
  const [farms, setFarms] = useState([]);
  const [rubberTypes, setRubberTypes] = useState([]);
  const [farmId, setFarmId] = useState('');
  const [periodType, setPeriodType] = useState('MONTH'); // MONTH | QUARTER | YEAR
  const [periodKey, setPeriodKey] = useState(new Date().toISOString().slice(0,7)); // YYYY-MM | YYYY-Qn | YYYY
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ rubber_type_id:'', planned_qty:'', note:'' });
  const [msg, setMsg] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(()=>{ (async()=> {
    setFarms(await getFarms());
    setRubberTypes(await getRubberTypes().catch(()=>([{id:1,code:'mu_nuoc'},{id:2,code:'mu_tap'}])));
  })() },[]);

  const load = useCallback(async ()=>{
    const data = await listPlans({ farm_id: farmId || undefined, period_key: periodKey, period_type: periodType });
    setRows(data);
  }, [farmId, periodKey, periodType]);
  useEffect(()=>{ load() }, [load]);

  async function addPlan(e){
    e.preventDefault(); setMsg('');
    try{
      await createPlan({
        farm_id: Number(farmId),
        plot_id: null,
        rubber_type_id: Number(form.rubber_type_id),
        period_type: periodType,
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

  // ===== helpers for period keys =====
  const year = useMemo(()=> periodKey.slice(0,4), [periodKey]);
  function prevPeriodKey(){
    if(periodType==='MONTH'){
      const d = new Date(periodKey+"-01"); d.setMonth(d.getMonth()-1);
      return d.toISOString().slice(0,7);
    }
    if(periodType==='QUARTER'){
      const [y,q] = periodKey.split('-Q');
      const yy = Number(y); const qq = Number(q);
      const nq = qq===1? 4 : qq-1; const ny = qq===1? yy-1 : yy;
      return `${ny}-Q${nq}`;
    }
    if(periodType==='YEAR'){
      return String(Number(year)-1);
    }
    return periodKey;
  }

  async function onViewHistory(){
    const data = await getPlanHistory({ farm_id: farmId || undefined, period_type: periodType, period_key: periodKey });
    setHistory(data);
  }
  async function onBumpVersion(){
    await bumpPlanVersion({ farm_id: Number(farmId), period_type: periodType, period_key: periodKey });
    await load(); await onViewHistory();
  }
  async function onCopyPrev(){
    const srcKey = prevPeriodKey();
    await copyPlans({ src: { farm_id: Number(farmId), period_type: periodType, period_key: srcKey },
                     dst: { farm_id: Number(farmId), period_type: periodType, period_key: periodKey, version: 1 } });
    await load(); await onViewHistory();
  }

  return (
    <section>
      <h2>Kế hoạch</h2>
      <div style={{display:'flex', gap:12, alignItems:'end', marginBottom:12, flexWrap:'wrap'}}>
        <label>Kỳ<br/>
          <select value={periodType} onChange={e=>{ setPeriodType(e.target.value); setRows([]); }}>
            <option value="MONTH">Tháng</option>
            <option value="QUARTER">Quý</option>
            <option value="YEAR">Năm</option>
          </select>
        </label>
        {periodType==='MONTH' && (
          <label>Tháng<br/>
            <input type="month" value={periodKey} onChange={e=>setPeriodKey(e.target.value)} />
          </label>
        )}
        {periodType==='QUARTER' && (
          <label>Quý<br/>
            <QuarterPicker value={periodKey} onChange={setPeriodKey} />
          </label>
        )}
        {periodType==='YEAR' && (
          <label>Năm<br/>
            <input type="number" min="2000" max="2100" value={periodKey} onChange={e=>setPeriodKey(e.target.value)} />
          </label>
        )}
        <label>Nông trường<br/>
          <select value={farmId} onChange={e=>setFarmId(e.target.value)}>
            <option value="">-- Chọn --</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
  <button className="btn btn-primary btn-sm" onClick={load}>Tải</button>
        {farmId && (
          <>
            <button className="btn btn-outline btn-sm" onClick={onCopyPrev} title="Sao chép từ kỳ trước">Sao chép kỳ trước</button>
            <button className="btn btn-outline btn-sm" onClick={onBumpVersion} title="Tạo phiên bản mới từ phiên bản hiện tại">Tạo phiên bản mới</button>
            <button className="btn btn-outline btn-sm" onClick={onViewHistory}>Xem lịch sử</button>
          </>
        )}
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
          <button className="btn btn-primary">Thêm</button>
          {msg && <span style={{marginLeft:8}}>{msg}</span>}
        </form>
      )}

      <table style={{borderCollapse:'collapse', width:'100%'}}>
        <thead><tr>
          <th style={th}>Nông trường</th><th style={th}>Loại mủ</th><th style={th}>Phiên bản</th>
          <th style={th}>Kế hoạch (kg)</th><th style={th}>Ghi chú</th><th style={th}></th>
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
              <td style={td}><button className="btn btn-outline btn-sm" onClick={()=>onDelete(r.id)}>Xoá</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {history.length>0 && (
        <div style={{marginTop:16}}>
          <h3>Lịch sử version</h3>
          <table style={{borderCollapse:'collapse', width:'100%'}}>
            <thead><tr>
              <th style={th}>RT</th><th style={th}>Version</th><th style={th}>Planned</th><th style={th}>Note</th>
            </tr></thead>
            <tbody>
              {history.map((h,i)=>(
                <tr key={i}>
                  <td style={td}>{h.rubber_type}</td>
                  <td style={td}>{h.version}</td>
                  <td style={td}>{Number(h.planned_qty||0).toLocaleString('vi-VN')}</td>
                  <td style={td}>{h.note||''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
const th = { padding:10, borderBottom:'1px solid #e5e7eb', textAlign:'left' };
const td = { borderBottom:'1px solid #f0f0f0', padding:10 };

function QuarterPicker({ value, onChange }){
  const [y, setY] = useState(value.split('-Q')[0] || String(new Date().getFullYear()));
  const [q, setQ] = useState(value.split('-Q')[1] || '1');
  useEffect(()=>{ onChange(`${y}-Q${q}`); }, [y, q, onChange]);
  return (
    <div style={{display:'flex', gap:8}}>
      <input type="number" min="2000" max="2100" value={y} onChange={e=>setY(e.target.value)} style={{width:90}} />
      <select value={q} onChange={e=>setQ(e.target.value)}>
        <option value="1">Q1</option>
        <option value="2">Q2</option>
        <option value="3">Q3</option>
        <option value="4">Q4</option>
      </select>
    </div>
  );
}
