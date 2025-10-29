import { useEffect, useState, useCallback, useMemo } from 'react';
import { getStats, getFarms, listConversions, listActuals } from '../api';
import { fmtDDMMYYYY } from '../utils/date';
import DateInput from '../components/DateInput.jsx';

export default function Stats(){
  const today = new Date().toISOString().slice(0,10);
  const monthStart = today.slice(0,7) + '-01';
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);
  const [farmId, setFarmId] = useState('');
  const [farms, setFarms] = useState([]);
  const [byFarm, setByFarm] = useState([]);
  const [byPlot, setByPlot] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [showDry, setShowDry] = useState(false);
  const [conversions, setConversions] = useState([]);
  const [metrics, setMetrics] = useState({ daysWithData:0, recordCount:0, min:null, minDate:null, max:null, maxDate:null });

  const load = useCallback(async ()=>{
    setLoading(true); setErr('');
    try{
      const data = await getStats({ date_from: dateFrom, date_to: dateTo, ...(farmId?{farm_id:farmId}:{}) });
      setByFarm(Array.isArray(data.byFarm)?data.byFarm:[]);
      setByPlot(Array.isArray(data.byPlot)?data.byPlot:[]);
      if(!farms.length) setFarms(Array.isArray(data.farms)?data.farms:[]);
    }catch(e){ setErr(String(e)); }
    setLoading(false);
  }, [dateFrom, dateTo, farmId, farms.length]);

  useEffect(()=>{ (async()=>{ try{ setFarms(await getFarms()); }catch{} })() },[]);
  useEffect(()=>{ load() },[load]);
  useEffect(()=>{ (async()=>{ try{ const data = await listConversions(farmId? {farm_id:farmId} : {}); setConversions(Array.isArray(data)?data:[]); }catch{ setConversions([]); } })() },[farmId]);
  // Tải thêm dữ liệu để tính chỉ số "Số ngày có dữ liệu", "Số lượt ghi", min/max/ngày cao nhất"
  useEffect(()=>{ (async()=>{
    try{
      const rows = await listActuals({ date_from: dateFrom, date_to: dateTo, ...(farmId?{farm_id:farmId}:{}) , limit: 5000 });
      const totalsByDate = new Map();
      for(const r of rows){
        const d = r.date;
        const prev = totalsByDate.get(d) || 0;
        totalsByDate.set(d, prev + Number(r.qty||0));
      }
      const entries = Array.from(totalsByDate.entries());
      const withData = entries.filter(([_,v])=> Number(v)>0);
      const recordCount = rows.length;
      if(withData.length){
        withData.sort((a,b)=> Number(a[1]) - Number(b[1]));
        const min = Number(withData[0][1]); const minDate = withData[0][0];
        withData.sort((a,b)=> Number(b[1]) - Number(a[1]));
        const max = Number(withData[0][1]); const maxDate = withData[0][0];
        setMetrics({ daysWithData: withData.length, recordCount, min, minDate, max, maxDate });
      }else{
        setMetrics({ daysWithData: 0, recordCount, min:null, minDate:null, max:null, maxDate:null });
      }
    }catch{
      setMetrics({ daysWithData:0, recordCount:0, min:null, minDate:null, max:null, maxDate:null });
    }
  })() }, [dateFrom, dateTo, farmId]);

  const factorIndex = useMemo(()=>{
    const dTo = new Date(dateTo);
    const byRt = new Map();
    for(const c of conversions){
      const arr = byRt.get(c.rubber_type_id) || [];
      arr.push(c);
      byRt.set(c.rubber_type_id, arr);
    }
    const pickFor = (rtId, farmIdRow)=>{
      const arr = byRt.get(rtId) || [];
      if(!arr.length) return null;
      const farmNum = farmIdRow!=null ? Number(farmIdRow) : null;
      const farmList = farmNum!=null ? arr.filter(x=>x.farm_id===farmNum) : [];
      const defaultList = arr.filter(x=>x.farm_id==null);
      const pickList = farmList.length ? farmList : (defaultList.length ? defaultList : arr);
      pickList.sort((a,b)=> String(b.effective_from).localeCompare(String(a.effective_from)));
      let chosen = null;
      for(const c of pickList){ if(new Date(c.effective_from) <= dTo){ chosen = c; break; } }
      if(!chosen) chosen = pickList[0];
      return chosen?.factor_to_dry_ton!=null ? Number(chosen.factor_to_dry_ton) : null;
    };
    return { pickFor };
  }, [conversions, dateTo]);

  const totalFarmActual = useMemo(()=> byFarm.reduce((s,r)=> s + Number(r.actual_qty||0), 0), [byFarm]);
  const totalFarmDry = useMemo(()=> byFarm.reduce((s,r)=>{
    const f = factorIndex.pickFor(Number(r.rubber_type_id), Number(r.farm_id));
    return s + (f? Number(r.actual_qty||0) * f : 0);
  }, 0), [byFarm, factorIndex]);

  const totalPlotActual = useMemo(()=> byPlot.reduce((s,r)=> s + Number(r.actual_qty||0), 0), [byPlot]);
  const totalPlotDry = useMemo(()=> byPlot.reduce((s,r)=>{
    const f = factorIndex.pickFor(Number(r.rubber_type_id), farmId?Number(farmId):null);
    return s + (f? Number(r.actual_qty||0) * f : 0);
  }, 0), [byPlot, factorIndex, farmId]);

  const daysCount = useMemo(()=>{
    try{
      const df = new Date(`${dateFrom}T00:00:00`);
      const dt = new Date(`${dateTo}T00:00:00`);
      const n = Math.floor((dt - df) / 86400000) + 1;
      return n > 0 ? n : 1;
    }catch{ return 1; }
  }, [dateFrom, dateTo]);

  // ===== Quick range helpers =====
  const toISO = (d)=> new Date(d).toISOString().slice(0,10);
  const startOfMonth = (d)=>{ const x = new Date(d); x.setDate(1); return toISO(x); };
  const endOfMonth = (d)=>{ const x = new Date(d); x.setMonth(x.getMonth()+1); x.setDate(0); return toISO(x); };
  const startOfWeekMon = (d)=>{ const x = new Date(d); const day = x.getDay(); const diff = (day===0?6:day-1); x.setDate(x.getDate()-diff); return toISO(x); };
  const endOfWeekSun = (d)=>{ const x = new Date(startOfWeekMon(d)); x.setDate(x.getDate()+6); return toISO(x); };

  const setRangeToday = ()=>{ const t = toISO(new Date()); setDateFrom(t); setDateTo(t); };
  const setRangeThisWeek = ()=>{ const t = new Date(); setDateFrom(startOfWeekMon(t)); setDateTo(endOfWeekSun(t)); };
  const setRangeThisMonth = ()=>{ const t = new Date(); setDateFrom(startOfMonth(t)); setDateTo(toISO(t)); };
  const setRangePrevMonth = ()=>{ const t = new Date(); t.setMonth(t.getMonth()-1); setDateFrom(startOfMonth(t)); setDateTo(endOfMonth(t)); };
  const shiftMonth = (delta)=>{ const df = new Date(dateFrom+'T00:00:00'); df.setMonth(df.getMonth()+delta); const dt = new Date(df); dt.setMonth(df.getMonth()); dt.setDate(0); // end of target month
    setDateFrom(startOfMonth(df)); setDateTo(endOfMonth(df)); };

  function exportCsv(){
    const lines = [];
    lines.push(['Thống kê sản lượng']);
    lines.push(['Từ ngày', fmtDDMMYYYY(dateFrom)]);
    lines.push(['Đến ngày', fmtDDMMYYYY(dateTo)]);
    lines.push(['Nông trường', farmId ? (farms.find(f=>String(f.id)===String(farmId))?.name || String(farmId)) : 'Tất cả']);
    lines.push([]);
    // Farm section
    const farmHeader = ['Nông trường','Loại mủ','Sản lượng (kg)','TB/ngày (kg)'];
    if(showDry){ farmHeader.push('Quy khô (kg)','Quy khô TB/ngày (kg)'); }
    lines.push(['Theo nông trường']);
    lines.push(farmHeader);
    for(const r of byFarm){
      const f = factorIndex.pickFor(Number(r.rubber_type_id), Number(r.farm_id));
      const dry = f? Number(r.actual_qty||0) * f : null;
      const avg = Number(r.actual_qty||0) / daysCount;
      const row = [r.farm_name, r.rubber_type, Number(r.actual_qty||0), Number(avg)];
      if(showDry){ row.push(dry==null?null:Number(dry)); row.push(dry==null?null:Number(dry/daysCount)); }
      lines.push(row);
    }
    // Totals
    const tFarm = ['TỔNG','','', Number(totalFarmActual/daysCount)];
    tFarm[2] = Number(totalFarmActual);
    if(showDry){ tFarm.push(Number(totalFarmDry), Number(totalFarmDry/daysCount)); }
    lines.push(tFarm);
    lines.push([]);

    // Plot section
    lines.push(['Theo lô', farmId? (farms.find(f=>String(f.id)===String(farmId))?.name || '') : '(chọn Nông trường để xem)']);
    const plotHeader = ['Mã lô','Loại mủ','Sản lượng (kg)','TB/ngày (kg)'];
    if(showDry){ plotHeader.push('Quy khô (kg)','Quy khô TB/ngày (kg)'); }
    lines.push(plotHeader);
    for(const r of byPlot){
      const f = factorIndex.pickFor(Number(r.rubber_type_id), farmId?Number(farmId):null);
      const dry = f? Number(r.actual_qty||0) * f : null;
      const avg = Number(r.actual_qty||0) / daysCount;
      const row = [r.plot_code, r.rubber_type, Number(r.actual_qty||0), Number(avg)];
      if(showDry){ row.push(dry==null?null:Number(dry)); row.push(dry==null?null:Number(dry/daysCount)); }
      lines.push(row);
    }
    if(farmId){
      const tPlot = ['TỔNG','','', Number(totalPlotActual/daysCount)];
      tPlot[2] = Number(totalPlotActual);
      if(showDry){ tPlot.push(Number(totalPlotDry), Number(totalPlotDry/daysCount)); }
      lines.push(tPlot);
    }

    const csv = lines.map(toCsvRow).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fnFarm = farmId ? String(farmId) : 'all';
    a.href = url;
    a.download = `stats_${dateFrom}_${dateTo}_farm_${fnFarm}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <h2>Thống kê sản lượng</h2>

      <div className="toolbar">
        <label>Từ ngày<br/>
          <DateInput value={dateFrom} onChange={setDateFrom} />
        </label>
        <label>Đến ngày<br/>
          <DateInput value={dateTo} onChange={setDateTo} />
        </label>
        <label>Nông trường<br/>
          <select value={farmId} onChange={e=>setFarmId(e.target.value)}>
            <option value="">Tất cả</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        <button className="btn btn-primary btn-sm" onClick={load}>Xem</button>
        <label style={{marginLeft:8}}>Quy khô
          <input type="checkbox" checked={showDry} onChange={e=>setShowDry(e.target.checked)} style={{marginLeft:6}} />
        </label>
        <div className="row" style={{marginLeft:'auto', display:'flex', gap:8, alignItems:'center'}}>
          <span className="muted">Nhanh:</span>
          <button className="btn btn-secondary btn-sm" onClick={setRangeToday}>Hôm nay</button>
          <button className="btn btn-secondary btn-sm" onClick={setRangeThisWeek}>Tuần này</button>
          <button className="btn btn-secondary btn-sm" onClick={setRangeThisMonth}>Tháng này</button>
          <button className="btn btn-secondary btn-sm" onClick={setRangePrevMonth}>Tháng trước</button>
          <button className="btn btn-outline btn-sm" onClick={()=>exportCsv()}>Xuất CSV</button>
          <button className="btn btn-outline btn-sm" onClick={()=>window.print()}>In/PDF</button>
        </div>
      </div>

      {/* Chỉ số bổ sung */}
      <div className="card" style={{marginBottom:12, display:'flex', gap:18, flexWrap:'wrap'}}>
        <div>Phạm vi: <b>{fmtDDMMYYYY(dateFrom)}</b> → <b>{fmtDDMMYYYY(dateTo)}</b>{farmId? ` — NT: ${farms.find(f=>String(f.id)===String(farmId))?.name||farmId}`:''}</div>
        <div>Số ngày có dữ liệu: <b>{metrics.daysWithData}</b></div>
        <div>Số lượt ghi: <b>{metrics.recordCount}</b></div>
        <div>Min/ngày: <b>{metrics.min==null?'-':Number(metrics.min).toLocaleString('vi-VN')}</b>{metrics.minDate?` (${fmtDDMMYYYY(metrics.minDate)})`:''}</div>
        <div>Max/ngày: <b>{metrics.max==null?'-':Number(metrics.max).toLocaleString('vi-VN')}</b>{metrics.maxDate?` (${fmtDDMMYYYY(metrics.maxDate)})`:''}</div>
      </div>

      {loading && (
        <div className="stack" style={{marginBottom:8}}>
          <div className="skeleton" style={{height:22}}></div>
          <div className="skeleton" style={{height:22}}></div>
          <div className="skeleton" style={{height:22}}></div>
        </div>
      )}
      {err && <p style={{color:'#c33'}}>{err}</p>}

      <h3 style={{margin:'10px 0'}}>Theo nông trường</h3>
      <table>
        <thead>
          <tr>
            <th style={th}>Nông trường</th>
            <th style={th}>Loại mủ</th>
            <th style={th}>Sản lượng (kg)</th>
            <th style={th}>TB/ngày (kg)</th>
            {showDry && <th style={th}>Quy khô (kg)</th>}
            {showDry && <th style={th}>Quy khô TB/ngày (kg)</th>}
          </tr>
        </thead>
        <tbody>
          {byFarm.map((r,i)=>{
            const f = factorIndex.pickFor(Number(r.rubber_type_id), Number(r.farm_id));
            const dry = f? Number(r.actual_qty||0) * f : null;
            const avg = Number(r.actual_qty||0) / daysCount;
            return (
              <tr key={i} className="animate-fade-in">
                <td style={td}>{r.farm_name}</td>
                <td style={td}>{r.rubber_type}</td>
                <td style={td}>{Number(r.actual_qty||0).toLocaleString('vi-VN')}</td>
                <td style={td}>{Number(avg).toLocaleString('vi-VN')}</td>
                {showDry && <td style={td}>{dry==null?'-':Number(dry).toLocaleString('vi-VN')}</td>}
                {showDry && <td style={td}>{dry==null?'-':Number(dry/daysCount).toLocaleString('vi-VN')}</td>}
              </tr>
            );
          })}
          {!byFarm.length && !loading && (
            <tr><td colSpan={showDry?6:4}><div className="empty">Chưa có dữ liệu</div></td></tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td style={{...td,fontWeight:600}}>TỔNG</td>
            <td style={td}></td>
            <td style={{...td,fontWeight:600}}>{Number(totalFarmActual).toLocaleString('vi-VN')}</td>
            <td style={{...td,fontWeight:600}}>{Number(totalFarmActual/daysCount).toLocaleString('vi-VN')}</td>
            {showDry && <td style={{...td,fontWeight:600}}>{Number(totalFarmDry).toLocaleString('vi-VN')}</td>}
            {showDry && <td style={{...td,fontWeight:600}}>{Number(totalFarmDry/daysCount).toLocaleString('vi-VN')}</td>}
          </tr>
        </tfoot>
      </table>

      <div style={{marginTop:18}}>
        <h3 style={{margin:'10px 0'}}>Theo lô {farmId? '— '+(farms.find(f=>String(f.id)===String(farmId))?.name || '') : '(chọn Nông trường để xem)'}</h3>
        <table style={{borderCollapse:'collapse',width:'100%'}}>
          <thead>
            <tr>
              <th style={th}>Mã lô</th>
              <th style={th}>Loại mủ</th>
              <th style={th}>Sản lượng (kg)</th>
              <th style={th}>TB/ngày (kg)</th>
              {showDry && <th style={th}>Quy khô (kg)</th>}
              {showDry && <th style={th}>Quy khô TB/ngày (kg)</th>}
            </tr>
          </thead>
          <tbody>
            {byPlot.map((r,i)=>{
              const f = factorIndex.pickFor(Number(r.rubber_type_id), farmId?Number(farmId):null);
              const dry = f? Number(r.actual_qty||0) * f : null;
              const avg = Number(r.actual_qty||0) / daysCount;
              return (
                <tr key={`${r.plot_id}-${r.rubber_type_id}-${i}`} className="animate-fade-in">
                  <td style={td}>{r.plot_code}</td>
                  <td style={td}>{r.rubber_type}</td>
                  <td style={td}>{Number(r.actual_qty||0).toLocaleString('vi-VN')}</td>
                  <td style={td}>{Number(avg).toLocaleString('vi-VN')}</td>
                  {showDry && <td style={td}>{dry==null?'-':Number(dry).toLocaleString('vi-VN')}</td>}
                  {showDry && <td style={td}>{dry==null?'-':Number(dry/daysCount).toLocaleString('vi-VN')}</td>}
                </tr>
              );
            })}
            {!byPlot.length && !loading && (
              <tr><td colSpan={showDry?6:4}><div className="empty">{farmId? 'Chưa có dữ liệu' : 'Hãy chọn Nông trường để xem theo lô'}</div></td></tr>
            )}
          </tbody>
          {farmId && (
            <tfoot>
              <tr>
                <td style={{...td,fontWeight:600}}>TỔNG</td>
                <td style={td}></td>
                <td style={{...td,fontWeight:600}}>{Number(totalPlotActual).toLocaleString('vi-VN')}</td>
                <td style={{...td,fontWeight:600}}>{Number(totalPlotActual/daysCount).toLocaleString('vi-VN')}</td>
                {showDry && <td style={{...td,fontWeight:600}}>{Number(totalPlotDry).toLocaleString('vi-VN')}</td>}
                {showDry && <td style={{...td,fontWeight:600}}>{Number(totalPlotDry/daysCount).toLocaleString('vi-VN')}</td>}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}

const th = { padding:10, borderBottom:'1px solid #e5e7eb', textAlign:'left' };
const td = { borderBottom:'1px solid #f0f0f0', padding:10 };

// ===== CSV Export helpers =====
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

// (định dạng ngày dùng chung đã chuyển sang utils/date.js)
