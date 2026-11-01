import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import VolunteerLayout from './components/layout/VolunteerLayout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import Camps from './pages/Camps';
import CampDetails from './pages/CampDetails';
import Needs from './pages/Needs';
import Inventory from './pages/Inventory';
import Dispatches from './pages/Dispatches';
import Donations from './pages/Donations';
import Volunteers from './pages/Volunteers';
import AccessDenied from './pages/AccessDenied';
import RiskAssessment from './pages/RiskAssessment';

const ProtectedRoute = ({ children, permission, roles }) => {
  const { user, loading, hasPermission } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/access-denied" replace />;
  }
  
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/access-denied" replace />;
  }
  
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/access-denied" element={<AccessDenied />} />
      
      {/* Admin Layout with Admin Sidebar */}
      <Route element={
        <ProtectedRoute roles={['admin']}>
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={
          <ProtectedRoute permission="dashboard.view"><Dashboard /></ProtectedRoute>
        } />
        <Route path="/camps" element={
          <ProtectedRoute permission="camps.view"><Camps /></ProtectedRoute>
        } />
        <Route path="/camps/:id" element={
          <ProtectedRoute permission="camps.view_details"><CampDetails /></ProtectedRoute>
        } />
        <Route path="/needs" element={
          <ProtectedRoute permission="needs.view"><Needs /></ProtectedRoute>
        } />
        <Route path="/needs/new" element={
          <ProtectedRoute permission="needs.view"><Needs /></ProtectedRoute>
        } />
        <Route path="/inventory" element={
          <ProtectedRoute permission="inventory.view"><Inventory /></ProtectedRoute>
        } />
        <Route path="/dispatches" element={
          <ProtectedRoute permission="dispatches.view"><Dispatches /></ProtectedRoute>
        } />
        <Route path="/dispatches/new" element={
          <ProtectedRoute permission="dispatches.view"><Dispatches /></ProtectedRoute>
        } />
        <Route path="/donations" element={
          <ProtectedRoute permission="donations.view"><Donations /></ProtectedRoute>
        } />
        <Route path="/volunteers" element={
          <ProtectedRoute permission="volunteers.view"><Volunteers /></ProtectedRoute>
        } />
        <Route path="/risk" element={
          <ProtectedRoute permission="dashboard.view"><RiskAssessment /></ProtectedRoute>
        } />
      </Route>
      
      {/* Volunteer Layout - simplified navigation */}
      <Route element={
        <ProtectedRoute roles={['volunteer']}>
          <VolunteerLayout />
        </ProtectedRoute>
      }>
        <Route path="/volunteer-dashboard" element={
          <ProtectedRoute permission="dashboard.view"><VolunteerDashboard /></ProtectedRoute>
        } />
      </Route>
      
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;