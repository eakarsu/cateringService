import EventCalendar from '../components/EventCalendar';
import MenuPricingChart from '../components/MenuPricingChart';
import EventQuotePDF from '../components/EventQuotePDF';
import StaffRosterWizard from '../components/StaffRosterWizard';

export default function CustomViewsPage() {
  return (
    <div className="space-y-6" data-testid="custom-views-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Catering Views</h1>
        <p className="text-sm text-gray-500">
          Four custom views: event calendar, menu pricing chart, event quote PDF, and the staff roster wizard.
        </p>
      </div>
      <EventCalendar />
      <MenuPricingChart />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <EventQuotePDF />
        <StaffRosterWizard />
      </div>
    </div>
  );
}
