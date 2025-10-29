import { useEffect, useRef, useState } from 'react';
import { fmtDDMMYYYY } from '../utils/date';

function parseDDMMYYYY(s){
  if(!s) return '';
  const m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  if(Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0,10);
}

export default function DateInput({ value, onChange, placeholder = 'DD/MM/YYYY', min, max, disabled, ...props }){
  const [text, setText] = useState(fmtDDMMYYYY(value) || '');
  const pickerRef = useRef(null);

  useEffect(()=>{ setText(fmtDDMMYYYY(value) || ''); }, [value]);

  function handleChange(e){
    const v = e.target.value;
    setText(v);
    if(v === ''){ onChange(''); return; }
    const iso = parseDDMMYYYY(v);
    if(iso){ onChange(iso); }
  }

  function handleBlur(){
    const iso = parseDDMMYYYY(text);
    setText(iso ? fmtDDMMYYYY(iso) : (fmtDDMMYYYY(value)||''));
  }

  function openPicker(){
    const el = pickerRef.current;
    if(!el) return;
    try{
      if(typeof el.showPicker === 'function'){
        el.showPicker();
      }else{
        el.focus();
        el.click();
      }
    }catch{
      el.focus(); el.click();
    }
  }

  return (
    <div style={{display:'flex', gap:6, alignItems:'center'}}>
      <input type="text" value={text} onChange={handleChange} onBlur={handleBlur} placeholder={placeholder} disabled={disabled} {...props} />
      <button type="button" className="btn btn-outline btn-sm" onClick={openPicker} disabled={disabled} title="Chọn ngày">📅</button>
      <input
        ref={pickerRef}
        type="date"
        lang="vi"
        value={value || ''}
        min={min}
        max={max}
        onChange={e=>{ const iso = e.target.value; onChange(iso); setText(fmtDDMMYYYY(iso)); }}
        style={{ position:'absolute', opacity:0, pointerEvents:'none', width:0, height:0 }}
      />
    </div>
  );
}
