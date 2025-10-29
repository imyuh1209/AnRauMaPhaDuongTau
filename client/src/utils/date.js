// client/src/utils/date.js
// Format any date-like input to DD/MM/YYYY for display purposes.
export function fmtDDMMYYYY(input){
  try{
    if(!input) return '';
    const d = new Date(String(input));
    if(isNaN(d)){
      // Handle YYYY-MM-DD strings by manual split
      const s = String(input);
      const m = s.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})/);
      if(m) return `${m[3]}/${m[2]}/${m[1]}`;
      return s; // fallback
    }
    const day = String(d.getDate()).padStart(2,'0');
    const mon = String(d.getMonth()+1).padStart(2,'0');
    const yr = String(d.getFullYear());
    return `${day}/${mon}/${yr}`;
  }catch{
    return String(input||'');
  }
}

