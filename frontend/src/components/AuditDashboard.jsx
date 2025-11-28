import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Users, 
  Eye, 
  Calendar,
  TrendingUp,
  Shield,
  AlertCircle
} from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { format, subDays } from 'date-fns';

const AuditDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initial fetch
    fetchAuditStats();
    fetchRecentLogs();

    // Auto-refresh every 8 seconds
    const interval = setInterval(() => {
      fetchAuditStats();
      fetchRecentLogs();
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const fetchAuditStats = async () => {
    try {
      setError(null);
      
      // Add subject parameter as required by backend
      const params = new URLSearchParams({
        subject: 'system'
      });

      const response = await fetch(`${API_BASE}/audit/stats?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        const errorData = await response.json();
        console.error('Stats API Error:', errorData);
        setError(`Stats Error: ${errorData.error || errorData.msg || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching audit stats:', error);
      setError('Network error fetching stats');
    }
  };

  const fetchRecentLogs = async () => {
    try {
      setError(null);
      
      // Add subject parameter as required by backend
      const params = new URLSearchParams({
        subject: 'system',
        page: '1',
        per_page: '10'
      });

      const response = await fetch(`${API_BASE}/audit/logs?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecentLogs(data.logs || []);
      } else {
        const errorData = await response.json();
        console.error('Logs API Error:', errorData);
        setError(`Logs Error: ${errorData.error || errorData.msg || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching recent logs:', error);
      setError('Network error fetching logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeColor = (action) => {
    const colors = {
      CREATE: 'bg-green-100 text-green-800 border border-green-200',
      UPDATE: 'bg-blue-100 text-blue-800 border border-blue-200',
      DELETE: 'bg-red-100 text-red-800 border border-red-200',
      LOGIN: 'bg-purple-100 text-purple-800 border border-purple-200',
      LOGOUT: 'bg-gray-200 text-gray-800 border border-gray-300',
      VIEW: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
      APPROVE: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      REJECT: 'bg-orange-100 text-orange-800 border border-orange-200',
      EXPORT: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
      IMPORT: 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    };
    return colors[action] || 'bg-gray-200 text-gray-800 border border-gray-300';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">Error Loading Audit Data</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <p className="text-xs text-red-600 mt-2">
                  Check the browser console for more details.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Overview</h2>
          <p className="text-gray-600">System activity monitoring • Auto-refreshes every 8s</p>
        </div>
        <Shield className="h-8 w-8 text-blue-500" />
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Activities</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_activities || 0}</p>
                  <p className="text-xs text-gray-500">Last 30 days</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.top_users?.length || 0}</p>
                  <p className="text-xs text-gray-500">Unique users</p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Most Common Action</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {stats.actions?.[0]?.action || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats.actions?.[0]?.count || 0} times
                  </p>
                </div>
                <Eye className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Daily Average</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total_activities ? Math.round(stats.total_activities / 30) : 0}
                  </p>
                  <p className="text-xs text-gray-500">Activities per day</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Actions and Modules */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-lg font-semibold text-gray-900">Top Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {stats.actions?.slice(0, 5).map((action, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                    <Badge className={getActionBadgeColor(action.action)}>
                      {action.action}
                    </Badge>
                    <span className="font-semibold text-gray-900">{action.count}</span>
                  </div>
                ))}
                {(!stats.actions || stats.actions.length === 0) && (
                  <p className="text-gray-500 text-sm text-center py-4">No actions recorded</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-lg font-semibold text-gray-900">Top Modules</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {stats.modules?.slice(0, 5).map((module, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                    <Badge variant="outline" className="border-gray-300 text-gray-700 font-medium">
                      {module.module}
                    </Badge>
                    <span className="font-semibold text-gray-900">{module.count}</span>
                  </div>
                ))}
                {(!stats.modules || stats.modules.length === 0) && (
                  <p className="text-gray-500 text-sm text-center py-4">No modules recorded</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <AlertCircle className="h-5 w-5 text-gray-700" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-2">
            {recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg hover:bg-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <Badge className={getActionBadgeColor(log.action)}>
                      {log.action}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900">{log.description}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        <span className="font-medium">{log.username || 'System'}</span> • {log.module}
                      </p>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xs font-medium text-gray-600">
                      {log.timestamp ? format(new Date(log.timestamp), 'MMM dd, HH:mm') : 'N/A'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditDashboard;