import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Farms from './pages/Farms.jsx';
import Plots from './pages/Plots.jsx';
import Plans from './pages/Plans.jsx';
import Actuals from './pages/Actuals.jsx';
import Conversions from './pages/Conversions.jsx';
import RubberTypes from './pages/RubberTypes.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import './index.css';

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/app', element: (
      <RequireAuth>
        <App />
      </RequireAuth>
    ), children: [
      { index: true, element: <Dashboard /> },
      { path: 'farms', element: <Farms /> },
      { path: 'plots', element: <Plots /> },
      { path: 'plans', element: <Plans /> },
      { path: 'actuals', element: <Actuals /> },
      { path: 'conversions', element: <Conversions /> },
      { path: 'rubber-types', element: <RubberTypes /> },
  ]}
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
