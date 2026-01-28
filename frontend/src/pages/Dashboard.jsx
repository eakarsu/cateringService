import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { format } from 'date-fns';
import {
  Calendar, DollarSign, Users, FileText, Clock, AlertTriangle,
  TrendingUp, ChevronRight
} from 'lucide-react';

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Upcoming Events',
      value: overview?.events?.upcoming || 0,
      icon: Calendar,
      color: 'bg-blue-500',
      link: '/events'
    },
    {
      name: 'Monthly Revenue',
      value: `$${(overview?.revenue?.thisMonth || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-green-500',
      link: '/billing'
    },
    {
      name: 'Pending Orders',
      value: overview?.orders?.pending || 0,
      icon: FileText,
      color: 'bg-yellow-500',
      link: '/orders'
    },
    {
      name: 'Staff Today',
      value: overview?.staff?.scheduledToday || 0,
      icon: Users,
      color: 'bg-purple-500',
      link: '/staff'
    }
  ];

  const getStatusBadge = (status) => {
    const badges = {
      INQUIRY: 'badge-info',
      PROPOSAL_SENT: 'badge-warning',
      CONFIRMED: 'badge-success',
      IN_PROGRESS: 'badge-info',
      COMPLETED: 'badge-gray',
      CANCELLED: 'badge-danger',
      PENDING: 'badge-warning',
      IN_PREP: 'badge-info'
    };
    return badges[status] || 'badge-gray';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome to your catering management platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            to={stat.link}
            className="card hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
            <Link to="/events" className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1">
              View all <ChevronRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No upcoming events</p>
            ) : (
              upcomingEvents.slice(0, 5).map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{event.name}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(event.date), 'MMM d, yyyy')} - {event.guestCount} guests
                    </p>
                  </div>
                  <span className={`badge ${getStatusBadge(event.status)}`}>
                    {event.status.replace('_', ' ')}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <Link to="/orders" className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center gap-1">
              View all <ChevronRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent orders</p>
            ) : (
              recentOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg"
                >
                  <div className="bg-green-100 p-2 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{order.orderNumber}</p>
                    <p className="text-sm text-gray-500">
                      {order.event?.name} - ${order.totalAmount?.toLocaleString()}
                    </p>
                  </div>
                  <span className={`badge ${getStatusBadge(order.status)}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pending Tasks */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Tasks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pendingTasks.map((task) => (
            <div
              key={task.type}
              className={`p-4 rounded-lg ${task.count > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}
            >
              <div className="flex items-center gap-2">
                {task.count > 0 ? (
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                )}
                <span className="font-medium text-gray-900">{task.label}</span>
              </div>
              <p className={`text-2xl font-bold mt-2 ${task.count > 0 ? 'text-yellow-700' : 'text-green-700'}`}>
                {task.count}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
