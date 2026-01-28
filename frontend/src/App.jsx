import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Venues from './pages/Venues';
import Menus from './pages/Menus';
import Proposals from './pages/Proposals';
import Orders from './pages/Orders';
import Kitchen from './pages/Kitchen';
import Logistics from './pages/Logistics';
import Staff from './pages/Staff';
import Billing from './pages/Billing';
import AIAssistant from './pages/AIAssistant';
import Guests from './pages/Guests';
import Suppliers from './pages/Suppliers';
import ClientPortal from './pages/ClientPortal';
import CostEstimator from './pages/CostEstimator';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:id" element={<EventDetail />} />
            <Route path="venues" element={<Venues />} />
            <Route path="menus" element={<Menus />} />
            <Route path="proposals" element={<Proposals />} />
            <Route path="orders" element={<Orders />} />
            <Route path="kitchen" element={<Kitchen />} />
            <Route path="logistics" element={<Logistics />} />
            <Route path="staff" element={<Staff />} />
            <Route path="billing" element={<Billing />} />
            <Route path="ai" element={<AIAssistant />} />
            <Route path="guests" element={<Guests />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="client-portal" element={<ClientPortal />} />
            <Route path="cost-estimator" element={<CostEstimator />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
