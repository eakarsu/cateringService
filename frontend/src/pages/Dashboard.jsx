import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';
import { format } from 'date-fns';
import { SkeletonGrid } from '../components/SkeletonLoader';
import {
  Calendar, DollarSign, Users, FileText, Clock, AlertTriangle,
  TrendingUp, ChevronRight, ShoppingCart, Truck, ChefHat, MapPin
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [overview, setOverview] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const [overviewRes, eventsRes, ordersRes, tasksRes] = await Promise.all([
        api.get('/dashboard/overview'),
        api.get('/dashboard/upcoming-events'),
        api.get('/dashboard/recent-orders'),
        api.get('/dashboard/pending-tasks')
      ]);
      setOverview(overviewRes.data);
      setUpcomingEvents(eventsRes.data);
      setRecentOrders(ordersRes.data);
      setPendingTasks(tasksRes.data.tasks);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast?.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div><div className="h-8 bg-gray-200 rounded w-48 animate-pulse mb-2"></div><div className="h-4 bg-gray-200 rounded w-72 animate-pulse"></div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="card animate-pulse"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-gray-200 rounded-lg"></div><div><div className="h-4 bg-gray-200 rounded w-24 mb-2"></div><div className="h-6 bg-gray-200 rounded w-16"></div></div></div></div>
          ))}
        </div>
        <SkeletonGrid count={4} />
      </div>
    );
  }

  const stats = [
    { name: 'Upcoming Events', value: overview?.events?.upcoming || 0, icon: Calendar, color: 'bg-blue-500', link: '/events' },
    { name: 'Monthly Revenue', value: `$${(overview?.revenue?.thisMonth || 0).toLocaleString()}`, icon: DollarSign, color: 'bg-green-500', link: '/billing' },
    { name: 'Pending Orders', value: overview?.orders?.pending || 0, icon: FileText, color: 'bg-yellow-500', link: '/orders' },
    { name: 'Staff Today', value: overview?.staff?.scheduledToday || 0, icon: Users, color: 'bg-purple-500', link: '/staff' }
  ];

  const quickLinks = [
    { name: 'Events', icon: Calendar, link: '/events', color: 'bg-blue-100 text-blue-600' },
    { name: 'Orders', icon: ShoppingCart, link: '/orders', color: 'bg-green-100 text-green-600' },
    { name: 'Kitchen', icon: ChefHat, link: '/kitchen', color: 'bg-orange-100 text-orange-600' },
    { name: 'Logistics', icon: Truck, link: '/logistics', color: 'bg-purple-100 text-purple-600' },
    { name: 'Venues', icon: MapPin, link: '/venues', color: 'bg-pink-100 text-pink-600' },
    { name: 'Billing', icon: DollarSign, link: '/billing', color: 'bg-emerald-100 text-emerald-600' },
    { name: 'Staff', icon: Users, link: '/staff', color: 'bg-indigo-100 text-indigo-600' },
    { name: 'Proposals', icon: FileText, link: '/proposals', color: 'bg-amber-100 text-amber-600' },
  ];

  const getStatusBadge = (status) => {
    const badges = { INQUIRY: 'badge-info', PROPOSAL_SENT: 'badge-warning', CONFIRMED: 'badge-success', IN_PROGRESS: 'badge-info', COMPLETED: 'badge-gray', CANCELLED: 'badge-danger', PENDING: 'badge-warning', IN_PREP: 'badge-info' };
    return badges[status] || 'badge-gray';
  };

  const taskLinks = {
    'Pending Proposals': '/proposals',
    'Unpaid Invoices': '/billing',
    'Pending Orders': '/orders',
    'Upcoming Deliveries': '/logistics',
    'Pending Prep Lists': '/kitchen',
    'Low Stock Items': '/kitchen',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome to your catering management platform</p>
      </div>

      {/* Stats Grid - clickable cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} onClick={() => navigate(stat.link)} className="card hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className={`${stat.color} p-3 rounded-lg`}><stat.icon className="w-6 h-6 text-white" /></div>
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Navigation Cards */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Navigation</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {quickLinks.map((link) => (
            <div key={link.name} onClick={() => navigate(link.link)} className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <div className={`p-3 rounded-lg ${link.color}`}><link.icon size={24} /></div>
              <span className="text-xs font-medium text-gray-700">{link.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events - clickable rows */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
            <Link to="/events" className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1">View all <ChevronRight size={16} /></Link>
          </div>
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No upcoming events</p>
            ) : (
              upcomingEvents.slice(0, 5).map((event) => (
                <div key={event.id} onClick={() => navigate(`/events/${event.id}`)} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                  <div className="bg-indigo-100 p-2 rounded-lg"><Calendar className="w-5 h-5 text-indigo-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{event.name}</p>
                    <p className="text-sm text-gray-500">{format(new Date(event.date), 'MMM d, yyyy')} - {event.guestCount} guests</p>
                  </div>
                  <span className={`badge ${getStatusBadge(event.status)}`}>{event.status.replace('_', ' ')}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Orders - clickable rows */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <Link to="/orders" className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1">View all <ChevronRight size={16} /></Link>
          </div>
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent orders</p>
            ) : (
              recentOrders.slice(0, 5).map((order) => (
                <div key={order.id} onClick={() => navigate('/orders')} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <div className="bg-green-100 p-2 rounded-lg"><FileText className="w-5 h-5 text-green-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{order.orderNumber}</p>
                    <p className="text-sm text-gray-500">{order.event?.name} - ${order.totalAmount?.toLocaleString()}</p>
                  </div>
                  <span className={`badge ${getStatusBadge(order.status)}`}>{order.status.replace('_', ' ')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pending Tasks - clickable cards */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Tasks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pendingTasks.map((task) => (
            <div
              key={task.type}
              onClick={() => navigate(taskLinks[task.label] || '/')}
              className={`p-4 rounded-lg cursor-pointer hover:shadow-md transition-shadow ${task.count > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}
            >
              <div className="flex items-center gap-2">
                {task.count > 0 ? <AlertTriangle className="w-5 h-5 text-yellow-600" /> : <TrendingUp className="w-5 h-5 text-green-600" />}
                <span className="font-medium text-gray-900">{task.label}</span>
              </div>
              <p className={`text-2xl font-bold mt-2 ${task.count > 0 ? 'text-yellow-700' : 'text-green-700'}`}>{task.count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
