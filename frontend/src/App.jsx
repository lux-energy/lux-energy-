import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import LoadingSpinner from './components/LoadingSpinner';

const MainLayout = React.lazy(() => import('./layouts/MainLayout'));
const Home = React.lazy(() => import('./pages/Home'));
const About = React.lazy(() => import('./pages/About'));
const Services = React.lazy(() => import('./pages/Services'));
const Products = React.lazy(() => import('./pages/Products'));
const Stations = React.lazy(() => import('./pages/Stations'));
const News = React.lazy(() => import('./pages/News'));
const NewsDetail = React.lazy(() => import('./pages/NewsDetail'));
const Careers = React.lazy(() => import('./pages/Careers'));
const Contact = React.lazy(() => import('./pages/Contact'));
const CustomerLogin = React.lazy(() => import('./pages/CustomerLogin'));
const PasswordRecovery = React.lazy(() => import('./pages/PasswordRecovery'));
const CustomerOrders = React.lazy(() => import('./pages/CustomerOrders'));
const CustomerServices = React.lazy(() => import('./pages/CustomerServices'));
const CustomerBills = React.lazy(() => import('./pages/CustomerBills'));
const CustomerTickets = React.lazy(() => import('./pages/CustomerTickets'));
const AgentLogin = React.lazy(() => import('./pages/AgentLogin'));
const AgentWorkspace = React.lazy(() => import('./pages/AgentWorkspace'));
const AgentOrders = React.lazy(() => import('./pages/AgentOrders'));
const AgentServices = React.lazy(() => import('./pages/AgentServices'));
const AgentBilling = React.lazy(() => import('./pages/AgentBilling'));
const DailyReports = React.lazy(() => import('./pages/DailyReports'));
const LoginGateway = React.lazy(() => import('./pages/LoginGateway'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const AdminLogin = React.lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminStations = React.lazy(() => import('./pages/admin/AdminStations'));
const AdminProducts = React.lazy(() => import('./pages/admin/AdminProducts'));
const AdminServices = React.lazy(() => import('./pages/admin/AdminServices'));
const AdminNews = React.lazy(() => import('./pages/admin/AdminNews'));
const AdminCareers = React.lazy(() => import('./pages/admin/AdminCareers'));
const AdminContact = React.lazy(() => import('./pages/admin/AdminContact'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const AdminOrders = React.lazy(() => import('./pages/admin/AdminOrders'));
const AdminTickets = React.lazy(() => import('./pages/admin/AdminTickets'));
import ProtectedRoute from './components/ProtectedRoute';

const AccountNavigation = () => {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  if (pathname === '/') return null;

  return (
    <div className="relative z-50 border-b border-gray-200 bg-white">
      <div className="container mx-auto flex min-h-10 items-center justify-end px-4">
        <Link
          to="/"
          onClick={() => { if (user) logout(); }}
          className="py-2 text-sm font-semibold text-primary-700 hover:text-primary-900"
        >
          {user ? 'Sign out · Back to first page' : 'Back to first page'}
        </Link>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AccountNavigation />
        <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LoginGateway />} />
          <Route path="/home" element={<MainLayout><Home /></MainLayout>} />
          <Route path="/about" element={<MainLayout><About /></MainLayout>} />
          <Route path="/services" element={<MainLayout><Services /></MainLayout>} />
          <Route path="/products" element={<MainLayout><Products /></MainLayout>} />
          <Route path="/stations" element={<MainLayout><Stations /></MainLayout>} />
          <Route path="/news" element={<MainLayout><News /></MainLayout>} />
          <Route path="/news/:slug" element={<MainLayout><NewsDetail /></MainLayout>} />
          <Route path="/careers" element={<MainLayout><Careers /></MainLayout>} />
          <Route path="/contact" element={<MainLayout><Contact /></MainLayout>} />
          <Route path="/login" element={<CustomerLogin />} />
          <Route path="/agent/login" element={<AgentLogin />} />
          <Route path="/forgot-password" element={<PasswordRecovery />} />
          <Route path="/forgot-password/:role" element={<PasswordRecovery />} />

          {/* Customer Portal */}
          <Route path="/portal" element={<ProtectedRoute allowedRoles={['customer']} loginPath="/login"><CustomerOrders /></ProtectedRoute>} />
          <Route path="/portal/services" element={<ProtectedRoute allowedRoles={['customer']} loginPath="/login"><CustomerServices /></ProtectedRoute>} />
          <Route path="/portal/bills" element={<ProtectedRoute allowedRoles={['customer']} loginPath="/login"><CustomerBills /></ProtectedRoute>} />
          <Route path="/portal/tickets" element={<ProtectedRoute allowedRoles={['customer']} loginPath="/login"><CustomerTickets /></ProtectedRoute>} />
          <Route path="/orders" element={<Navigate to="/portal" replace />} />

          <Route path="/agent" element={<ProtectedRoute allowedRoles={['agent']} loginPath="/agent/login"><AgentWorkspace /></ProtectedRoute>} />
          <Route path="/agent/orders" element={<ProtectedRoute allowedRoles={['agent']} loginPath="/agent/login"><AgentOrders /></ProtectedRoute>} />
          <Route path="/agent/services" element={<ProtectedRoute allowedRoles={['agent']} loginPath="/agent/login"><AgentServices /></ProtectedRoute>} />
          <Route path="/agent/billing" element={<ProtectedRoute allowedRoles={['agent']} loginPath="/agent/login"><AgentBilling /></ProtectedRoute>} />
          <Route path="/agent/reports" element={<ProtectedRoute allowedRoles={['agent']} loginPath="/agent/login"><DailyReports /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <DailyReports />
            </ProtectedRoute>
          } />
          <Route path="/admin/stations" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminStations />
            </ProtectedRoute>
          } />
          <Route path="/admin/products" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminProducts />
            </ProtectedRoute>
          } />
          <Route path="/admin/services" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminServices />
            </ProtectedRoute>
          } />
          <Route path="/admin/news" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminNews />
            </ProtectedRoute>
          } />
          <Route path="/admin/careers" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminCareers />
            </ProtectedRoute>
          } />
          <Route path="/admin/contact" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminContact />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminUsers />
            </ProtectedRoute>
          } />
          <Route path="/admin/orders" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminOrders />
            </ProtectedRoute>
          } />
          <Route path="/admin/tickets" element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AdminTickets />
            </ProtectedRoute>
          } />
          <Route path="*" element={<MainLayout><NotFound /></MainLayout>} />
        </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
