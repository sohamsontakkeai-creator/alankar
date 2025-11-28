import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, ClipboardCheck, Eye, UserCheck, UserX, RefreshCw, AlertCircle, FileText, Users, Search, LogOut, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '@/lib/api';
import SetSalesTarget from './SetSalesTarget';
import SalesPerformanceDashboard from './SalesPerformanceDashboard';
import AuditTrail from '../pages/AuditTrail';
import ManagementAlerts from './ManagementAlerts';
import { GuestDialog } from '@/components/GuestDialog';

// Import all department components for read-only viewing
import ProductionPlanning from './ProductionPlanning';
import PurchaseDepartment from './PurchaseDepartment';
import StoreDepartment from './StoreDepartment';
import AssemblyTeam from './AssemblyTeam';
import FinanceDepartment from './FinanceDepartment';
import ShowroomDepartment from './ShowroomDepartment';
import SalesDepartment from './SalesDepartment';
import DispatchDepartment from './DispatchDepartment';
import WatchmanDepartment from './WatchmanDepartment';
import TransportDepartment from './TransportDepartment';
import HRDepartment from './HRDepartment';
import ReceptionDepartment from './ReceptionDepartment';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { AutoRefreshIndicator } from '@/components/AutoRefreshIndicator';

// User Management Component (same as admin)
const UserManagement = () => {
  const { getAllUsers, updateUserDepartment, deleteUser } = useAuth();
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/departments`);
        if (response.ok) {
          const data = await response.json();
          setDepartments(data.departments || []);
        } else {
          setDepartments([]);
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error);
        setDepartments([]);
      }
    };

    fetchDepartments();
    loadAllUsers();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(allUsers);
    } else {
      const filtered = allUsers.filter(user => 
        (user.fullName || user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, allUsers]);

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers();
      setAllUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDepartment = async (userId, newDepartment) => {
    try {
      await updateUserDepartment(userId, newDepartment);
      toast({
        title: "Department Updated",
        description: "User department has been successfully updated. The user will be logged out automatically if they are currently logged in.",
      });
      loadAllUsers();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error.message || "An error occurred while updating the department.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await deleteUser(userId);
        toast({
          title: "User Deleted",
          description: "The user has been successfully deleted.",
        });
        loadAllUsers();
      } catch (error) {
        toast({
          title: "Delete Failed",
          description: error.message || "An error occurred while deleting the user.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <Card className="bg-white border-2 border-gray-200 shadow-lg mt-6">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <CardTitle className="text-white text-xl font-bold flex items-center">
          <Users className="mr-3 h-6 w-6"/> User Management
        </CardTitle>
        <CardDescription className="text-blue-100">
          Manage system users and their departments
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search users by name, username, or department..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="w-12 h-12 animate-spin text-blue-600" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center p-12 bg-gray-50 border border-gray-200 rounded-lg">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Users Found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'No users match your search criteria.' : 'No users are registered in the system.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="p-4 text-gray-900 font-bold">Full Name</th>
                  <th className="p-4 text-gray-900 font-bold">Username</th>
                  <th className="p-4 text-gray-900 font-bold">Email</th>
                  <th className="p-4 text-gray-900 font-bold">Department</th>
                  <th className="p-4 text-gray-900 font-bold">Status</th>
                  <th className="p-4 text-gray-900 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredUsers.map((user) => (
                  <motion.tr 
                    key={user.id} 
                    className="border-b border-gray-100 hover:bg-gray-50" 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                  >
                    <td className="p-4 text-gray-900 font-medium">{user.fullName || user.full_name}</td>
                    <td className="p-4 text-gray-900 font-medium">{user.username}</td>
                    <td className="p-4 text-gray-900 font-medium">{user.email}</td>
                    <td className="p-4">
                      <Select
                        value={user.department}
                        onValueChange={(value) => handleUpdateDepartment(user.id, value)}
                      >
                        <SelectTrigger className={`px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent capitalize font-medium text-xs ${
                          user.department === 'admin' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                          user.department === 'management' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
                          user.department === 'finance' ? 'bg-green-100 text-green-800 border-green-300' :
                          user.department === 'sales' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          user.department === 'dispatch' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                          user.department === 'production' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' :
                          'bg-gray-100 text-gray-800 border-gray-300'
                        }`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map(dept => (
                            <SelectItem key={dept} value={dept} className="capitalize">
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        user.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {user.status || 'APPROVED'}
                      </span>
                    </td>
                    <td className="p-4">
                      <Button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="bg-red-600 hover:bg-red-700 text-white font-medium"
                        size="sm"
                      >
                        Delete
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ManagementDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { user, users, getPendingUsers, approveUser, rejectUser, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingApprovalId, setPendingApprovalId] = useState(null);
  const [orderApprovals, setOrderApprovals] = useState([]);
  const [leaveApprovals, setLeaveApprovals] = useState([]);
  const [tourApprovals, setTourApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(true);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [tourLoading, setTourLoading] = useState(true);
  const [activeApprovalTab, setActiveApprovalTab] = useState('users');
  const [notificationCounts, setNotificationCounts] = useState({
    pendingUsers: 0,
    pendingOrderBypass: 0,
    pendingFreeDelivery: 0,
    pendingLeaves: 0,
    pendingTours: 0
  });

  const loadAllData = async () => {
    await Promise.all([
      loadPendingUsers(),
      loadOrderApprovals(),
      loadLeaveApprovals(),
      loadTourApprovals()
    ]);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Auto-refresh every 15 seconds
  const { isRefreshing: autoRefreshing, lastRefreshTime, isPaused } = useAutoRefresh(
    loadAllData,
    15000,
    { enabled: true, pauseOnInput: true, pauseOnModal: true }
  );

  useEffect(() => {
    setNotificationCounts({
      pendingUsers: pendingUsers.length,
      pendingOrderBypass: orderApprovals.filter(approval => approval.requestType === 'coupon_applied').length,
      pendingFreeDelivery: orderApprovals.filter(approval => approval.requestType === 'free_delivery').length,
      pendingLeaves: leaveApprovals.filter(leave => leave.status === 'pending' || leave.status === 'manager_approved').length,
      pendingTours: tourApprovals.length
    });
  }, [pendingUsers, orderApprovals, leaveApprovals, tourApprovals]);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const loadPendingUsers = async () => {
    setLoading(true);
    try {
      const data = await getPendingUsers();
      setPendingUsers(data);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      const localPendingUsers = users.filter(user => user.status === 'PENDING');
      setPendingUsers(localPendingUsers);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderApprovals = async () => {
    setOrderLoading(true);
    try {
      const response = await fetch(`${API_BASE}/approval/pending`);
      if (response.ok) {
        const data = await response.json();
        setOrderApprovals(data.approvals || []);
      }
    } catch (error) {
      console.error('Error fetching order approvals:', error);
    } finally {
      setOrderLoading(false);
    }
  };

  const loadLeaveApprovals = async () => {
    setLeaveLoading(true);
    try {
      const response = await fetch(`${API_BASE}/hr/leaves/management-pending`);
      if (response.ok) {
        const data = await response.json();
        setLeaveApprovals(data || []);
      }
    } catch (error) {
      console.error('Error fetching leave approvals:', error);
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await approveUser(userId);
      toast({
        title: "User Approved",
        description: "The user can now log in to the system.",
      });
      loadPendingUsers();
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: error.message || "An error occurred while approving the user.",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (userId) => {
    try {
      await rejectUser(userId);
      toast({
        title: "User Rejected",
        description: "The user has been rejected and cannot log in.",
      });
      loadPendingUsers();
    } catch (error) {
      toast({
        title: "Rejection Failed",
        description: error.message || "An error occurred while rejecting the user.",
        variant: "destructive"
      });
    }
  };

  const handleApproveOrderClick = (approvalId, requestType) => {
    // Check if it's a free delivery or coupon bypass request - require password
    if (requestType === 'free_delivery' || requestType === 'coupon_applied') {
      setPendingApprovalId(approvalId);
      setPasswordInput('');
      setShowPasswordDialog(true);
    } else {
      // For other approvals, proceed directly
      handleApproveOrder(approvalId);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordInput) {
      toast({
        title: "Password Required",
        description: "Please enter your password to approve free delivery.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Verify password
      const verifyResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          username: user?.username,
          password: passwordInput
        })
      });

      if (!verifyResponse.ok) {
        throw new Error('Invalid password');
      }

      // Password is correct, proceed with approval
      await handleApproveOrder(pendingApprovalId);
      
      // Close dialog and reset
      setShowPasswordDialog(false);
      setPasswordInput('');
      setPendingApprovalId(null);
      
    } catch (error) {
      toast({
        title: "Authentication Failed",
        description: "Invalid password. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleApproveOrder = async (approvalId) => {
    try {
      const response = await fetch(`${API_BASE}/approval/approve/${approvalId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          approvedBy: user?.fullName || user?.username || 'Unknown User'
        })
      });
      
      const responseData = await response.json().catch(() => ({}));
      
      if (response.ok) {
        toast({
          title: "Order Approved",
          description: "The request has been approved.",
        });
        loadOrderApprovals();
      } else {
        throw new Error(responseData.error || 'Failed to approve order');
      }
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: error.message || "An error occurred while approving the order.",
        variant: "destructive"
      });
    }
  };

  const handleRejectOrder = async (approvalId) => {
    try {
      const response = await fetch(`${API_BASE}/approval/reject/${approvalId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          approvedBy: user?.fullName || user?.username || 'Unknown User',
          approvalNotes: 'Rejected by management'
        })
      });
      
      if (response.ok) {
        toast({
          title: "Order Rejected",
          description: "The request has been rejected.",
        });
        loadOrderApprovals();
      } else {
        throw new Error('Failed to reject order');
      }
    } catch (error) {
      toast({
        title: "Rejection Failed",
        description: error.message || "An error occurred while rejecting the order.",
        variant: "destructive"
      });
    }
  };

  const handleApproveLeave = async (leaveId) => {
    try {
      const response = await fetch(`${API_BASE}/hr/leaves/${leaveId}/management-approve`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          approved: true
        })
      });
      
      if (response.ok) {
        toast({
          title: "Leave Approved",
          description: "The leave request has been approved.",
        });
        loadLeaveApprovals();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve leave');
      }
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: error.message || "An error occurred while approving the leave.",
        variant: "destructive"
      });
    }
  };

  const handleRejectLeave = async (leaveId) => {
    try {
      const response = await fetch(`${API_BASE}/hr/leaves/${leaveId}/management-approve`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          approved: false
        })
      });
      
      if (response.ok) {
        toast({
          title: "Leave Rejected",
          description: "The leave request has been rejected.",
        });
        loadLeaveApprovals();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject leave');
      }
    } catch (error) {
      toast({
        title: "Rejection Failed",
        description: error.message || "An error occurred while rejecting the leave.",
        variant: "destructive"
      });
    }
  };

  const loadTourApprovals = async () => {
    setTourLoading(true);
    try {
      const response = await fetch(`${API_BASE}/hr/tours/management-pending`);
      if (response.ok) {
        const data = await response.json();
        setTourApprovals(data || []);
      }
    } catch (error) {
      console.error('Error fetching tour approvals:', error);
    } finally {
      setTourLoading(false);
    }
  };

  const handleApproveTour = async (tourId) => {
    try {
      const response = await fetch(`${API_BASE}/hr/tours/${tourId}/management-approve`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          approved: true
        })
      });
      
      if (response.ok) {
        toast({
          title: "Tour Approved",
          description: "The tour request has been approved and sent to HR for final approval.",
        });
        loadTourApprovals();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve tour');
      }
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: error.message || "An error occurred while approving the tour.",
        variant: "destructive"
      });
    }
  };

  const handleRejectTour = async (tourId) => {
    try {
      const response = await fetch(`${API_BASE}/hr/tours/${tourId}/management-approve`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          approved: false,
          notes: 'Rejected by management'
        })
      });
      
      if (response.ok) {
        toast({
          title: "Tour Rejected",
          description: "The tour request has been rejected.",
        });
        loadTourApprovals();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject tour');
      }
    } catch (error) {
      toast({
        title: "Rejection Failed",
        description: error.message || "An error occurred while rejecting the tour.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AutoRefreshIndicator 
        isRefreshing={autoRefreshing}
        lastRefreshTime={lastRefreshTime}
        isPaused={isPaused}
      />
      <style>{`
        /* Step 1: Block everything first */
        .management-readonly * {
          pointer-events: none !important;
        }
        
        /* Step 2: Re-enable tab navigation - Radix UI tabs */
        .management-readonly [role="tablist"],
        .management-readonly [role="tablist"] *,
        .management-readonly button[role="tab"],
        .management-readonly button[role="tab"] *,
        .management-readonly [data-radix-collection-item],
        .management-readonly [data-radix-collection-item] * {
          pointer-events: auto !important;
        }
        
        /* Step 3: Re-enable tab navigation - Custom button tabs (for Purchase, Store, etc.) */
        .management-readonly > div > div.flex.space-x-2,
        .management-readonly > div > div.flex.space-x-2 *,
        .management-readonly > div > div.flex.space-x-2 button,
        .management-readonly > div > div.flex.space-x-2 button * {
          pointer-events: auto !important;
        }
        
        /* Step 4: Re-enable any tabs container - all color variants */
        .management-readonly .border-b.border-blue-200,
        .management-readonly .border-b.border-blue-200 *,
        .management-readonly .border-b.border-blue-200 button,
        .management-readonly .border-b.border-blue-200 button *,
        .management-readonly .border-b.border-green-200,
        .management-readonly .border-b.border-green-200 *,
        .management-readonly .border-b.border-green-200 button,
        .management-readonly .border-b.border-green-200 button *,
        .management-readonly .border-b.border-orange-200,
        .management-readonly .border-b.border-orange-200 *,
        .management-readonly .border-b.border-orange-200 button,
        .management-readonly .border-b.border-orange-200 button * {
          pointer-events: auto !important;
        }
        
        /* Step 5: Ensure tab content is blocked */
        .management-readonly [role="tabpanel"] * {
          pointer-events: none !important;
        }
        
        /* Step 6: Visual feedback */
        .management-readonly [role="tabpanel"] {
          opacity: 0.7;
        }
        
        .management-readonly [role="tablist"],
        .management-readonly .border-b.border-blue-200,
        .management-readonly .border-b.border-green-200,
        .management-readonly .border-b.border-orange-200 {
          opacity: 1 !important;
        }
        
        /* Step 7: Disable all interactive elements in content (not in tab headers) */
        .management-readonly button:not(.border-b button):not([role="tab"]),
        .management-readonly input:not(.border-b input),
        .management-readonly textarea,
        .management-readonly select,
        .management-readonly a:not(.border-b a),
        .management-readonly form {
          pointer-events: none !important;
          cursor: not-allowed !important;
        }
        
        /* Step 8: Dim content but keep tabs bright */
        .management-readonly > div:not(:first-child) {
          opacity: 0.7;
        }
      `}</style>
      <div className="container mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left Section: Back Button + Department Info */}
            <div className="flex items-center gap-4 flex-1">
              <Button
                onClick={() => navigate(user?.department === 'admin' ? '/dashboard/admin' : '/dashboard')}
                variant="outline"
                className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm px-4 py-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-md flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Management Dashboard</h1>
                  <p className="text-sm text-gray-600">Overview and monitoring of all departments with full approval access</p>
                </div>
              </div>
            </div>
            
            {/* Right Section: Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Add Guest Button */}
              <Button
                onClick={() => setShowGuestDialog(true)}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 px-4 py-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>Add Guest</span>
              </Button>
              
              {/* Logout Button */}
              <Button 
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white font-medium flex items-center gap-2 px-4 py-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Desktop view - scrollable */}
          <div className="hidden md:block overflow-x-auto">
            <TabsList className="inline-flex w-max min-w-full bg-gray-100 p-1">
              <TabsTrigger value="overview" className="whitespace-nowrap">Overview</TabsTrigger>
              <TabsTrigger value="approval" className="whitespace-nowrap">Approval</TabsTrigger>
              <TabsTrigger value="production" className="whitespace-nowrap">Production</TabsTrigger>
              <TabsTrigger value="purchase" className="whitespace-nowrap">Purchase</TabsTrigger>
              <TabsTrigger value="store" className="whitespace-nowrap">Store</TabsTrigger>
              <TabsTrigger value="assembly" className="whitespace-nowrap">Assembly</TabsTrigger>
              <TabsTrigger value="finance" className="whitespace-nowrap">Finance</TabsTrigger>
              <TabsTrigger value="showroom" className="whitespace-nowrap">Showroom</TabsTrigger>
              <TabsTrigger value="sales" className="whitespace-nowrap">Sales</TabsTrigger>
              <TabsTrigger value="dispatch" className="whitespace-nowrap">Dispatch</TabsTrigger>
              <TabsTrigger value="watchman" className="whitespace-nowrap">Watchman</TabsTrigger>
              <TabsTrigger value="reception" className="whitespace-nowrap">Reception</TabsTrigger>
              <TabsTrigger value="transport" className="whitespace-nowrap">Transport</TabsTrigger>
              <TabsTrigger value="hr" className="whitespace-nowrap">HR</TabsTrigger>
              <TabsTrigger value="audit" className="whitespace-nowrap">Audit Trail</TabsTrigger>
            </TabsList>
          </div>
          
          {/* Mobile view - scrollable */}
          <div className="md:hidden overflow-x-auto">
            <TabsList className="inline-flex w-max bg-gray-100 p-1">
              <TabsTrigger value="overview" className="whitespace-nowrap text-sm px-3">Overview</TabsTrigger>
              <TabsTrigger value="approval" className="whitespace-nowrap text-sm px-3">Approval</TabsTrigger>
              <TabsTrigger value="production" className="whitespace-nowrap text-sm px-3">Production</TabsTrigger>
              <TabsTrigger value="purchase" className="whitespace-nowrap text-sm px-3">Purchase</TabsTrigger>
              <TabsTrigger value="store" className="whitespace-nowrap text-sm px-3">Store</TabsTrigger>
              <TabsTrigger value="assembly" className="whitespace-nowrap text-sm px-3">Assembly</TabsTrigger>
              <TabsTrigger value="finance" className="whitespace-nowrap text-sm px-3">Finance</TabsTrigger>
              <TabsTrigger value="showroom" className="whitespace-nowrap text-sm px-3">Showroom</TabsTrigger>
              <TabsTrigger value="sales" className="whitespace-nowrap text-sm px-3">Sales</TabsTrigger>
              <TabsTrigger value="dispatch" className="whitespace-nowrap text-sm px-3">Dispatch</TabsTrigger>
              <TabsTrigger value="watchman" className="whitespace-nowrap text-sm px-3">Watchman</TabsTrigger>
              <TabsTrigger value="reception" className="whitespace-nowrap text-sm px-3">Reception</TabsTrigger>
              <TabsTrigger value="transport" className="whitespace-nowrap text-sm px-3">Transport</TabsTrigger>
              <TabsTrigger value="hr" className="whitespace-nowrap text-sm px-3">HR</TabsTrigger>
              <TabsTrigger value="audit" className="whitespace-nowrap text-sm px-3">Audit Trail</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <Tabs defaultValue="alerts" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="users">User Management</TabsTrigger>
                <TabsTrigger value="alerts">Alerts</TabsTrigger>
                <TabsTrigger value="sales-targets">Set Sales Target</TabsTrigger>
                <TabsTrigger value="performance">Sales Performance</TabsTrigger>
              </TabsList>
              <TabsContent value="alerts">
                <ManagementAlerts />
              </TabsContent>
              <TabsContent value="users">
                <UserManagement />
              </TabsContent>
              <TabsContent value="sales-targets">
                <SetSalesTarget />
              </TabsContent>
              <TabsContent value="performance">
                <SalesPerformanceDashboard isAdmin={true} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="approval">
            <div className="space-y-6">
              <Tabs value={activeApprovalTab} onValueChange={setActiveApprovalTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="users" className="relative">
                    User Approvals
                    {notificationCounts.pendingUsers > 0 && (
                      <div className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.25rem] h-5 px-1">
                        {notificationCounts.pendingUsers}
                      </div>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="orders" className="relative">
                    Coupon Bypass
                    {notificationCounts.pendingOrderBypass > 0 && (
                      <div className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.25rem] h-5 px-1">
                        {notificationCounts.pendingOrderBypass}
                      </div>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="freedelivery" className="relative">
                    Free Delivery
                    {notificationCounts.pendingFreeDelivery > 0 && (
                      <div className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.25rem] h-5 px-1">
                        {notificationCounts.pendingFreeDelivery}
                      </div>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="leaves" className="relative">
                    Leave Requests
                    {notificationCounts.pendingLeaves > 0 && (
                      <div className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.25rem] h-5 px-1">
                        {notificationCounts.pendingLeaves}
                      </div>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="tours" className="relative">
                    Tour Requests
                    {notificationCounts.pendingTours > 0 && (
                      <div className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold min-w-[1.25rem] h-5 px-1">
                        {notificationCounts.pendingTours}
                      </div>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                  <Card className="bg-white border-2 border-gray-200 shadow-lg mt-6">
                    <CardHeader className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
                      <CardTitle className="text-white text-xl font-bold flex items-center">
                        <ClipboardCheck className="mr-3 h-6 w-6"/> Pending User Approvals
                      </CardTitle>
                      <CardDescription className="text-amber-100">
                        Review and approve new user registrations
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      {loading ? (
                        <div className="flex items-center justify-center p-12">
                          <RefreshCw className="w-12 h-12 animate-spin text-blue-600" />
                        </div>
                      ) : pendingUsers.length === 0 ? (
                        <div className="text-center p-12 bg-gray-50 border border-gray-200 rounded-lg">
                          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-gray-800 mb-2">No Pending Approvals</h3>
                          <p className="text-gray-600">All user registrations have been processed.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="w-full text-left">
                            <thead className="bg-gray-50">
                              <tr className="border-b border-gray-200">
                                <th className="p-4 text-gray-900 font-bold">Full Name</th>
                                <th className="p-4 text-gray-900 font-bold">Username</th>
                                <th className="p-4 text-gray-900 font-bold">Email</th>
                                <th className="p-4 text-gray-900 font-bold">Department</th>
                                <th className="p-4 text-gray-900 font-bold">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {pendingUsers.map((user) => (
                                <motion.tr 
                                  key={user.id} 
                                  className="border-b border-gray-100 hover:bg-gray-50" 
                                  initial={{ opacity: 0 }} 
                                  animate={{ opacity: 1 }}
                                >
                                  <td className="p-4 text-gray-900 font-medium">{user.fullName || user.full_name}</td>
                                  <td className="p-4 text-gray-900 font-medium">{user.username}</td>
                                  <td className="p-4 text-gray-900 font-medium">{user.email}</td>
                                  <td className="p-4 text-gray-900 font-medium capitalize">{user.department}</td>
                                  <td className="p-4 flex space-x-3">
                                    <Button 
                                      onClick={() => handleApprove(user.id)}
                                      className="bg-green-600 hover:bg-green-700 text-white font-medium"
                                      size="sm"
                                    >
                                      <UserCheck className="w-4 h-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button 
                                      onClick={() => handleReject(user.id)}
                                      className="bg-red-600 hover:bg-red-700 text-white font-medium"
                                      size="sm"
                                    >
                                      <UserX className="w-4 h-4 mr-1" />
                                      Reject
                                    </Button>
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="orders">
                  <Card className="bg-white border-2 border-gray-200 shadow-lg mt-6">
                    <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                      <CardTitle className="text-white text-xl font-bold flex items-center">
                        <FileText className="mr-3 h-6 w-6"/> Coupon Bypass Approvals
                      </CardTitle>
                      <CardDescription className="text-blue-100">
                        Review and approve coupon bypass requests
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      {orderLoading ? (
                        <div className="flex items-center justify-center p-12">
                          <RefreshCw className="w-12 h-12 animate-spin text-blue-600" />
                        </div>
                      ) : orderApprovals.filter(a => a.requestType === 'coupon_applied').length === 0 ? (
                        <div className="text-center p-12 bg-gray-50 border border-gray-200 rounded-lg">
                          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-gray-800 mb-2">No Pending Approvals</h3>
                          <p className="text-gray-600">All coupon bypass requests have been processed.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="w-full text-left">
                            <thead className="bg-gray-50">
                              <tr className="border-b border-gray-200">
                                <th className="p-4 text-gray-900 font-bold">Order ID</th>
                                <th className="p-4 text-gray-900 font-bold">Customer</th>
                                <th className="p-4 text-gray-900 font-bold">Product</th>
                                <th className="p-4 text-gray-900 font-bold">Amount</th>
                                <th className="p-4 text-gray-900 font-bold">Coupon</th>
                                <th className="p-4 text-gray-900 font-bold">Reason</th>
                                <th className="p-4 text-gray-900 font-bold">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {orderApprovals.filter(a => a.requestType === 'coupon_applied').map((approval) => (
                                <motion.tr 
                                  key={approval.id} 
                                  className="border-b border-gray-100 hover:bg-gray-50" 
                                  initial={{ opacity: 0 }} 
                                  animate={{ opacity: 1 }}
                                >
                                  <td className="p-4 text-gray-800 font-medium">#{approval.orderNumber}</td>
                                  <td className="p-4 text-gray-700">{approval.customerName}</td>
                                  <td className="p-4 text-gray-700">{approval.productName}</td>
                                  <td className="p-4 text-gray-700">₹{approval.finalAmount}</td>
                                  <td className="p-4 text-gray-700">{approval.coupon_code}</td>
                                  <td className="p-4 text-gray-700">{approval.requestDetails}</td>
                                  <td className="p-4">
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleApproveOrderClick(approval.id, approval.requestType)}
                                      >
                                        ✓ Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                        onClick={() => handleRejectOrder(approval.id)}
                                      >
                                        ✗ Reject
                                      </Button>
                                    </div>
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="freedelivery">
                  <Card className="bg-white border-2 border-gray-200 shadow-lg mt-6">
                    <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
                      <CardTitle className="text-white text-xl font-bold flex items-center">
                        <FileText className="mr-3 h-6 w-6"/> Free Delivery Approvals
                      </CardTitle>
                      <CardDescription className="text-green-100">
                        Review and approve free delivery requests
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      {orderLoading ? (
                        <div className="flex items-center justify-center p-12">
                          <RefreshCw className="w-12 h-12 animate-spin text-blue-600" />
                        </div>
                      ) : orderApprovals.filter(a => a.requestType === 'free_delivery').length === 0 ? (
                        <div className="text-center p-12 bg-gray-50 border border-gray-200 rounded-lg">
                          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-gray-800 mb-2">No Pending Approvals</h3>
                          <p className="text-gray-600">All free delivery requests have been processed.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="w-full text-left">
                            <thead className="bg-gray-50">
                              <tr className="border-b border-gray-200">
                                <th className="p-4 text-gray-900 font-bold">Order ID</th>
                                <th className="p-4 text-gray-900 font-bold">Customer</th>
                                <th className="p-4 text-gray-900 font-bold">Product</th>
                                <th className="p-4 text-gray-900 font-bold">Amount</th>
                                <th className="p-4 text-gray-900 font-bold">Requested By</th>
                                <th className="p-4 text-gray-900 font-bold">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {orderApprovals.filter(a => a.requestType === 'free_delivery').map((approval) => (
                                <motion.tr 
                                  key={approval.id} 
                                  className="border-b border-gray-100 hover:bg-gray-50" 
                                  initial={{ opacity: 0 }} 
                                  animate={{ opacity: 1 }}
                                >
                                  <td className="p-4 text-gray-800 font-medium">#{approval.orderNumber}</td>
                                  <td className="p-4 text-gray-700">{approval.customerName}</td>
                                  <td className="p-4 text-gray-700">{approval.productName}</td>
                                  <td className="p-4 text-gray-700">₹{approval.finalAmount}</td>
                                  <td className="p-4 text-gray-700">{approval.requestedBy}</td>
                                  <td className="p-4">
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleApproveOrderClick(approval.id, approval.requestType)}
                                      >
                                        ✓ Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                        onClick={() => handleRejectOrder(approval.id)}
                                      >
                                        ✗ Reject
                                      </Button>
                                    </div>
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="leaves">
                  <Card className="bg-white border-2 border-gray-200 shadow-lg mt-6">
                    <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                      <CardTitle className="text-white text-xl font-bold flex items-center">
                        <Users className="mr-3 h-6 w-6"/> Leave Request Approvals
                      </CardTitle>
                      <CardDescription className="text-purple-100">
                        Review and approve leave requests from HR and Manager employees
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      {leaveLoading ? (
                        <div className="flex items-center justify-center p-12">
                          <RefreshCw className="w-12 h-12 animate-spin text-purple-600" />
                        </div>
                      ) : leaveApprovals.length === 0 ? (
                        <div className="text-center p-12 bg-gray-50 border border-gray-200 rounded-lg">
                          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-gray-800 mb-2">No Pending Leave Requests</h3>
                          <p className="text-gray-600">All leave requests from HR and Manager employees have been processed.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="w-full text-left">
                            <thead className="bg-gray-50">
                              <tr className="border-b border-gray-200">
                                <th className="p-4 text-gray-900 font-bold">Employee</th>
                                <th className="p-4 text-gray-900 font-bold">Designation</th>
                                <th className="p-4 text-gray-900 font-bold">Leave Type</th>
                                <th className="p-4 text-gray-900 font-bold">Duration</th>
                                <th className="p-4 text-gray-900 font-bold">Period</th>
                                <th className="p-4 text-gray-900 font-bold">Reason</th>
                                <th className="p-4 text-gray-900 font-bold">Status</th>
                                <th className="p-4 text-gray-900 font-bold">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {leaveApprovals.map((leave) => (
                                <motion.tr 
                                  key={leave.id} 
                                  className="border-b border-gray-100 hover:bg-gray-50"
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <td className="p-4 text-gray-900 font-medium">{leave.employeeName}</td>
                                  <td className="p-4 text-gray-700">{leave.employeeDesignation || 'N/A'}</td>
                                  <td className="p-4 text-gray-700">{leave.leaveType}</td>
                                  <td className="p-4 text-gray-700">{leave.daysRequested} day(s)</td>
                                  <td className="p-4 text-gray-700 text-sm">
                                    {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                                  </td>
                                  <td className="p-4 text-gray-700 max-w-xs truncate" title={leave.reason}>
                                    {leave.reason}
                                  </td>
                                  <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                      leave.status === 'manager_approved' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {leave.status === 'manager_approved' ? 'Manager Approved' : 'Pending'}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex gap-2">
                                      <Button 
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleApproveLeave(leave.id)}
                                      >
                                        ✓ Approve
                                      </Button>
                                      <Button 
                                        size="sm"
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                        onClick={() => handleRejectLeave(leave.id)}
                                      >
                                        ✗ Reject
                                      </Button>
                                    </div>
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="tours">
                  <Card className="bg-white border-2 border-gray-200 shadow-lg mt-6">
                    <CardHeader className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
                      <CardTitle className="text-white text-xl font-bold flex items-center">
                        <Building2 className="mr-3 h-6 w-6"/> Tour Intimation Approvals
                      </CardTitle>
                      <CardDescription className="text-teal-100">
                        Review and approve tour requests from HR department
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      {tourLoading ? (
                        <div className="flex items-center justify-center p-12">
                          <RefreshCw className="w-12 h-12 animate-spin text-teal-600" />
                        </div>
                      ) : tourApprovals.length === 0 ? (
                        <div className="text-center p-12 bg-gray-50 border border-gray-200 rounded-lg">
                          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-xl font-bold text-gray-800 mb-2">No Pending Tour Requests</h3>
                          <p className="text-gray-600">All tour requests have been processed.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="w-full text-left">
                            <thead className="bg-gray-50">
                              <tr className="border-b border-gray-200">
                                <th className="p-4 text-gray-900 font-bold">Employee</th>
                                <th className="p-4 text-gray-900 font-bold">Destination</th>
                                <th className="p-4 text-gray-900 font-bold">Purpose</th>
                                <th className="p-4 text-gray-900 font-bold">Duration</th>
                                <th className="p-4 text-gray-900 font-bold">Period</th>
                                <th className="p-4 text-gray-900 font-bold">Estimated Cost</th>
                                <th className="p-4 text-gray-900 font-bold">Travel Mode</th>
                                <th className="p-4 text-gray-900 font-bold">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white">
                              {tourApprovals.map((tour) => (
                                <motion.tr 
                                  key={tour.id} 
                                  className="border-b border-gray-100 hover:bg-gray-50"
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <td className="p-4 text-gray-900 font-medium">{tour.employeeName}</td>
                                  <td className="p-4 text-gray-700">{tour.destination}</td>
                                  <td className="p-4 text-gray-700 max-w-xs truncate" title={tour.tourPurpose}>
                                    {tour.tourPurpose}
                                  </td>
                                  <td className="p-4 text-gray-700">{tour.durationDays} day(s)</td>
                                  <td className="p-4 text-gray-700 text-sm">
                                    {new Date(tour.startDate).toLocaleDateString()} - {new Date(tour.endDate).toLocaleDateString()}
                                  </td>
                                  <td className="p-4 text-gray-700">₹{tour.estimatedCost?.toLocaleString() || '0'}</td>
                                  <td className="p-4 text-gray-700 capitalize">{tour.travelMode || 'N/A'}</td>
                                  <td className="p-4">
                                    <div className="flex gap-2">
                                      <Button 
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleApproveTour(tour.id)}
                                      >
                                        ✓ Approve
                                      </Button>
                                      <Button 
                                        size="sm"
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                        onClick={() => handleRejectTour(tour.id)}
                                      >
                                        ✗ Reject
                                      </Button>
                                    </div>
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="production">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">Read-Only Mode</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">You can view this department but cannot perform actions</p>
            </div>
            <div className="management-readonly">
              <ProductionPlanning />
            </div>
          </TabsContent>

          <TabsContent value="purchase">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">Read-Only Mode</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">You can view this department but cannot perform actions</p>
            </div>
            <div className="management-readonly">
              <PurchaseDepartment />
            </div>
          </TabsContent>

          <TabsContent value="store">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">Read-Only Mode</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">You can view this department but cannot perform actions</p>
            </div>
            <div className="management-readonly">
              <StoreDepartment />
            </div>
          </TabsContent>

          <TabsContent value="assembly">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">Read-Only Mode</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">You can view this department but cannot perform actions</p>
            </div>
            <div className="management-readonly">
              <AssemblyTeam />
            </div>
          </TabsContent>

          <TabsContent value="finance">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">Read-Only Mode</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">You can view this department but cannot perform actions</p>
            </div>
            <div className="management-readonly">
              <FinanceDepartment />
            </div>
          </TabsContent>

          <TabsContent value="showroom">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">Read-Only Mode</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">You can view this department but cannot perform actions</p>
            </div>
            <div className="management-readonly">
              <ShowroomDepartment />
            </div>
          </TabsContent>

          <TabsContent value="sales">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">Read-Only Mode</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">You can view this department but cannot perform actions</p>
            </div>
            <div className="management-readonly">
              <SalesDepartment />
            </div>
          </TabsContent>

          <TabsContent value="dispatch">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">Read-Only Mode</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">You can view this department but cannot perform actions</p>
            </div>
            <div className="management-readonly">
              <DispatchDepartment />
            </div>
          </TabsContent>

          <TabsContent value="watchman">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">Read-Only Mode</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">You can view this department but cannot perform actions</p>
            </div>
            <div className="management-readonly">
              <WatchmanDepartment />
            </div>
          </TabsContent>

          <TabsContent value="reception">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">Read-Only Mode</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">You can view this department but cannot perform actions</p>
            </div>
            <div className="management-readonly">
              <ReceptionDepartment />
            </div>
          </TabsContent>

          <TabsContent value="transport">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">Read-Only Mode</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">You can view this department but cannot perform actions</p>
            </div>
            <div className="management-readonly">
              <TransportDepartment />
            </div>
          </TabsContent>

          <TabsContent value="hr">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">Read-Only Mode</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">You can view this department but cannot perform actions</p>
            </div>
            <div className="management-readonly">
              <HRDepartment />
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <AuditTrail />
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Guest Dialog */}
      <GuestDialog 
        open={showGuestDialog} 
        onOpenChange={setShowGuestDialog}
      />

      {/* Password Verification Dialog for Approvals */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Password Verification Required</DialogTitle>
            <DialogDescription>
              Please enter your password to approve this request. This is required for coupon bypass and free delivery approvals.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handlePasswordSubmit();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setPasswordInput('');
                setPendingApprovalId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordSubmit}
              className="bg-green-600 hover:bg-green-700"
            >
              Verify & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagementDashboard;
