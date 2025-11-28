import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Download, Filter, Calendar, User, Activity, Clock, Eye,
  ChevronLeft, ChevronRight, BarChart3
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { API_BASE } from '@/lib/api';
import { format } from 'date-fns';
import AuditDashboard from '@/components/AuditDashboard';

const AuditTrail = ({ token: propToken }) => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Get token from props, sessionStorage, or localStorage
  const token = propToken || sessionStorage.getItem('token') || localStorage.getItem('token');

  const [filters, setFilters] = useState({
    search: '', module: '', action: '', user_id: '',
    resource_type: '', date_from: '', date_to: ''
  });

  const [pagination, setPagination] = useState({
    page: 1, pages: 1, per_page: 50, total: 0,
    has_next: false, has_prev: false
  });

  const modules = ['AUTH','HR','PRODUCTION','PURCHASE','INVENTORY','SHOWROOM','FINANCE','SALES','TRANSPORT','GATE_ENTRY','GUEST_LIST','APPROVAL','ADMIN'];
  const actions = ['CREATE','UPDATE','DELETE','LOGIN','LOGOUT','VIEW','EXPORT','IMPORT','APPROVE','REJECT','SUBMIT','CANCEL','RESTORE'];

  useEffect(() => {
    // Initial fetch
    fetchAuditLogs();
    fetchStats();

    // Auto-refresh every 8 seconds
    const interval = setInterval(() => {
      fetchAuditLogs();
      fetchStats();
    }, 8000);

    return () => clearInterval(interval);
  }, [filters, pagination.page]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);

      // Build params - only include non-empty values
      const params = new URLSearchParams({
        page: pagination.page || 1,
        per_page: pagination.per_page || 50,
        subject: "system"  // Required by backend
      });

      // Add optional filters only if they have values
      if (filters.search?.trim()) params.append('search', filters.search.trim());
      if (filters.module) params.append('module', filters.module);
      if (filters.action) params.append('action', filters.action);
      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.resource_type) params.append('resource_type', filters.resource_type);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      console.log('Fetching audit logs with params:', params.toString());

      const headers = { 
        'Content-Type': 'application/json'
      };
      
      // Add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE}/audit/logs?${params}`, {
        headers
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        setLogs(data.logs || []);
        setPagination(data.pagination || {
          page: 1, pages: 1, per_page: 50, total: 0,
          has_next: false, has_prev: false
        });
      } else {
        // Handle authentication errors
        if (response.status === 401 || response.status === 403) {
          toast({
            title: "Authentication Error",
            description: "Please log out and log back in",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: data?.error || data?.msg || "Failed to fetch audit logs",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: "Error",
        description: `Failed to fetch audit logs: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({
        subject: "system"
      });

      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const headers = { 
        'Content-Type': 'application/json'
      };
      
      // Add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE}/audit/stats?${params}`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Failed to fetch stats:', response.status);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const exportLogs = async () => {
    try {
      setExporting(true);

      const params = new URLSearchParams({
        subject: filters.search?.trim() || "system",
        module: filters.module || "",
        action: filters.action || "",
        user_id: filters.user_id || "",
        resource_type: filters.resource_type || "",
        date_from: filters.date_from || "",
        date_to: filters.date_to || ""
      });

      const response = await fetch(`${API_BASE}/audit/export?${params}`, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({ title: "Success", description: "Audit logs exported successfully" });
      } else {
        toast({ title: "Error", description: "Failed to export audit logs", variant: "destructive" });
      }
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast({ title: "Error", description: "Failed to export audit logs", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: '', module: '', action: '', user_id: '',
      resource_type: '', date_from: '', date_to: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
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

  const getModuleBadgeColor = (module) => {
    const colors = {
      AUTH: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
      HR: 'bg-pink-100 text-pink-800 border border-pink-200',
      PRODUCTION: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      PURCHASE: 'bg-teal-100 text-teal-800 border border-teal-200',
      FINANCE: 'bg-green-100 text-green-800 border border-green-200',
      SALES: 'bg-blue-100 text-blue-800 border border-blue-200',
      INVENTORY: 'bg-amber-100 text-amber-800 border border-amber-200',
      SHOWROOM: 'bg-violet-100 text-violet-800 border border-violet-200',
      TRANSPORT: 'bg-orange-100 text-orange-800 border border-orange-200',
      GATE_ENTRY: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
      ADMIN: 'bg-red-100 text-red-800 border border-red-200',
      SYSTEM: 'bg-gray-200 text-gray-800 border border-gray-300'
    };
    return colors[module] || 'bg-gray-200 text-gray-800 border border-gray-300';
  };

   return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Trail</h1>
          <p className="text-gray-600">Monitor system activities and changes • Auto-refreshes every 8s</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={exportLogs}
            disabled={exporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Audit Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AuditDashboard />
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Activities</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_activities}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Top Action</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {stats.actions[0]?.action || 'N/A'}
                  </p>
                </div>
                <Eye className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Top Module</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {stats.modules[0]?.module || 'N/A'}
                  </p>
                </div>
                <User className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Date Range</p>
                  <p className="text-sm font-medium text-gray-900">
                    {stats.date_range?.from ? format(new Date(stats.date_range.from), 'MMM dd') : 'N/A'} - 
                    {stats.date_range?.to ? format(new Date(stats.date_range.to), 'MMM dd') : 'N/A'}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Filter className="h-5 w-5 text-gray-700" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Input
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={filters.module} onValueChange={(value) => handleFilterChange('module', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Modules</SelectItem>
                {modules.map(module => (
                  <SelectItem key={module} value={module}>{module}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                {actions.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              type="date"
              placeholder="From Date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
            />
            
            <Input
              type="date"
              placeholder="To Date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
            />
            
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900">Audit Logs</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {logs.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Audit Logs Found</h3>
                  <p className="text-gray-600 mb-4">
                    There are no audit logs to display yet. Activities will appear here once users start performing actions in the system.
                  </p>
                  <p className="text-sm text-gray-500">
                    Try adjusting your filters or check back later.
                  </p>
                </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Timestamp</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">User</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Action</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Module</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Resource</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700 w-1/3">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-900 font-medium">
                              {log.timestamp ? format(new Date(log.timestamp), 'MMM dd, HH:mm:ss') : 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-semibold text-gray-900">{log.username || 'System'}</p>
                            {log.user_name && (
                              <p className="text-sm text-gray-600">{log.user_name}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={getActionBadgeColor(log.action)}>
                            {log.action}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge className={getModuleBadgeColor(log.module)}>
                            {log.module}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-semibold text-gray-900">{log.resource_type}</p>
                            {log.resource_name && (
                              <p className="text-sm text-gray-600">{log.resource_name}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-3 w-1/3">
                          <p className="text-sm text-gray-700 break-words">{log.description}</p>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}

              {/* Pagination */}
              {logs.length > 0 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700">
                  Showing {((pagination.page - 1) * pagination.per_page) + 1} to{' '}
                  {Math.min(pagination.page * pagination.per_page, pagination.total)} of{' '}
                  {pagination.total} entries
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={!pagination.has_prev}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={!pagination.has_next}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuditTrail;