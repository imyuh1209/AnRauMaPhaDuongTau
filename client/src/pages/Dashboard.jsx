// client/src/pages/Dashboard.jsx
import { useEffect, useState, useCallback } from 'react';
import { getDashboard, getFarms, saveActual } from '../api';

export default function Dashboard(){
  const today = new Date().toISOString().slice(0,10);
  const [date, setDate] = useState(today);
  const [farmId, setFarmId] = useState('');
  const [rows, setRows] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [quick, setQuick] = useState({});
  const [savingKey, setSavingKey] = useState('');

  const load = useCallback(async ()=>{
    setLoading(true); setErr('');
    try{
      const data = await getDashboard({ date, ...(farmId?{farm_id:farmId}:{}) });
      setRows(data.rows || []);
      if (!farms.length) setFarms(data.farms || []);
    }catch(e){ setErr(String(e)) }
    setLoading(false);
  }, [date, farmId, farms.length]);

  useEffect(()=>{ (async()=>{ try{ setFarms(await getFarms()); }catch{ /* empty */ } })() },[]);
  useEffect(()=>{ load() },[load]);

  function color(pct){
    if(pct == null) return undefined;
    if(pct >= 98) return '#0a6';
    if(pct >= 90) return '#c90';
    return '#c33';
  }

  const RUBBER_CODE_TO_ID = { mu_nuoc: 1, mu_tap: 2 };

  async function saveToday(rubberCode){
    if(!farmId){ alert('Hãy chọn Nông trường trước khi nhập.'); return; }
    const qtyStr = (quick[rubberCode] ?? '').trim();
    const qty = Number(qtyStr || 0);
    if(Number.isNaN(qty)){ alert('Số lượng không hợp lệ'); return; }
    const rubber_type_id = RUBBER_CODE_TO_ID[rubberCode];
    if(!rubber_type_id){ alert('Không xác định được loại mủ'); return; }

    try{
      setSavingKey(rubberCode);
      await saveActual({ date, farm_id:Number(farmId), plot_id:null, rubber_type_id, qty, note:'quick-input' });
      setQuick(prev => ({ ...prev, [rubberCode]: '' }));
      await load();
    }catch(e){ alert('Lưu thất bại: '+e.message); }
    finally{ setSavingKey(''); }
  }

  return (
    <section>
  <h2>Tổng quan</h2>
      <div style={{display:'flex',gap:12,alignItems:'end',marginBottom:12}}>
        <label>Ngày<br/>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
        </label>
        <label>Nông trường<br/>
          <select value={farmId} onChange={e=>setFarmId(e.target.value)}>
            <option value="">Tất cả</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
  <button className="btn btn-primary btn-sm" onClick={load}>Xem</button>
      </div>

      {loading && <p>Đang tải…</p>}
      {err && <p style={{color:'#c33'}}>{err}</p>}
      {!farmId && <p style={{margin:'6px 0 12px', color:'#555'}}>Chọn <b>Nông trường</b> để nhập nhanh “Thực tế hôm nay”.</p>}

      <table style={{borderCollapse:'collapse',width:'100%'}}>
        <thead>
          <tr>
            <th style={th}>Loại mủ</th>
            <th style={th}>Thực tế hôm nay</th>
            <th style={th}>Thực tế lũy kế (MTD)</th>
            <th style={th}>Kế hoạch tháng</th>
            <th style={th}>% hoàn thành</th>
            <th style={th}>Nhập hôm nay (kg)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>{
            const code = r.rubber_type;
            return (
              <tr key={i}>
                <td style={td}>{code}</td>
                <td style={td}>{Number(r.actual_today||0).toLocaleString('vi-VN')}</td>
                <td style={td}>{Number(r.actual_mtd||0).toLocaleString('vi-VN')}</td>
                <td style={td}>{r.plan_m==null?'-':Number(r.plan_m||0).toLocaleString('vi-VN')}</td>
                <td style={{...td, color: color(r.completion_pct)}}>{r.completion_pct==null?'-':(r.completion_pct+'%')}</td>
                <td style={td}>
                  <div style={{display:'flex', gap:8}}>
                    <input
                      type="number" step="0.001" min="0"
                      value={quick[code] ?? ''}
                      onChange={e=>setQuick(prev => ({ ...prev, [code]: e.target.value }))}
                      placeholder="kg hôm nay" style={{width:130}} disabled={!farmId}
                    />
                    <button className="btn btn-primary btn-sm" onClick={()=>saveToday(code)} disabled={!farmId || savingKey===code}>
                      {savingKey===code ? 'Đang lưu…' : 'Lưu'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

const th = { padding:10, borderBottom:'1px solid #e5e7eb', textAlign:'left' };
const td = { borderBottom:'1px solid #f0f0f0', padding:10 };
