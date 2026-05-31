// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PublicLayout from './components/PublicLayout'
import AdminLayout from './components/AdminLayout'
import ProfitLoss from './pages/admin/ProfitLoss'

// Public pages
import Home from './pages/Home'
import About from './pages/About'
import Gallery from './pages/Gallery'
import Sales from './pages/Sales'
import Contact from './pages/Contact'
import AdminLogin from './pages/AdminLogin'

// Admin pages
import Dashboard from './pages/admin/Dashboard'
import BillsList from './pages/admin/BillsList'
import BillForm from './pages/admin/BillForm'
import BillView from './pages/admin/BillView'
import BillPrint from './pages/admin/BillPrint'
import PattiReport from './pages/admin/PattiReport'
import BuyerSearch from './pages/admin/BuyerSearch'
import SerialPrint from './pages/admin/SerialPrint'
import ContactMessages from './pages/admin/ContactMessages'
import SettingsPage from './pages/admin/SettingsPage'
import GeneralLedger from './pages/admin/GeneralLedger'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        {/* Admin login (standalone) */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin panel */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="bills" element={<BillsList />} />
          <Route path="bills/new" element={<BillForm />} />
          <Route path="bills/:id" element={<BillView />} />
          <Route path="bills/:id/edit" element={<BillForm />} />
          <Route path="buyers" element={<BuyerSearch />} />
          <Route path="patti-report" element={<PattiReport />} />
          <Route path="serial-print" element={<SerialPrint />} />
          <Route path="profit-loss" element={<ProfitLoss />} />
          <Route path="ledger" element={<GeneralLedger />} />
          <Route path="contacts" element={<ContactMessages />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Print routes (no layout) */}
        <Route path="/admin/bills/:id/print" element={<BillPrint />} />
        <Route path="/admin/bills/print-bulk" element={<BillPrint />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}