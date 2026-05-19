import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
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
import AIInsights from './pages/AIInsights';
import Guests from './pages/Guests';
import Suppliers from './pages/Suppliers';
import ClientPortal from './pages/ClientPortal';
import CostEstimator from './pages/CostEstimator';
import Profile from './pages/Profile';
import CustomViewsPage from './pages/CustomViewsPage';

// // === Batch 09 Gaps & Frontend Mounts ===
const PredictiveMenuSuccessByClientProfileCuisineCfs = React.lazy(() => import('./pages/Batch09/PredictiveMenuSuccessByClientProfileCuisineCfs'));
const DynamicPricingDemandIngredientCostsSeasonCfs = React.lazy(() => import('./pages/Batch09/DynamicPricingDemandIngredientCostsSeasonCfs'));
const DeliveryRouteOptimizationWithTrafficPredictionCfs = React.lazy(() => import('./pages/Batch09/DeliveryRouteOptimizationWithTrafficPredictionCfs'));
const EquipmentUtilizationSchedulingCfs = React.lazy(() => import('./pages/Batch09/EquipmentUtilizationSchedulingCfs'));
const PredictiveStaffingLaborHoursByEventSizeCfs = React.lazy(() => import('./pages/Batch09/PredictiveStaffingLaborHoursByEventSizeCfs'));
const CustomerSatisfactionPredictionWithPostEventFeedbackCfs = React.lazy(() => import('./pages/Batch09/CustomerSatisfactionPredictionWithPostEventFeedbackCfs'));
const SupplierAutoOrderingIntegrationCfs = React.lazy(() => import('./pages/Batch09/SupplierAutoOrderingIntegrationCfs'));
const AiMenuSuccessPredictionByClientProfileGapAi = React.lazy(() => import('./pages/Batch09/AiMenuSuccessPredictionByClientProfileGapAi'));
const AiDeliveryRouteOptimizationGapAi = React.lazy(() => import('./pages/Batch09/AiDeliveryRouteOptimizationGapAi'));
const AiProposalToWinConversionModelingGapAi = React.lazy(() => import('./pages/Batch09/AiProposalToWinConversionModelingGapAi'));
const AiDietaryRestrictionSubstitutionSuggestionsGapAi = React.lazy(() => import('./pages/Batch09/AiDietaryRestrictionSubstitutionSuggestionsGapAi'));
const EquipmentRentalInventoryManagementGapNon = React.lazy(() => import('./pages/Batch09/EquipmentRentalInventoryManagementGapNon'));
const DetailedDietaryRestrictionTaggingOnMenusGapNon = React.lazy(() => import('./pages/Batch09/DetailedDietaryRestrictionTaggingOnMenusGapNon'));
const SupplierSlaScorecardTrackingGapNon = React.lazy(() => import('./pages/Batch09/SupplierSlaScorecardTrackingGapNon'));
const TastingEventSchedulingGapNon = React.lazy(() => import('./pages/Batch09/TastingEventSchedulingGapNon'));
const RecurringCorporateAccountAgreementsGapNon = React.lazy(() => import('./pages/Batch09/RecurringCorporateAccountAgreementsGapNon'));
const NotificationsSmsConfirmationsGapNon = React.lazy(() => import('./pages/Batch09/NotificationsSmsConfirmationsGapNon'));

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
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
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
                <Route path="ai-insights" element={<AIInsights />} />
                <Route path="guests" element={<Guests />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="client-portal" element={<ClientPortal />} />
                <Route path="cost-estimator" element={<CostEstimator />} />
                <Route path="profile" element={<Profile />} />
                <Route path="custom-views" element={<CustomViewsPage />} />
              </Route>
            
      {/* // === Batch 09 Gaps & Frontend Mounts === */}
        <Route path="/batch09/cfs/predictive-menu-success-by-client-profile-cuisine" element={<React.Suspense fallback={<div>Loading...</div>}><PredictiveMenuSuccessByClientProfileCuisineCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/dynamic-pricing-demand-ingredient-costs-season" element={<React.Suspense fallback={<div>Loading...</div>}><DynamicPricingDemandIngredientCostsSeasonCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/delivery-route-optimization-with-traffic-prediction" element={<React.Suspense fallback={<div>Loading...</div>}><DeliveryRouteOptimizationWithTrafficPredictionCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/equipment-utilization-scheduling" element={<React.Suspense fallback={<div>Loading...</div>}><EquipmentUtilizationSchedulingCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/predictive-staffing-labor-hours-by-event-size" element={<React.Suspense fallback={<div>Loading...</div>}><PredictiveStaffingLaborHoursByEventSizeCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/customer-satisfaction-prediction-with-post-event-feedback" element={<React.Suspense fallback={<div>Loading...</div>}><CustomerSatisfactionPredictionWithPostEventFeedbackCfs /></React.Suspense>} />
        <Route path="/batch09/cfs/supplier-auto-ordering-integration" element={<React.Suspense fallback={<div>Loading...</div>}><SupplierAutoOrderingIntegrationCfs /></React.Suspense>} />
        <Route path="/batch09/gap-ai/ai-menu-success-prediction-by-client-profile" element={<React.Suspense fallback={<div>Loading...</div>}><AiMenuSuccessPredictionByClientProfileGapAi /></React.Suspense>} />
        <Route path="/batch09/gap-ai/ai-delivery-route-optimization" element={<React.Suspense fallback={<div>Loading...</div>}><AiDeliveryRouteOptimizationGapAi /></React.Suspense>} />
        <Route path="/batch09/gap-ai/ai-proposal-to-win-conversion-modeling" element={<React.Suspense fallback={<div>Loading...</div>}><AiProposalToWinConversionModelingGapAi /></React.Suspense>} />
        <Route path="/batch09/gap-ai/ai-dietary-restriction-substitution-suggestions" element={<React.Suspense fallback={<div>Loading...</div>}><AiDietaryRestrictionSubstitutionSuggestionsGapAi /></React.Suspense>} />
        <Route path="/batch09/gap-nonai/equipment-rental-inventory-management" element={<React.Suspense fallback={<div>Loading...</div>}><EquipmentRentalInventoryManagementGapNon /></React.Suspense>} />
        <Route path="/batch09/gap-nonai/detailed-dietary-restriction-tagging-on-menus" element={<React.Suspense fallback={<div>Loading...</div>}><DetailedDietaryRestrictionTaggingOnMenusGapNon /></React.Suspense>} />
        <Route path="/batch09/gap-nonai/supplier-sla-scorecard-tracking" element={<React.Suspense fallback={<div>Loading...</div>}><SupplierSlaScorecardTrackingGapNon /></React.Suspense>} />
        <Route path="/batch09/gap-nonai/tasting-event-scheduling" element={<React.Suspense fallback={<div>Loading...</div>}><TastingEventSchedulingGapNon /></React.Suspense>} />
        <Route path="/batch09/gap-nonai/recurring-corporate-account-agreements" element={<React.Suspense fallback={<div>Loading...</div>}><RecurringCorporateAccountAgreementsGapNon /></React.Suspense>} />
        <Route path="/batch09/gap-nonai/notifications-sms-confirmations" element={<React.Suspense fallback={<div>Loading...</div>}><NotificationsSmsConfirmationsGapNon /></React.Suspense>} />

      </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
