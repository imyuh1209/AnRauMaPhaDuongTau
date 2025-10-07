import { Outlet, Link } from 'react-router-dom';

export default function App(){
  const link = { color:'#fff', textDecoration:'none' };
  return (
    <div>
      <header style={{padding:'12px 20px', background:'#0b6', color:'#fff', display:'flex', gap:16, alignItems:'center'}}>
        <h1 style={{margin:0}}>Rubber Tracker</h1>
        <nav style={{display:'flex', gap:12}}>
          <Link to="/" style={link}>Dashboard</Link>
          <Link to="/farms" style={link}>Farms</Link>
          <Link to="/plots" style={link}>Plots</Link>
          <Link to="/plans" style={link}>Plans</Link>
          <Link to="/conversions" style={link}>Conversions</Link>
          <Link to="/rubber-types" style={link}>Rubber Types</Link>

        </nav>
      </header>
      <main style={{padding:20}}><Outlet /></main>
    </div>
  );
}
