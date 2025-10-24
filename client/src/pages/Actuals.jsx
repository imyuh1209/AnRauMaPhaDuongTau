// client/src/pages/Actuals.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFarms, getRubberTypes, listActuals, updateActual, deleteActual } from '../api';

// ===== helpers =====
const pad2 = (n) => String(n).padStart(2,'0');
const toYMD = (value) => {
  if (!value) return '';
  // Nếu đã ở dạng 'YYYY-MM-DD' thì lấy 10 ký tự đầu
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0,10);
  // Convert từ ISO/Date sang ngày local YYYY-MM-DD (không dính Z/UTC)
  const d = new Date(value);
  if (isNaN(d)) return '';
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
};

export default function Actuals(){
  const today = toYMD(new Date());
  const firstOfMonth = `${today.slice(0,7)}-01`;

  // filters
  const [farms, setFarms] = useState([]);
  const [rubberTypes, setRubberTypes] = useState([]);
  const [farmId, setFarmId] = useState('');
  const [rubberTypeId, setRubberTypeId] = useState('');
  const [plotId, setPlotId] = useState('');
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [limit, setLimit] = useState(500);

  // data & ui
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ qty:'', note:'', date:'' });
  const qtyInputRef = useRef(null);

  // master data
  useEffect(()=>{ (async()=>{
    try{ setFarms(await getFarms()); }catch{ /* ignore error */ }
    try{ setRubberTypes(await getRubberTypes()); }catch{/* ignore error */}
  })() },[]);

  const load = useCallback(async ()=>{
    setLoading(true); setMsg({type:'', text:''});
    try{
      const data = await listActuals({
        ...(farmId? {farm_id: farmId}:{}),
        ...(rubberTypeId? {rubber_type_id: rubberTypeId}:{}),
        ...(plotId? {plot_id: plotId.trim()}:{}),
        date_from: dateFrom,
        date_to: dateTo,
        limit: Number(limit) || 500
      });
      // Chuẩn hóa ngày hiển thị cho mọi dòng
      const normalized = (Array.isArray(data)? data: []).map(r => ({ ...r, date: toYMD(r.date) }));
      setRows(normalized);
    }catch(e){
      setRows([]);
      setMsg({ type:'error', text: 'Không tải được dữ liệu: ' + (e.message || e) });
    }finally{
      setLoading(false);
    }
  }, [farmId, rubberTypeId, plotId, dateFrom, dateTo, limit]);

  useEffect(()=>{ load() },[load]);

  const total = useMemo(()=> rows.reduce((s,r)=> s + (Number(r.qty)||0), 0), [rows]);
  const farmsMap = useMemo(()=>Object.fromEntries(farms.map(f=>[String(f.id), f.name])),[farms]);
  const rtMap = useMemo(()=>Object.fromEntries(rubberTypes.map(rt=>[String(rt.id), rt.code || rt.description || ('RT#'+rt.id)])),[rubberTypes]);

  function beginEdit(row){
    setEditingId(row.id);
    setDraft({
      qty: String(row.qty ?? ''),
      note: row.note || '',
      date: toYMD(row.date) || today, // <- đảm bảo YYYY-MM-DD
    });
    setTimeout(()=> qtyInputRef.current?.focus(), 0);
  }
  function cancelEdit(){
    setEditingId(null);
    setDraft({ qty:'', note:'', date:'' });
  }
  async function saveEdit(id){
    const qtyNum = Number(draft.qty);
    if(Number.isNaN(qtyNum) || qtyNum < 0){
      alert('Số lượng phải là số ≥ 0'); return;
    }
    if(!draft.date){
      alert('Vui lòng chọn ngày hợp lệ'); return;
    }
    try{
      await updateActual(id, { qty: qtyNum, note: draft.note?.trim() || null, date: toYMD(draft.date) });
      setMsg({ type:'success', text:'Đã lưu thay đổi.' });
      cancelEdit();
      await load();
    }catch(e){
      alert('Lưu thất bại: ' + (e.message||e));
    }
  }
  async function removeRow(id){
    if(!confirm('Xóa bản ghi này?')) return;
    try{ await deleteActual(id); setMsg({ type:'success', text:'Đã xóa.' }); await load(); }
    catch(e){ alert('Xóa thất bại: ' + (e.message||e)); }
  }

  function resetFilters(){
    setFarmId(''); setRubberTypeId(''); setPlotId('');
    setDateFrom(firstOfMonth); setDateTo(today); setLimit(500);
  }
  function onKeyEdit(e, id){
    if(e.key === 'Enter') { e.preventDefault(); saveEdit(id); }
    if(e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  }

  return (
    <section>
      <h2>Quản lý sản lượng thực tế</h2>

      {/* Filter bar */}
      <div style={{display:'flex', gap:12, flexWrap:'wrap', alignItems:'end', margin:'12px 0'}}>
        <label>Nông trường<br/>
          <select value={farmId} onChange={e=>setFarmId(e.target.value)}>
            <option value="">-- tất cả --</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        <label>Loại mủ<br/>
          <select value={rubberTypeId} onChange={e=>setRubberTypeId(e.target.value)}>
            <option value="">-- tất cả --</option>
            {rubberTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.code || rt.description}</option>)}
          </select>
        </label>
        <label>Lô (Plot)<br/>
          <input value={plotId} onChange={e=>setPlotId(e.target.value)} placeholder="VD: 101" style={{width:120}} />
        </label>
        <label>Từ ngày<br/>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
        </label>
        <label>Đến ngày<br/>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
        </label>
        <label>Giới hạn<br/>
          <input type="number" min="1" max="5000" value={limit} onChange={e=>setLimit(e.target.value)} style={{width:90}} />
        </label>

        <div style={{display:'flex', gap:8}}>
          <button className="btn btn-primary btn-sm" onClick={load}>Tải</button>
          <button className="btn btn-outline btn-sm" onClick={resetFilters}>Reset</button>
        </div>
      </div>

      {loading && <p>Đang tải…</p>}
      {msg.text && (
        <p style={{color: msg.type==='error' ? '#c33' : '#0a6', marginBottom:12}}>
          {msg.text}
        </p>
      )}

      <div style={{marginBottom:8, fontSize:'.95rem'}}>
        Tổng dòng: <b>{rows.length}</b> &nbsp;|&nbsp; Tổng sản lượng: <b>{total.toLocaleString('vi-VN')}</b> kg
      </div>

      {/* Table */}
      <div style={{overflowX:'auto', overflowY:'auto', maxHeight:'70vh', borderRadius:8, boxShadow:'0 1px 3px rgba(0,0,0,.06)'}}>
        <table style={{borderCollapse:'collapse', width:'100%', background:'#fff'}}>
          <thead style={{position:'sticky', top:0, zIndex:1}}>
            <tr>
              <th style={th}>Ngày</th>
              <th style={th}>Nông trường</th>
              <th style={th}>Lô</th>
              <th style={th}>Loại mủ</th>
              <th style={{...th, textAlign:'right', width:140}}>Số lượng (kg)</th>
              <th style={th}>Ghi chú</th>
              <th style={{...th, width:150}}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const farmName = r.farm_name || farmsMap[String(r.farm_id)] || r.farm_id;
              // Hiển thị Lô: ưu tiên code/tên, sau đó id; nếu null/0 → '-'
              const plotDisplay = r.plot_code || r.plot_name || r.plot || (r.plot_id ? r.plot_id : '-');
              const rtName = r.rubber_type || r.rubber_type_code || rtMap[String(r.rubber_type_id)] || r.rubber_type_id;
              return (
                <tr key={r.id}>
                  <td style={td}>
                    {editingId===r.id
                      ? <input type="date" value={draft.date} onChange={e=>setDraft({...draft, date:e.target.value})} onKeyDown={(e)=>onKeyEdit(e, r.id)} />
                      : toYMD(r.date)}
                  </td>
                  <td style={td}>{farmName}</td>
                  <td style={td}>{plotDisplay}</td>
                  <td style={td}>{rtName}</td>
                  <td style={{...td, textAlign:'right'}}>
                    {editingId===r.id
                      ? <input ref={qtyInputRef} type="number" min="0" step="0.001" value={draft.qty}
                               onChange={e=>setDraft({...draft, qty:e.target.value})}
                               onKeyDown={(e)=>onKeyEdit(e, r.id)}
                               style={{width:120, textAlign:'right'}} />
                      : (Number(r.qty||0)).toLocaleString('vi-VN')}
                  </td>
                  <td style={td}>
                    {editingId===r.id
                      ? <input value={draft.note} onChange={e=>setDraft({...draft, note:e.target.value})} onKeyDown={(e)=>onKeyEdit(e, r.id)} />
                      : (r.note||'')}
                  </td>
                  <td style={td}>
                    {editingId===r.id
                      ? <>
                          <button className="btn btn-primary btn-sm" onClick={()=>saveEdit(r.id)}>Lưu</button>
                          <button className="btn btn-outline btn-sm" onClick={cancelEdit} style={{marginLeft:8}}>Hủy</button>
                        </>
                      : <>
                          <button className="btn btn-outline btn-sm" onClick={()=>beginEdit(r)}>Sửa</button>
                          <button className="btn btn-outline btn-sm" onClick={()=>removeRow(r.id)} style={{marginLeft:8}}>Xóa</button>
                        </>}
                  </td>
                </tr>
              );
            })}
            {!rows.length && !loading && (
              <tr><td colSpan="7" style={td}>Không có dữ liệu</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td style={td} colSpan={4}><b>Tổng</b></td>
              <td style={{...td, textAlign:'right'}}><b>{total.toLocaleString('vi-VN')}</b></td>
              <td style={td} colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

const th = { padding:10, borderBottom:'1px solid #e5e7eb', textAlign:'left', background:'#f6f7fb' };
const td = { borderBottom:'1px solid #f0f0f0', padding:10 };
