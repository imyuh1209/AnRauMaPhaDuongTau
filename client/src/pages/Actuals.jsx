import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFarms, getRubberTypes, listActuals, updateActual, deleteActual } from '../api';

export default function Actuals(){
  const today = new Date().toISOString().slice(0,10);
  const firstOfMonth = new Date(today.slice(0,7)+'-01').toISOString().slice(0,10);

  const [farms, setFarms] = useState([]);
  const [rubberTypes, setRubberTypes] = useState([]);
  const [farmId, setFarmId] = useState('');
  const [rubberTypeId, setRubberTypeId] = useState('');
  const [plotId, setPlotId] = useState('');
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [limit, setLimit] = useState(500);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ qty:'', note:'', date:'' });

  useEffect(()=>{ (async()=>{
    try{ setFarms(await getFarms()); }catch{ /* noop */ }
    try{ setRubberTypes(await getRubberTypes()); }catch{ setRubberTypes([{id:1,code:'mu_nuoc'},{id:2,code:'mu_tap'}]); }
  })() },[]);

  const load = useCallback(async ()=>{
    setLoading(true); setMsg('');
    try{
      const data = await listActuals({
        ...(farmId? {farm_id:farmId}:{}),
        ...(rubberTypeId? {rubber_type_id:rubberTypeId}:{}),
        ...(plotId? {plot_id:plotId}:{}),
        date_from: dateFrom,
        date_to: dateTo,
        limit
      });
      setRows(Array.isArray(data)? data : []);
    }catch(e){ setMsg('❌ ' + (e.message || e)); }
    finally{ setLoading(false); }
  }, [farmId, rubberTypeId, plotId, dateFrom, dateTo, limit]);

  useEffect(()=>{ load() },[load]);

  function beginEdit(row){
    setEditingId(row.id);
    setDraft({ qty: String(row.qty), note: row.note || '', date: row.date });
  }
  function cancelEdit(){ setEditingId(null); setDraft({ qty:'', note:'', date:'' }); }
  async function saveEdit(id){
    try{
      await updateActual(id, { qty: Number(draft.qty||0), note: draft.note, date: draft.date });
      cancelEdit(); await load();
    }catch(e){ alert('Lưu thất bại: ' + (e.message||e)); }
  }
  async function removeRow(id){
    if(!confirm('Xoá bản ghi này?')) return;
    try{ await deleteActual(id); await load(); }catch(e){ alert('Xoá thất bại: ' + (e.message||e)); }
  }

  const total = useMemo(()=> rows.reduce((s,r)=> s + Number(r.qty||0), 0), [rows]);

  return (
    <section>
      <h2>Quản lý sản lượng thực tế</h2>
      <div style={{display:'flex', gap:12, flexWrap:'wrap', alignItems:'end', marginBottom:12}}>
        <label>Nông trường<br/>
          <select value={farmId} onChange={e=>setFarmId(e.target.value)}>
            <option value="">-- tất cả --</option>
            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        <label>Loại mủ<br/>
          <select value={rubberTypeId} onChange={e=>setRubberTypeId(e.target.value)}>
            <option value="">-- tất cả --</option>
            {rubberTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.code}</option>)}
          </select>
        </label>
        <label>Plot ID<br/>
          <input value={plotId} onChange={e=>setPlotId(e.target.value)} placeholder="optional" style={{width:100}} />
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
  <button className="btn btn-primary btn-sm" onClick={load}>Tải</button>
      </div>

      {loading && <p>Đang tải…</p>}
      {msg && <p style={{color:'#c33'}}>{msg}</p>}

      <div style={{marginBottom:8}}>Tổng số dòng: <b>{rows.length}</b>, Tổng sản lượng: <b>{total.toLocaleString('vi-VN')}</b></div>

      <table style={{borderCollapse:'collapse', width:'100%'}}>
        <thead>
          <tr>
            <th style={th}>Ngày</th>
            <th style={th}>Nông trường</th>
            <th style={th}>Lô</th>
            <th style={th}>Loại mủ</th>
            <th style={th}>Số lượng (kg)</th>
            <th style={th}>Ghi chú</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td style={td}>
                {editingId===r.id
                  ? <input type="date" value={draft.date} onChange={e=>setDraft({...draft, date:e.target.value})} />
                  : r.date}
              </td>
              <td style={td}>{r.farm_name}</td>
              <td style={td}>{r.plot_id||''}</td>
              <td style={td}>{r.rubber_type}</td>
              <td style={td}>
                {editingId===r.id
                  ? <input type="number" step="0.001" value={draft.qty} onChange={e=>setDraft({...draft, qty:e.target.value})} style={{width:120}} />
                  : Number(r.qty||0).toLocaleString('vi-VN')}
              </td>
              <td style={td}>
                {editingId===r.id
                  ? <input value={draft.note} onChange={e=>setDraft({...draft, note:e.target.value})} />
                  : (r.note||'')}
              </td>
              <td style={td}>
                {editingId===r.id
                  ? <>
                      <button className="btn btn-primary btn-sm" onClick={()=>saveEdit(r.id)}>Lưu</button>
                      <button className="btn btn-outline btn-sm" onClick={cancelEdit} style={{marginLeft:8}}>Huỷ</button>
                    </>
                  : <>
                      <button className="btn btn-outline btn-sm" onClick={()=>beginEdit(r)}>Sửa</button>
                      <button className="btn btn-outline btn-sm" onClick={()=>removeRow(r.id)} style={{marginLeft:8}}>Xoá</button>
                    </>}
              </td>
            </tr>
          ))}
          {!rows.length && !loading && (
            <tr><td colSpan="7" style={td}>Không có dữ liệu</td></tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

const th = { padding:10, borderBottom:'1px solid #e5e7eb', textAlign:'left' };
const td = { borderBottom:'1px solid #f0f0f0', padding:10 };
