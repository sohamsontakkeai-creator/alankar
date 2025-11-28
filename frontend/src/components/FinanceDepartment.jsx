import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import { formatToIST } from '@/utils/dateFormatter';

import { 
  IndianRupee, 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  FileText,
  ThumbsUp,
  XCircle,
  RefreshCw,
  AlertCircle,
  Building,
  Users,
  Calendar,
  Download,
  CheckCircle,
  Wallet,
  CreditCard,
  Smartphone,
  Banknote
} from 'lucide-react';
import { API_BASE } from '@/lib/api';
import OrderStatusBar from '@/components/ui/OrderStatusBar';
import { GuestDialog } from '@/components/GuestDialog';
import { UserCheck } from 'lucide-react';
import LeaveRequestButton from '@/components/LeaveRequestButton';
import ManagerLeaveApprovalButton from '@/components/ManagerLeaveApprovalButton';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { AutoRefreshIndicator } from '@/components/AutoRefreshIndicator';

const FinanceDepartment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [pendingSalesPayments, setPendingSalesPayments] = useState([]);
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    recentTransactions: [],
    pendingApprovals: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [paymentReminders, setPaymentReminders] = useState([]);
  const [approvedPurchaseOrders, setApprovedPurchaseOrders] = useState([]);
  const [approvedSalesOrders, setApprovedSalesOrders] = useState([]);
  const [bypassedSalesOrders, setBypassedSalesOrders] = useState([]);

  // Fetch purchase orders pending finance approval
  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch(`${API_BASE}/finance/purchase-orders`);
      if (!response.ok) throw new Error('Failed to fetch purchase orders');
      const data = await response.json();
      setPurchaseOrders(data);
    } catch (err) {
      setError('Failed to load purchase orders');
      console.error('Error fetching purchase orders:', err);
    }
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_BASE}/finance/dashboard`);
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Error fetching dashboard data:', err);
    }
  };

  const fetchPendingSalesPayments = async () => {
    try {
      const res = await fetch(`${API_BASE}/finance/sales-payments/pending`);
      if (!res.ok) throw new Error('Failed to fetch pending sales payments');
      const data = await res.json();
      setPendingSalesPayments(data);
    } catch (err) {
      console.error('Error fetching pending sales payments:', err);
    }
  };

  const fetchPaymentReminders = async () => {
    try {
      // Finance sees ALL reminders (no filtering by sales person)
      const response = await fetch(`${API_BASE}/sales/payment-reminders`);
      if (response.ok) {
        const data = await response.json();
        setPaymentReminders(data.reminders || []);
      }
    } catch (error) {
      console.error('Error fetching payment reminders:', error);
    }
  };

  const fetchApprovedPurchaseOrders = async () => {
    try {
      const response = await fetch(`${API_BASE}/finance/purchase-bills`);
      if (!response.ok) throw new Error('Failed to fetch approved purchase orders');
      const data = await response.json();
      setApprovedPurchaseOrders(data);
    } catch (err) {
      console.error('Error fetching approved purchase orders:', err);
    }
  };

  const fetchApprovedSalesOrders = async () => {
    try {
      const response = await fetch(`${API_BASE}/finance/sales-bills`);
      if (!response.ok) throw new Error('Failed to fetch approved sales orders');
      const data = await response.json();
      setApprovedSalesOrders(data);
    } catch (err) {
      console.error('Error fetching approved sales orders:', err);
    }
  };

  const fetchBypassedSalesOrders = async () => {
    try {
      const response = await fetch(`${API_BASE}/finance/bypassed-sales`);
      if (!response.ok) throw new Error('Failed to fetch bypassed sales orders');
      const data = await response.json();
      setBypassedSalesOrders(data);
    } catch (err) {
      console.error('Error fetching bypassed sales orders:', err);
    }
  };

  // Download Invoice function
  const handleDownloadInvoice = async (orderId, orderNumber, orderData = null) => {
    try {
      toast({ title: 'Opening Invoice...', description: 'Generating invoice' });
      
      // Always use POST with order data to ensure latest values
      const dataToSend = orderData || {};
      
      const response = await fetch(`${API_BASE}/finance/orders/${orderId}/invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unitPrice: dataToSend.unitPrice || dataToSend.finalAmount,
          quantity: dataToSend.quantity,
          transportCost: dataToSend.transportCost,
          discountAmount: dataToSend.discountAmount,
          finalAmount: dataToSend.finalAmount,
          totalAmount: dataToSend.totalAmount,
          deliveryType: dataToSend.Delivery_type || dataToSend.deliveryType
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate invoice');
      }
      
      const htmlContent = await response.text();
      
      // Open in new window
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        toast({ title: 'Success', description: 'Invoice opened in new window' });
      } else {
        toast({ 
          title: 'Error', 
          description: 'Please allow popups for this site', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      console.error('Error opening invoice:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to open invoice', 
        variant: 'destructive' 
      });
    }
  };

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchPurchaseOrders(), 
        fetchDashboardData(), 
        fetchPendingSalesPayments(), 
        fetchPaymentReminders(),
        fetchApprovedPurchaseOrders(),
        fetchApprovedSalesOrders(),
        fetchBypassedSalesOrders()
      ]);
    } catch (err) {
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    refreshData();
  }, []);

  // Auto-refresh every 10 seconds
  const { isRefreshing: autoRefreshing, lastRefreshTime, isPaused } = useAutoRefresh(
    refreshData,
    10000,
    { enabled: true, pauseOnInput: true, pauseOnModal: true }
  );
  
  const handleApproval = async (orderId, approved) => {
    try {
      const response = await fetch(`${API_BASE}/finance/purchase-orders/${orderId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved, approvedBy: user?.fullName || user?.username || 'Unknown User' })
      });

      if (!response.ok) throw new Error('Failed to process approval');
      
      const data = await response.json();
      
      // Refresh data to get updated information
      await refreshData();
      
      toast({
        title: approved ? '✅ Finance Approved' : '❌ Purchase Rejected',
        description: approved ? `Order #${orderId} approved and sent to store for processing.` : `Order #${orderId} has been rejected.`,
        variant: approved ? 'default' : 'destructive'
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to process the approval. Please try again.',
        variant: 'destructive'
      });
      console.error('Error handling approval:', err);
    }
  };

  const handleApproveSalesPayment = async (orderId, approved) => {
    try {
      const response = await fetch(`${API_BASE}/finance/sales-payments/${orderId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, approvedBy: user?.fullName || user?.username || 'Unknown User' })
      });
      if (!response.ok) throw new Error('Failed to update sales payment status');
      await refreshData();
      toast({
        title: approved ? 'Payment Approved' : 'Payment Rejected',
        description: `Sales order #${orderId} has been ${approved ? 'approved' : 'rejected'}.`
      });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update payment status', variant: 'destructive' });
      console.error('Error approving sales payment:', err);
    }
  };

  // Calculate total order cost including materials and extra materials
  const calculateOrderCost = (order) => {
    if (!order) return 0;
    
    const materials = order.materials || [];
    const extraMaterials = order.extraMaterials || [];
    
    const materialsCost = materials.reduce((sum, material) => {
      const quantity = material.quantity || 0;
      const unitCost = material.unit_cost || 0;
      return sum + (quantity * unitCost);
    }, 0);
    
    const extraCost = extraMaterials.reduce((sum, material) => {
      const quantity = material.quantity || 0;
      const unitCost = material.unit_cost || 0;
      return sum + (quantity * unitCost);
    }, 0);
    
    return materialsCost + extraCost;
  };

  // Tab state: 0 = Finance Approval, 1 = Financial Performance Overview
  const [activeTab, setActiveTab] = useState(0);
  const approvalCount = (purchaseOrders?.length || 0) + (pendingSalesPayments?.length || 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-800 text-lg font-medium">Loading Finance dashboard...</p>
          <p className="text-gray-600 text-sm mt-1">Please wait while we retrieve the data</p>
        </div>
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
    <AutoRefreshIndicator 
      isRefreshing={autoRefreshing}
      lastRefreshTime={lastRefreshTime}
      isPaused={isPaused}
    />
    {/* Government Header */}
    <div className="max-w-7xl mx-auto bg-white shadow-md border-b-4 border-blue-800 rounded-b-lg">
      {/* Main Header */}
      <div className="px-4 py-6 sm:px-6">
        <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
          {/* Left: Back + Title */}
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
            <Button
              onClick={() => navigate(user?.department === 'admin' ? '/dashboard/admin' : '/dashboard')}
              variant="outline"
              className="border border-gray-300 bg-white text-gray-800 text-sm placeholder-gray-500"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-800 rounded-lg flex items-center justify-center shadow-lg">
                <IndianRupee className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Finance Department</h1>
                <p className="text-gray-600 text-sm sm:text-base font-medium">
                  Financial Management & Approval System
                </p>
              </div>
            </div>
          </div>

          {/* Right: User Panel + Add Guest Button */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="bg-gradient-to-r from-green-50 to-indigo-50 border-2 border-green-200 px-4 py-4 sm:px-6 rounded-lg shadow-sm w-full sm:w-auto">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-gray-600 text-xs font-medium">Finance Team</p>
                  <p className="text-green-600 text-xs font-medium">Financial Management</p>
                </div>
              </div>
            </div>

            {/* Leave Request Button */}
            <LeaveRequestButton user={user} />

            {/* Manager Leave Approval Button (only shows for managers) */}
            <ManagerLeaveApprovalButton user={user} />

            {/* Add Guest Button */}
            <Button
              onClick={() => setShowGuestDialog(true)}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 w-full sm:w-auto"
            >
              <UserCheck className="w-4 h-4" />
              <span>Add Guest</span>
            </Button>
          </div>

        </div>
      </div>
    </div>
      
      {/* Order Status Bar */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <OrderStatusBar className="mb-4" />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6">
        {/* Tabs */}
        <div className="flex space-x-2 border-b border-green-200 mb-8">
          <button
            className={`relative px-6 py-3 text-lg font-semibold focus:outline-none transition-colors border-b-4 ${activeTab === 0 ? 'border-green-700 text-green-800 bg-white' : 'border-transparent text-gray-500 bg-green-50 hover:text-green-700'}`}
            onClick={() => setActiveTab(0)}
          >
            Finance Approval
            {approvalCount > 0 && (
              <span className="absolute top-2 right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                {approvalCount}
              </span>
            )}
          </button>
          <button
            className={`relative px-6 py-3 text-lg font-semibold focus:outline-none transition-colors border-b-4 ${activeTab === 2 ? 'border-green-700 text-green-800 bg-white' : 'border-transparent text-gray-500 bg-green-50 hover:text-green-700'}`}
            onClick={() => setActiveTab(2)}
            title={`Payment Reminders: ${paymentReminders.filter(r => r.status === 'overdue').length} overdue, ${paymentReminders.filter(r => r.status !== 'overdue').length} due today`}
          >
            Payment Reminders
            {paymentReminders.length > 0 && (
              <span 
                className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full"
                title={`${paymentReminders.length} total payment reminders (${paymentReminders.filter(r => r.status === 'overdue').length} overdue, ${paymentReminders.filter(r => r.status !== 'overdue').length} due today)`}
              >
                {paymentReminders.length}
              </span>
            )}
          </button>
          <button
            className={`px-6 py-3 text-lg font-semibold focus:outline-none transition-colors border-b-4 ${activeTab === 3 ? 'border-green-700 text-green-800 bg-white' : 'border-transparent text-gray-500 bg-green-50 hover:text-green-700'}`}
            onClick={() => setActiveTab(3)}
          >
            Purchase Bills
          </button>
          <button
            className={`px-6 py-3 text-lg font-semibold focus:outline-none transition-colors border-b-4 ${activeTab === 4 ? 'border-green-700 text-green-800 bg-white' : 'border-transparent text-gray-500 bg-green-50 hover:text-green-700'}`}
            onClick={() => setActiveTab(4)}
          >
            Sales Bills
          </button>
          <button
            className={`px-6 py-3 text-lg font-semibold focus:outline-none transition-colors border-b-4 ${activeTab === 5 ? 'border-green-700 text-green-800 bg-white' : 'border-transparent text-gray-500 bg-green-50 hover:text-green-700'}`}
            onClick={() => setActiveTab(5)}
          >
            Bypassed Orders
          </button>
          <button
            className={`px-6 py-3 text-lg font-semibold focus:outline-none transition-colors border-b-4 ${activeTab === 1 ? 'border-green-700 text-green-800 bg-white' : 'border-transparent text-gray-500 bg-green-50 hover:text-green-700'}`}
            onClick={() => setActiveTab(1)}
          >
            Financial Performance Overview
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 0 ? (
          <>
            {error && (
              <Card className="mb-6 bg-red-50 border-2 border-red-200 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-700 font-medium">{error}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Orders for Finance Approvals */}
            {purchaseOrders.length === 0 && pendingSalesPayments.length === 0 && (
              <Card className="bg-white border border-gray-300 shadow-sm">
                <CardContent className="p-8 text-center">
                  <IndianRupee className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No Orders for Finance Approvals</h3>
                  <p className="text-gray-600">All purchase orders and sales payments have been processed.</p>
                </CardContent>
              </Card>
            )}

            {/* Purchase Orders Awaiting Approval */}
            {purchaseOrders.length > 0 && (
              <Card className="mb-8 bg-white border-2 border-gray-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                  <CardTitle className="text-white flex items-center font-bold text-xl">
                    <FileText className="w-6 h-6 mr-3" />
                    Purchase Orders Awaiting Approval ({purchaseOrders.length})
                  </CardTitle>
                  <p className="text-blue-100 text-sm font-medium mt-1">Review and approve purchase requests</p>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  {purchaseOrders.map(order => (
                    <motion.div 
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-6 bg-gray-50 border-2 border-gray-200 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="font-bold text-gray-900 text-lg">
                              Order #{order.id} - {order.productName}
                            </h3>
                            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full border border-amber-300">
                              {order.status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="text-gray-700">
                              <span className="font-bold">Quantity:</span> {order.quantity} units
                            </div>
                            <div className="text-gray-700">
                              <span className="font-bold text-green-900">Total Cost : ₹ {calculateOrderCost(order).toLocaleString()} </span> 
                            </div>
                            <div className="flex items-center text-gray-700">
                              <Calendar className="w-4 h-4 mr-1" />
                              <span className="font-bold">Created:</span> {order.createdAt}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Payment Terms */}
                      {order.paymentTerms && (
                        <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <IndianRupee className="w-5 h-5 text-yellow-700" />
                            <p className="text-sm font-bold text-yellow-900">Payment Terms:</p>
                          </div>
                          <p className="text-lg font-semibold text-yellow-900">
                            {order.paymentTerms === 'full_payment' && 'Full Payment (100%)'}
                            {order.paymentTerms === '50_50' && '50-50 Split Payment'}
                            {order.paymentTerms === '30_70' && '30-70 Split Payment'}
                            {order.paymentTerms === '70_30' && '70-30 Split Payment'}
                            {order.paymentTerms === 'cod' && 'Cash on Delivery (COD)'}
                            {order.paymentTerms === 'advance_50' && '50% Advance Payment'}
                            {order.paymentTerms === 'advance_30' && '30% Advance Payment'}
                            {order.paymentTerms === 'credit_30' && '30 Days Credit'}
                            {order.paymentTerms === 'credit_60' && '60 Days Credit'}
                            {order.paymentTerms === 'other' && 'Other Terms (See Notes)'}
                          </p>
                        </div>
                      )}
                      
                      {/* Materials List */}
                      {order.materials && order.materials.length > 0 && (
                        <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                          <p className="text-sm font-bold text-blue-900 mb-3">Required Materials (Shortage):</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {order.materials.map((material, index) => (
                              <div key={index} className="flex justify-between text-sm bg-white p-2 rounded border border-blue-200">
                                <span className="text-gray-900 font-medium">{material.name}</span>
                                <span className="text-gray-700 font-medium">
                                  {material.quantity} units × ₹{material.unit_cost || 0} = ₹{((material.quantity || 0) * (material.unit_cost || 0)).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-blue-300 flex justify-between items-center">
                            <span className="text-sm font-semibold text-blue-900">Required Materials Subtotal:</span>
                            <span className="text-lg font-bold text-blue-900">
                              ₹{order.materials.reduce((sum, m) => sum + ((m.quantity || 0) * (m.unit_cost || 0)), 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Extra Materials List */}
                      {order.extraMaterials && order.extraMaterials.length > 0 && (
                        <div className="mb-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                          <p className="text-sm font-bold text-green-900 mb-3">Extra Materials (Additional Purchase):</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {order.extraMaterials.map((material, index) => (
                              <div key={index} className="flex justify-between text-sm bg-white p-2 rounded border border-green-200">
                                <span className="text-gray-900 font-medium">{material.name}</span>
                                <span className="text-gray-700 font-medium">
                                  {material.quantity} units × ₹{material.unit_cost || 0} = ₹{((material.quantity || 0) * (material.unit_cost || 0)).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-green-300 flex justify-between items-center">
                            <span className="text-sm font-semibold text-green-900">Extra Materials Subtotal:</span>
                            <span className="text-lg font-bold text-green-900">
                              ₹{order.extraMaterials.reduce((sum, m) => sum + ((m.quantity || 0) * (m.unit_cost || 0)), 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Total Cost */}
                      {((order.materials && order.materials.length > 0) || (order.extraMaterials && order.extraMaterials.length > 0)) && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-orange-400 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-900">Total Purchase Cost:</span>
                            <span className="text-2xl font-bold text-orange-700">
                              ₹{(
                                (order.materials || []).reduce((sum, m) => sum + ((m.quantity || 0) * (m.unit_cost || 0)), 0) +
                                (order.extraMaterials || []).reduce((sum, m) => sum + ((m.quantity || 0) * (m.unit_cost || 0)), 0)
                              ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-4 pt-4 border-t border-gray-200">
                        <Button 
                          onClick={() => handleApproval(order.id, true)} 
                          className="bg-green-600 hover:bg-green-700 text-white font-medium px-6"
                        >
                          <ThumbsUp className="w-4 h-4 mr-2"/>
                          Approve Purchase
                        </Button>
                        <Button 
                          onClick={() => handleApproval(order.id, false)} 
                          className="bg-red-600 hover:bg-red-700 text-white font-medium px-6"
                        >
                          <XCircle className="w-4 h-4 mr-2"/>
                          Reject Purchase
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Sales Payments Awaiting Finance Approval */}
            {pendingSalesPayments.length > 0 && (
              <Card className="mb-8 bg-white border-2 border-gray-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                  <CardTitle className="text-white flex items-center font-bold text-xl">
                    <FileText className="w-6 h-6 mr-3" />
                    Sales Payments Awaiting Approval ({pendingSalesPayments.length})
                  </CardTitle>
                  <p className="text-purple-100 text-sm font-medium mt-1">Review and approve sales payment requests</p>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  {pendingSalesPayments.map(order => {
                    const paymentDetails = order.paymentDetails || {};
                    const cashDenom = paymentDetails.cashDenominations || {};
                    const splitDetails = paymentDetails.splitPaymentDetails || [];
                    
                    return (
                    <motion.div 
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-6 bg-gray-50 border-2 border-gray-200 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="font-bold text-gray-900 text-lg">
                              Sales Order {order.orderNumber} - {order.customerName}
                            </h3>
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full border border-purple-300">
                              {order.paymentStatus.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                            <div className="text-gray-700">
                              <span className="font-bold">Amount:</span> ₹{order.pendingApprovalAmount ?? order.finalAmount}
                            </div>
                            <div className="text-gray-700">
                              <span className="font-bold">Product:</span> {order.showroomProduct?.name}
                            </div>
                            <div className="flex items-center text-gray-700">
                              <Calendar className="w-4 h-4 mr-1" />
                              <span className="font-bold">Requested:</span> {formatToIST(order.createdAt)}
                            </div>
                          </div>
                          
                          {/* Payment Details Section */}
                          {paymentDetails && (
                            <div className="mt-4 p-4 bg-white border border-gray-300 rounded-lg">
                              <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                                <IndianRupee className="w-4 h-4 mr-2" />
                                Payment Details for Verification
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div className="text-gray-700">
                                  <span className="font-bold">Payment Method:</span> {paymentDetails.paymentMethod?.toUpperCase() || 'N/A'}
                                </div>
                                
                                {/* UTR Number for Online Payments */}
                                {paymentDetails.utrNumber && (
                                  <div className="text-gray-700">
                                    <span className="font-bold">UTR Number:</span> {paymentDetails.utrNumber}
                                  </div>
                                )}
                                
                                {/* Reference Number */}
                                {paymentDetails.referenceNumber && (
                                  <div className="text-gray-700">
                                    <span className="font-bold">Reference:</span> {paymentDetails.referenceNumber}
                                  </div>
                                )}
                                
                                {/* Payment Date */}
                                {paymentDetails.createdAt && (
                                  <div className="text-gray-700">
                                    <span className="font-bold">Payment Date:</span> {formatToIST(paymentDetails.createdAt)}
                                  </div>
                                )}
                              </div>
                              
                              {/* Cash Denominations */}
                              {Object.keys(cashDenom).length > 0 && (
                                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                                  <h5 className="font-bold text-gray-900 mb-2">Cash Denominations:</h5>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                    {Object.entries(cashDenom).map(([denom, count]) => (
                                      count > 0 && (
                                        <div key={denom} className="text-gray-700">
                                          ₹{denom} × {count} = ₹{denom * count}
                                        </div>
                                      )
                                    ))}
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-green-300 font-bold text-gray-900">
                                    Total Cash: ₹{Object.entries(cashDenom).reduce((sum, [denom, count]) => sum + (denom * count), 0)}
                                  </div>
                                </div>
                              )}
                              
                              {/* Split Payment Details */}
                              {splitDetails.length > 0 && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                                  <h5 className="font-bold text-gray-900 mb-2">Split Payment Details:</h5>
                                  <div className="space-y-3">
                                    {splitDetails.map((split, idx) => (
                                      <div key={idx} className="p-2 bg-white rounded border border-blue-300">
                                        <div className="flex justify-between items-center mb-2">
                                          <span className="font-bold text-gray-900">{split.method?.toUpperCase()}: ₹{split.amount}</span>
                                          {split.reference && <span className="text-xs text-gray-500">Ref: {split.reference}</span>}
                                        </div>
                                        
                                        {/* Show denominations for cash portion of split payment */}
                                        {split.method === 'cash' && split.denominations && (
                                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                                            <div className="font-semibold mb-1">Cash Breakdown:</div>
                                            <div className="grid grid-cols-3 gap-1">
                                              {Object.entries(split.denominations).map(([denom, count]) => (
                                                count > 0 && (
                                                  <div key={denom} className="text-gray-700">
                                                    ₹{denom} × {count}
                                                  </div>
                                                )
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    <div className="pt-2 border-t border-blue-300 font-bold text-gray-900">
                                      Total: ₹{splitDetails.reduce((sum, split) => sum + (split.amount || 0), 0)}
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {/* Notes */}
                              {paymentDetails.notes && (
                                <div className="mt-3 text-sm text-gray-700">
                                  <span className="font-bold">Notes:</span> {paymentDetails.notes}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-4 pt-4 border-t border-gray-200">
                        <Button 
                          onClick={() => handleApproveSalesPayment(order.id, true)} 
                          className="bg-green-600 hover:bg-green-700 text-white font-medium px-6"
                        >
                          <ThumbsUp className="w-4 h-4 mr-2"/>
                          Approve Payment
                        </Button>
                        <Button 
                          onClick={() => handleApproveSalesPayment(order.id, false)} 
                          className="bg-red-600 hover:bg-red-700 text-white font-medium px-6"
                        >
                          <XCircle className="w-4 h-4 mr-2"/>
                          Reject Payment
                        </Button>
                      </div>
                    </motion.div>
                  );
                  })}
                </CardContent>
              </Card>
            )}
          </>
        ) : activeTab === 1 ? (
          // Financial Performance Overview Tab
          <>
            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-white border-2 border-gray-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        ₹{dashboardData.totalRevenue.toLocaleString()}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 border-gray-200 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-600">
                        ₹{dashboardData.totalExpenses.toLocaleString()}
                      </p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className={`${dashboardData.netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border-2 shadow-lg`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Net Profit</p>
                      <p className={`text-2xl font-bold ${dashboardData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        ₹{dashboardData.netProfit.toLocaleString()}
                      </p>
                    </div>
                    <span className="text-3xl">💰</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Breakdown by Payment Method */}
            <Card className="bg-white border-2 border-gray-200 shadow-lg mb-8">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <CardTitle className="text-white text-xl font-bold flex items-center">
                  <Wallet className="w-6 h-6 mr-3" />
                  Revenue Breakdown by Payment Method
                </CardTitle>
                <p className="text-blue-100 text-sm font-medium mt-1">Total revenue collected through different payment methods</p>
              </CardHeader>
              <CardContent className="p-6">
                {dashboardData.paymentMethodBreakdown && Object.keys(dashboardData.paymentMethodBreakdown).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(dashboardData.paymentMethodBreakdown).map(([method, amount]) => {
                      // Determine icon and color based on payment method
                      let icon, colorClass, bgClass;
                      const methodLower = method.toLowerCase();
                      
                      if (methodLower === 'cash') {
                        icon = <Banknote className="w-6 h-6" />;
                        colorClass = 'text-green-700';
                        bgClass = 'bg-green-50 border-green-200';
                      } else if (methodLower === 'upi' || methodLower === 'online') {
                        icon = <Smartphone className="w-6 h-6" />;
                        colorClass = 'text-purple-700';
                        bgClass = 'bg-purple-50 border-purple-200';
                      } else if (methodLower === 'card' || methodLower === 'credit_card' || methodLower === 'debit_card') {
                        icon = <CreditCard className="w-6 h-6" />;
                        colorClass = 'text-blue-700';
                        bgClass = 'bg-blue-50 border-blue-200';
                      } else if (methodLower === 'bank_transfer' || methodLower === 'neft' || methodLower === 'rtgs') {
                        icon = <Building className="w-6 h-6" />;
                        colorClass = 'text-indigo-700';
                        bgClass = 'bg-indigo-50 border-indigo-200';
                      } else if (methodLower === 'cheque') {
                        icon = <FileText className="w-6 h-6" />;
                        colorClass = 'text-orange-700';
                        bgClass = 'bg-orange-50 border-orange-200';
                      } else {
                        icon = <Wallet className="w-6 h-6" />;
                        colorClass = 'text-gray-700';
                        bgClass = 'bg-gray-50 border-gray-200';
                      }
                      
                      return (
                        <div key={method} className={`p-4 border-2 rounded-lg ${bgClass}`}>
                          <div className="flex items-center gap-3 mb-2">
                            <div className={colorClass}>{icon}</div>
                            <span className="font-semibold text-gray-900 capitalize">
                              {method.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className={`text-2xl font-bold ${colorClass}`}>
                            ₹{amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {((amount / dashboardData.totalRevenue) * 100).toFixed(1)}% of total
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No payment data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card className="bg-white border-2 border-gray-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-800 text-white">
                <CardTitle className="text-white text-xl font-bold flex items-center">
                  <FileText className="w-6 h-6 mr-3" />
                  Financial Summary & Reports
                </CardTitle>
                <p className="text-gray-200 text-sm font-medium mt-1">Overall financial performance overview</p>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex justify-between items-center p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                    <span className="font-bold text-gray-900 text-lg">Total Revenue (from sold products)</span>
                    <span className="font-bold text-green-700 text-xl">+ ₹{dashboardData.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-6 bg-red-50 border-2 border-red-200 rounded-lg">
                    <span className="font-bold text-gray-900 text-lg">Total Approved Expenses</span>
                    <span className="font-bold text-red-700 text-xl">- ₹{dashboardData.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-6 bg-blue-50 border-4 border-blue-300 rounded-lg shadow-lg">
                    <span className="font-bold text-2xl text-gray-900">Net Profit</span>
                    <span className={`font-bold text-2xl ${dashboardData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      ₹{dashboardData.netProfit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : activeTab === 2 ? (
          // Payment Reminders Tab
          <>
            <Card className="bg-white border border-gray-300 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-gray-800 flex items-center">
                  <AlertCircle className="w-6 h-6 mr-3 text-orange-600" />
                  Payment Reminders
                </CardTitle>
                <p className="text-gray-600 text-sm font-medium mt-1">Track overdue and due payments from all sales orders</p>
              </CardHeader>
              <CardContent className="p-6">
                {paymentReminders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No payment reminders at this time</p>
                    <p className="text-sm">All payments are up to date</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paymentReminders.map(reminder => (
                      <div key={reminder.orderId} className={`p-4 border rounded-lg ${
                        reminder.status === 'overdue' 
                          ? 'border-red-200 bg-red-50' 
                          : 'border-yellow-200 bg-yellow-50'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">
                                {reminder.orderNumber}
                              </h4>
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                reminder.status === 'overdue' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {reminder.status === 'overdue' 
                                  ? `${reminder.daysOverdue} days overdue` 
                                  : 'Due today'
                                }
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              <strong>Customer:</strong> {reminder.customerName}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Sales Person:</strong> {reminder.salesPerson}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Amount:</strong> ₹{reminder.finalAmount?.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Due Date:</strong> {new Date(reminder.paymentDueDate).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              Status: {reminder.paymentStatus}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {/* <Button
                              size="sm"
                              variant="outline"
                              className="text-green-700 border-green-600 hover:bg-green-50"
                              onClick={async () => {
                                try {
                                  // Log the follow-up action
                                  const followUpData = {
                                    orderId: reminder.orderId,
                                    orderNumber: reminder.orderNumber,
                                    salesPerson: reminder.salesPerson,
                                    customerName: reminder.customerName,
                                    amount: reminder.finalAmount,
                                    daysOverdue: reminder.daysOverdue,
                                    followUpBy: user?.fullName || user?.username || 'Unknown User'
                                  };

                                  // Create audit log for follow-up action
                                  await fetch(`${API_BASE}/finance/follow-up`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(followUpData)
                                  });

                                  // Show detailed follow-up information
                                  toast({
                                    title: "Follow-up Action Required",
                                    description: `📞 Contact ${reminder.salesPerson} about ${reminder.customerName}'s overdue payment of ₹${reminder.finalAmount?.toLocaleString()} (${reminder.daysOverdue} days overdue)`,
                                    duration: 8000
                                  });

                                  // Optional: Mark as followed up (you can add this later)
                                  console.log('Follow-up logged for:', followUpData);
                                  
                                } catch (error) {
                                  console.error('Error logging follow-up:', error);
                                  toast({
                                    title: "Follow-up Required",
                                    description: `Contact ${reminder.salesPerson} about overdue payment for ${reminder.customerName}`,
                                  });
                                }
                              }}
                            >
                              <Users className="h-3 w-3 mr-1" />
                              Follow Up
                            </Button> */}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : activeTab === 3 ? (
          // Purchase Bills Tab
          <Card className="bg-white border-2 border-gray-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">Approved Purchase Bills</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {approvedPurchaseOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No approved purchase bills</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approvedPurchaseOrders.map(order => (
                    <div key={order.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">PO #{order.id} - {order.productName}</h4>
                          <p className="text-sm text-gray-600">Quantity: {order.quantity}</p>
                          <p className="text-sm text-gray-600">Status: {order.status}</p>
                          <p className="text-sm font-semibold text-green-700">
                            Total: ₹{(
                              (order.materials || []).reduce((sum, m) => sum + ((m.quantity || 0) * (m.unit_cost || 0)), 0) +
                              (order.extraMaterials || []).reduce((sum, m) => sum + ((m.quantity || 0) * (m.unit_cost || 0)), 0)
                            ).toLocaleString()}
                          </p>

                          {/* Payment Terms */}
                          {order.paymentTerms && (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-400 rounded">
                              <p className="text-xs font-semibold text-yellow-900">
                                {order.paymentTerms === 'full_payment' && '💰 Full Payment (100%)'}
                                {order.paymentTerms === '50_50' && '💰 50-50 Split Payment'}
                                {order.paymentTerms === '30_70' && '💰 30-70 Split Payment'}
                                {order.paymentTerms === '70_30' && '💰 70-30 Split Payment'}
                                {order.paymentTerms === 'cod' && '💰 Cash on Delivery (COD)'}
                                {order.paymentTerms === 'advance_50' && '💰 50% Advance Payment'}
                                {order.paymentTerms === 'advance_30' && '💰 30% Advance Payment'}
                                {order.paymentTerms === 'credit_30' && '💰 30 Days Credit'}
                                {order.paymentTerms === 'credit_60' && '💰 60 Days Credit'}
                                {order.paymentTerms === 'other' && '💰 Other Terms (See Notes)'}
                              </p>
                            </div>
                          )}
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded">
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : activeTab === 4 ? (
          // Sales Bills Tab
          <Card className="bg-white border-2 border-gray-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">Completed Sales Bills</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {approvedSalesOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No completed sales bills</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approvedSalesOrders.map(order => {
                    // Calculate payment amounts
                    const totalAmount = order.finalAmount || 0;
                    const receivedAmount = order.amountPaid || 0; // Backend returns 'amountPaid'
                    const pendingAmount = Math.max(totalAmount - receivedAmount, 0); // Ensure non-negative
                    
                    // Determine payment status
                    const isFullyPaid = pendingAmount <= 0;
                    const isPartiallyPaid = receivedAmount > 0 && pendingAmount > 0;
                    const isPending = receivedAmount === 0;
                    
                    return (
                      <div key={order.id} className="p-4 border-2 border-gray-200 rounded-lg bg-white shadow-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-bold text-gray-900 text-lg">Order #{order.orderNumber}</h4>
                              {/* Payment Status Badge */}
                              {isFullyPaid ? (
                                <Badge className="bg-green-100 text-green-800 border border-green-300 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Fully Paid
                                </Badge>
                              ) : isPartiallyPaid ? (
                                <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Partial Payment
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                                  <XCircle className="w-3 h-3" />
                                  Payment Pending
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-700 font-medium">Customer: {order.customerName}</p>
                            <p className="text-sm text-gray-600">Sales Person: {order.salesPerson}</p>
                            
                            {/* Payment Details */}
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600 font-medium">Total Amount</p>
                                  <p className="text-lg font-bold text-gray-900">₹{totalAmount.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 font-medium">Received Amount</p>
                                  <p className="text-lg font-bold text-green-700">₹{receivedAmount.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 font-medium">Pending Amount</p>
                                  <p className={`text-lg font-bold ${pendingAmount > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                    ₹{pendingAmount.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Payment Progress Bar */}
                              {totalAmount > 0 && (
                                <div className="mt-3">
                                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span>Payment Progress</span>
                                    <span>{((receivedAmount / totalAmount) * 100).toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full transition-all ${
                                        isFullyPaid ? 'bg-green-600' : isPartiallyPaid ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min((receivedAmount / totalAmount) * 100, 100)}%` }}
                                    ></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-600 text-green-700 hover:bg-green-50"
                              onClick={() => handleDownloadInvoice(order.id, order.orderNumber, order)}
                              title="Download Invoice"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Invoice
                            </Button>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                              {order.paymentStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ) : activeTab === 5 ? (
  // Bypassed Orders Tab
  <Card className="bg-white border-2 border-gray-200 shadow-lg">
    <CardHeader>
      <CardTitle className="text-2xl font-bold text-gray-900">Bypassed Sales Orders</CardTitle>
      <p className="text-gray-600">Orders with full payment that bypassed finance approval</p>
    </CardHeader>
    <CardContent className="p-6">
      {bypassedSalesOrders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No bypassed orders</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bypassedSalesOrders.map((order) => {
            // Determine payment status
            const paymentStatus = order.paymentStatus || 'pending';
            const isPaymentComplete = paymentStatus === 'paid' || paymentStatus === 'finance_approved' || paymentStatus === 'completed';
            
            return (
              <div key={order.id} className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-black">Order #{order.orderNumber || order.id}</h3>
                      {/* Payment Status Badge */}
                      {isPaymentComplete ? (
                        <Badge className="bg-green-100 text-green-800 border border-green-300 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Payment Completed
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Payment Pending
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-700">Customer: {order.customerName}</p>
                    <p className="text-gray-700">Product: {order.showroomProduct?.name || 'N/A'}</p>
                    <p className="text-gray-700">Quantity: {order.quantity}</p>
                    <p className="text-gray-700">Sales Person: {order.salesPerson}</p>
                    {order.paymentMethod && (
                      <p className="text-gray-700">Payment Method: {order.paymentMethod}</p>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="text-2xl font-bold text-green-700">₹{order.totalAmount?.toLocaleString() || order.finalAmount?.toLocaleString()}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-600 text-green-700 hover:bg-green-50"
                      onClick={() => handleDownloadInvoice(order.id, order.orderNumber || order.id, order)}
                      title="Download Invoice"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Invoice
                    </Button>
                    <Badge className="bg-blue-100 text-blue-800">Bypassed Finance</Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
) : null}

        {/* Footer */}
        <div className="mt-12 bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="text-center text-gray-600">
            <p className="font-medium">
              © Financial Management & Approval System
            </p>
            <p className="text-sm mt-1">
              For financial queries, contact Finance IT Support
            </p>
          </div>
        </div>
        
      </div>

      {/* Guest Dialog */}
      <GuestDialog 
        open={showGuestDialog} 
        onOpenChange={setShowGuestDialog}
      />
    </div>
  );
};

export default FinanceDepartment;