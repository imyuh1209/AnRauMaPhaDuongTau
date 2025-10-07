import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Farms from './pages/Farms.jsx';
import Plots from './pages/Plots.jsx';
import Plans from './pages/Plans.jsx';
import Conversions from './pages/Conversions.jsx';
import RubberTypes from './pages/RubberTypes.jsx';
import './index.css';

const router = createBrowserRouter([
  { path: '/', element: <App />, children: [
    { index: true, element: <Dashboard /> },
    { path: 'farms', element: <Farms /> },
    { path: 'plots', element: <Plots /> },
    { path: 'plans', element: <Plans /> },
    { path: 'conversions', element: <Conversions /> },
    { path: 'rubber-types', element: <RubberTypes /> },   // thêm

  ] }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
