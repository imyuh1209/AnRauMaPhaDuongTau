// client/src/pages/Dashboard.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { getDashboard, getFarms, saveActual } from '../api';
import { fmtDDMMYYYY } from '../utils/date';
import DateInput from '../components/DateInput.jsx';

export default function Dashboard(){
  const today = new Date().toISOString().slice(0,10);
  const [date, setDate] = useState(today);
  const [farmId, setFarmId] = useState('');
  const [rows, setRows] = useState([]);
  const [plotRows, setPlotRows] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [quick, setQuick] = useState({});
  const [savingKey, setSavingKey] = useState('');
  const [quickPlot, setQuickPlot] = useState({});
  const [savingPlotKey, setSavingPlotKey] = useState('');
  
  

  const load = useCallback(async ()=>{
    setLoading(true); setErr('');
    try{
      const data = await getDashboard({ date, ...(farmId?{farm_id:farmId}:{}) });
      setRows(data.rows || []);
      setPlotRows(data.plots || []);
      if (!farms.length) setFarms(data.farms || []);
    }catch(e){ setErr(String(e)) }
    setLoading(false);
  }, [date, farmId, farms.length]);

  useEffect(()=>{ (async()=>{ try{ setFarms(await getFarms()); }catch{ /* empty */ } })() },[]);
  useEffect(()=>{ load() },[load]);
  
  // ===== Quick date helpers =====
  function toISO(d){ return new Date(d).toISOString().slice(0,10); }
  function setToday(){ setDate(toISO(new Date())); }
  function setYesterday(){ const x = new Date(); x.setDate(x.getDate()-1); setDate(toISO(x)); }
  function shiftDay(delta){ const x = new Date(date+'T00:00:00'); x.setDate(x.getDate()+delta); setDate(toISO(x)); }
  function shiftMonth(delta){ const x = new Date(date+'T00:00:00'); x.setMonth(x.getMonth()+delta); setDate(toISO(x)); }
  

  function color(pct){
    if(pct == null) return undefined;
    if(pct >= 98) return '#0a6';
    if(pct >= 90) return '#c90';
    return '#c33';
  }

  async function saveToday(rubberTypeId){
    if(!farmId){ alert('Hãy chọn Nông trường trước khi nhập.'); return; }
    const qtyStr = String(quick[rubberTypeId] ?? '').trim();
    const qty = Number(qtyStr || 0);
    if(Number.isNaN(qty)){ alert('Số lượng không hợp lệ'); return; }
    const rubber_type_id = Number(rubberTypeId);
    if(!rubber_type_id){ alert('Không xác định được loại mủ'); return; }

    try{
      setSavingKey(String(rubberTypeId));
      await saveActual({ date, farm_id:Number(farmId), plot_id:null, rubber_type_id, qty, note:'quick-input' });
      setQuick(prev => ({ ...prev, [rubberTypeId]: '' }));
      await load();
    }catch(e){ alert('Lưu thất bại: '+e.message); }
    finally{ setSavingKey(''); }
  }

  async function saveTodayPlot(plotId, rubberTypeId){
    if(!farmId){ alert('Hãy chọn Nông trường trước khi nhập.'); return; }
    const k = `${plotId}:${rubberTypeId}`;
    const qtyStr = String(quickPlot[k] ?? '').trim();
    const qty = Number(qtyStr || 0);
    if(Number.isNaN(qty)){ alert('Số lượng không hợp lệ'); return; }
    const rubber_type_id = Number(rubberTypeId);
    const plot_id = Number(plotId);
    if(!rubber_type_id || !plot_id){ alert('Thiếu thông tin lô hoặc loại mủ'); return; }

    try{
      setSavingPlotKey(k);
      await saveActual({ date, farm_id:Number(farmId), plot_id, rubber_type_id, qty, note:'quick-input-plot' });
      setQuickPlot(prev => ({ ...prev, [k]: '' }));
      await load();
    }catch(e){ alert('Lưu thất bại: '+e.message); }
    finally{ setSavingPlotKey(''); }
  }

  

  // Bỏ chế độ gộp theo lô: chỉ hiển thị theo loại mủ cho từng lô

  // ====== Chart data (Plan vs Actual) ======
  const chartLabels = useMemo(()=> rows.map(r=> r.rubber_type || ''), [rows]);
  const chartActual = useMemo(()=> rows.map(r=> Number(r.actual_mtd||0)), [rows]);
  const chartPlan = useMemo(()=> rows.map(r=> r.plan_m==null ? 0 : Number(r.plan_m||0)), [rows]);

  const topPlotDeficits = useMemo(()=>{
    const arr = plotRows.map(r=>{
      const plan = r.plan_m==null ? 0 : Number(r.plan_m||0);
      const actualMtd = Number(r.actual_mtd||0);
      const deficit = Math.max(0, plan - actualMtd);
      return {
        label: `${r.plot_code} • ${r.rubber_type}`,
        plan,
        actual: actualMtd,
        deficit
      };
    });
    arr.sort((a,b)=> b.deficit - a.deficit);
    return arr.slice(0, 10);
  }, [plotRows]);

  function exportCsvDashboard(){
    const lines = [];
    lines.push(['Báo cáo tiến độ']);
    lines.push(['Ngày', fmtDDMMYYYY(date)]);
    lines.push(['Nông trường', farmId ? (farms.find(f=>String(f.id)===String(farmId))?.name || String(farmId)) : 'Tất cả']);
    lines.push([]);
    // Theo loại mủ
    lines.push(['Theo loại mủ']);
    const h1 = ['Loại mủ','Hôm nay','MTD'];
    h1.push('Kế hoạch tháng','Tiến độ (%)','Còn thiếu (kg)');
    lines.push(h1);
    for(const r of rows){
      const plan = r.plan_m==null ? null : Number(r.plan_m||0);
      const actualMtd = Number(r.actual_mtd||0);
      const deficit = plan==null ? null : Math.max(0, plan - actualMtd);
      const pct = r.completion_pct==null ? null : Number(r.completion_pct||0);
      const row = [r.rubber_type, Number(r.actual_today||0), actualMtd];
      row.push(plan==null?null:plan, pct==null?null:`${pct}%`, deficit==null?null:deficit);
      lines.push(row);
    }
    lines.push([]);
    // Theo lô (nếu chọn NT)
    lines.push(['Theo lô', farmId? (farms.find(f=>String(f.id)===String(farmId))?.name || '') : '']);
    const h2 = ['Mã lô','Loại mủ','Hôm nay','MTD'];
    h2.push('Kế hoạch tháng (lô)','Tiến độ (%)','Còn thiếu (kg)');
    lines.push(h2);
    for(const r of plotRows){
      const plan = r.plan_m==null ? null : Number(r.plan_m||0);
      const actualMtd = Number(r.actual_mtd||0);
      const deficit = plan==null ? null : Math.max(0, plan - actualMtd);
      const pct = r.completion_pct==null ? null : Number(r.completion_pct||0);
      const row = [r.plot_code, r.rubber_type, Number(r.actual_today||0), actualMtd];
      row.push(plan==null?null:plan, pct==null?null:`${pct}%`, deficit==null?null:deficit);
      lines.push(row);
    }

    const csv = lines.map(toCsvRow).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fnFarm = farmId ? String(farmId) : 'all';
    a.href = url;
    a.download = `dashboard_${date}_farm_${fnFarm}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <section>
  <h2>Quản lý tiến độ</h2>
      <div className="toolbar">
        <label>Ngày<br/>
          <DateInput value={date} onChange={setDate} />
        </label>
        <div className="row" style={{gap:8, alignItems:'center'}}>
        <button className="btn btn-secondary btn-sm" onClick={setToday}>Hôm nay</button>
          <button className="btn btn-secondary btn-sm" onClick={setYesterday}>Hôm qua</button>
                    <span className="muted">Tháng:</span>
          <button className="btn btn-outline btn-sm" title="Chuyển về tháng trước" onClick={()=>shiftMonth(-1)}>← Tháng trước</button>
          <button className="btn btn-outline btn-sm" title="Chuyển sang tháng sau" onClick={()=>shiftMonth(1)}>Tháng sau →</button>
        </div>
        <label>Nông trường<br/>
          <select value={farmId} onChange={e=>setFarmId(e.target.value)}>
            <option value="">Tất cả</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        <button className="btn btn-primary btn-sm" onClick={load}>Xem</button>
        <div style={{marginLeft:'auto', display:'flex', gap:8}}>
          <button className="btn btn-outline btn-sm" onClick={()=>exportCsvDashboard()}>Xuất CSV</button>
          <button className="btn btn-outline btn-sm" onClick={()=>window.print()}>In/PDF</button>
        </div>
      </div>

      {loading && (
        <div className="stack" style={{marginBottom:8}}>
          <div className="skeleton" style={{height:22}}></div>
          <div className="skeleton" style={{height:22}}></div>
          <div className="skeleton" style={{height:22}}></div>
        </div>
      )}
      {err && <p style={{color:'#c33'}}>{err}</p>}
      {!farmId && (
        <p style={{margin:'6px 0 12px', color:'#555'}}>
          Nông trường: <b>Tất cả</b> — Chọn <b>Nông trường</b> để nhập nhanh sản lượng “Hôm nay” và theo dõi tiến độ tháng.
        </p>
      )}

      {/* Biểu đồ Kế hoạch vs Thực tế theo loại mủ */}
      {rows.length>0 && (
        <div className="card" style={{margin:'12px 0'}}>
          <h3 style={{margin:'8px 0'}}>Biểu đồ Kế hoạch vs Sản lượng đã tích luỹ</h3>
          <div style={{display:'flex', gap:16, alignItems:'center', margin:'4px 0 10px'}}>
            <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
              <span style={{display:'inline-block', width:12, height:12, background:'#16a34a', borderRadius:2}}></span>
              Sản lượng đã tích luỹ
            </span>
            <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
              <span style={{display:'inline-block', width:12, height:12, background:'#6b7280', borderRadius:2}}></span>
              Kế hoạch tháng
            </span>
          </div>
          <SimpleBarChart
            labels={chartLabels}
            seriesA={chartActual}
            seriesB={chartPlan}
            colorA="#16a34a"
            colorB="#6b7280"
          />
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th style={th}>Loại mủ</th>
            <th style={th}>Sản lượng hôm nay</th>
            <th style={th}>Sản lượng lũy kế</th>
            <th style={th}>Kế hoạch tháng</th>
            <th style={th}>Tiến độ</th>
            <th style={th}>Còn thiếu (kg)</th>
            <th style={th}>Nhập hôm nay (kg)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>{
            const plan = r.plan_m==null ? null : Number(r.plan_m||0);
            const actualMtd = Number(r.actual_mtd||0);
            const deficit = plan==null ? null : Math.max(0, plan - actualMtd);
            const pct = r.completion_pct==null ? null : Number(r.completion_pct||0);
            return (
              <tr key={i} className="animate-fade-in">
                <td style={td}>{r.rubber_type}</td>
                <td style={td}>{Number(r.actual_today||0).toLocaleString('vi-VN')}</td>
                <td style={td}>{Number(r.actual_mtd||0).toLocaleString('vi-VN')}</td>
                <td style={td}>{plan==null?'-':plan.toLocaleString('vi-VN')}</td>
                <td style={td}>
                  {plan==null ? '-' : (
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <div className="progress" style={{flex:1}}>
                        <div className="bar" style={{width:`${Math.max(0, Math.min(100, pct||0))}%`}}></div>
                      </div>
                      <span style={{minWidth:52, color: color(pct)}}>{pct==null?'-':`${pct}%`}</span>
                    </div>
                  )}
                </td>
                <td style={td}>{deficit==null?'-':deficit.toLocaleString('vi-VN')}</td>
                <td style={td}>
                  <div style={{display:'flex', gap:8}}>
                    <input
                      type="number" step="0.001" min="0"
                      value={quick[r.rubber_type_id] ?? ''}
                      onChange={e=>setQuick(prev => ({ ...prev, [r.rubber_type_id]: e.target.value }))}
                      placeholder="kg hôm nay" style={{width:130}} disabled={!farmId}
                    />
                    <button className="btn btn-primary btn-sm" onClick={()=>saveToday(r.rubber_type_id)} disabled={!farmId || savingKey===String(r.rubber_type_id)}>
                      {savingKey===String(r.rubber_type_id) ? 'Đang lưu…' : 'Lưu'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {farmId && (
        <div style={{marginTop:16}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{margin:'10px 0'}}>Tiến độ theo lô</h3>
          </div>

            {/* Biểu đồ Top 10 lô còn thiếu */}
            {topPlotDeficits.length>0 && (
              <div style={{border:'1px solid #eee', borderRadius:8, padding:12, margin:'12px 0'}}>
                <h4 style={{margin:'4px 0 10px'}}>Top 10 lô còn thiếu (kg)</h4>
                <div style={{display:'flex', gap:16, alignItems:'center', margin:'4px 0 10px'}}>
                  <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
                    <span style={{display:'inline-block', width:12, height:12, background:'#f59e0b', borderRadius:2}}></span>
                    Sản lượng đã tích luỹ
                  </span>
                  <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
                    <span style={{display:'inline-block', width:12, height:12, background:'#3b82f6', borderRadius:2}}></span>
                    Kế hoạch tháng (lô)
                  </span>
                </div>
                <SimpleBarChart
                  labels={topPlotDeficits.map(x=>x.label)}
                  seriesA={topPlotDeficits.map(x=>x.actual)}
                  seriesB={topPlotDeficits.map(x=>x.plan)}
                  colorA="#f59e0b" /* orange */
                  colorB="#3b82f6" /* blue */
                />
              </div>
            )}

            <table style={{borderCollapse:'collapse',width:'100%'}}>
              <thead>
                <tr>
                  <th style={th}>Mã lô</th>
                  <th style={th}>Loại mủ</th>
                  <th style={th}>Thực tế hôm nay</th>
                  <th style={th}>Thực tế lũy kế (MTD)</th>
                  <th style={th}>Kế hoạch tháng (lô)</th>
                  <th style={th}>Tiến độ</th>
                  <th style={th}>Còn thiếu (kg)</th>
                  <th style={th}>Nhập hôm nay (kg)</th>
                </tr>
              </thead>
              <tbody>
                {plotRows.map((r,i)=>{
                  const plan = r.plan_m==null ? null : Number(r.plan_m||0);
                  const actualMtd = Number(r.actual_mtd||0);
                  const deficit = plan==null ? null : Math.max(0, plan - actualMtd);
                  const pct = r.completion_pct==null ? null : Number(r.completion_pct||0);
                  const k = `${r.plot_id}:${r.rubber_type_id}`;
                  return (
                    <tr key={`${r.plot_id}-${r.rubber_type_id}-${i}`} className="animate-fade-in">
                      <td style={td}>{r.plot_code}</td>
                      <td style={td}>{r.rubber_type}</td>
                      <td style={td}>{Number(r.actual_today||0).toLocaleString('vi-VN')}</td>
                      <td style={td}>{Number(r.actual_mtd||0).toLocaleString('vi-VN')}</td>
                      <td style={td}>{plan==null?'-':plan.toLocaleString('vi-VN')}</td>
                      <td style={td}>
                        {plan==null ? '-' : (
                          <div style={{display:'flex', alignItems:'center', gap:8}}>
                            <div className="progress" style={{flex:1}}>
                              <div className="bar" style={{width:`${Math.max(0, Math.min(100, pct||0))}%`}}></div>
                            </div>
                            <span style={{minWidth:52, color: color(pct)}}>{pct==null?'-':`${pct}%`}</span>
                          </div>
                        )}
                      </td>
                      <td style={td}>{deficit==null?'-':deficit.toLocaleString('vi-VN')}</td>
                      <td style={td}>
                        <div style={{display:'flex', gap:8}}>
                          <input
                            type="number" step="0.001" min="0"
                            value={quickPlot[k] ?? ''}
                            onChange={e=>setQuickPlot(prev => ({ ...prev, [k]: e.target.value }))}
                            placeholder="kg hôm nay" style={{width:130}} disabled={!farmId || !r.rubber_type_id}
                          />
                          <button className="btn btn-primary btn-sm" onClick={()=>saveTodayPlot(r.plot_id, r.rubber_type_id)} disabled={!farmId || !r.rubber_type_id || savingPlotKey===k}>
                            {savingPlotKey===k ? 'Đang lưu…' : 'Lưu'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!plotRows.length && !loading && (
                  <tr><td colSpan="8"><div className="empty">Chưa có dữ liệu lô hoặc chưa có kế hoạch theo lô</div></td></tr>
                )}
              </tbody>
            </table>
          
        </div>
      )}
    </section>
  );
}

const th = { padding:10, borderBottom:'1px solid #e5e7eb', textAlign:'left' };
const td = { borderBottom:'1px solid #f0f0f0', padding:10 };

// ===== CSV Export =====
function toCsvRow(arr){
  return arr.map(v=>{
    if(v==null) return '';
    const s = String(v);
    if(s.includes(',') || s.includes('\n') || s.includes('"')){
      return '"' + s.replace(/"/g,'""') + '"';
    }
    return s;
  }).join(',');
}

// ===== Lightweight Bar Chart (no external deps) =====
function SimpleBarChart({ labels, seriesA, seriesB, colorA = '#16a34a', colorB = '#6b7280' }){
  const max = Math.max(1, ...seriesA.map(n=>Number(n||0)), ...seriesB.map(n=>Number(n||0)));
  return (
    <div>
      <div style={{fontSize:12, color:'#666', marginBottom:8}}>Thang đo tối đa: {max.toLocaleString('vi-VN')} kg</div>
      <div style={{display:'flex', flexDirection:'column', gap:8}}>
        {labels.map((label, i)=>{
          const a = Number(seriesA[i]||0), b = Number(seriesB[i]||0);
          const aw = Math.max(0, Math.min(100, (a / max) * 100));
          const bw = Math.max(0, Math.min(100, (b / max) * 100));
          return (
            <div key={i}>
              <div style={{fontSize:13, color:'#444', marginBottom:4}}>{label}</div>
              <div style={{display:'flex', flexDirection:'column', gap:4}}>
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  <div style={{background:colorA, height:12, width:`${aw}%`, borderRadius:3}}></div>
                  <div style={{minWidth:90, fontSize:12, color:'#333'}}>{a.toLocaleString('vi-VN')} kg</div>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  <div style={{background:colorB, height:12, width:`${bw}%`, borderRadius:3}}></div>
                  <div style={{minWidth:90, fontSize:12, color:'#333'}}>{b.toLocaleString('vi-VN')} kg</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
