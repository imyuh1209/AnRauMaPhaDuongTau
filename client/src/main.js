import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import Dashboard from './pages/Dashboard'
import ActualForm from './pages/ActualForm'
import Farms from './pages/Farms'
import './index.css'

const router = createBrowserRouter([
  { path: '/', element: <App />, children: [
    { index: true, element: <Dashboard /> },
    { path: 'actuals/new', element: <ActualForm /> },
    { path: 'farms', element: <Farms /> },
  ]}
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)