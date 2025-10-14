import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

function hasToken(){ try{ return !!localStorage.getItem('token'); }catch{ return false; } }

export default function RequireAuth({ children }){
  const [ok, setOk] = useState(hasToken());
  const location = useLocation();
  useEffect(()=>{ setOk(hasToken()); }, [location.key]);
  if (!ok) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
