import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatToIST } from "@/utils/dateFormatter";
import { 
  ShoppingCart, 
  CheckCircle, 
  ArrowLeft, 
  Users,
  Clock,
  IndianRupee,
  ThumbsUp,
  Undo2,
  RefreshCw,
  Edit,
  Plus,
  Trash2,
  Save,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";

import { API_BASE as API_URL } from '@/lib/api';
import OrderStatusBar from '@/components/ui/OrderStatusBar';
import { GuestDialog } from '@/components/GuestDialog';
import { UserCheck } from 'lucide-react';
import LeaveRequestButton from '@/components/LeaveRequestButton';
import ManagerLeaveApprovalButton from '@/components/ManagerLeaveApprovalButton';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { AutoRefreshIndicator } from '@/components/AutoRefreshIndicator';

const PurchaseDepartment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editForm, setEditForm] = useState({
    productName: '',
    quantity: 0,
    materials: []
  });
  const [showGuestDialog, setShowGuestDialog] = useState(false);

  // Fetch purchase orders
  const fetchPurchaseOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/purchase-orders`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setPurchaseOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching purchase orders:", err);
      toast({
        title: "Error",
        description: `Failed to load purchase orders: ${err.message}`,
        variant: "destructive",
      });
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Approve order
  const handleApprove = async (id) => {
    try {
      const res = await fetch(`${API_URL}/purchase-orders/${id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedBy: user?.fullName || user?.username || 'Unknown User' }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Approval failed");
      }
      await res.json();
      toast({
        title: "✅ Order Approved",
        description: "Purchase order has been approved and sent to Store for inventory check.",
      });
      fetchPurchaseOrders();
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Could not approve purchase order.",
        variant: "destructive",
      });
    }
  };

  // Reject order
  const handleReject = async (id) => {
    try {
      const res = await fetch(`${API_URL}/purchase-orders/${id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Rejection failed");
      }
      toast({
        title: "❌ Order Rejected",
        description: "Purchase order has been rejected.",
      });
      fetchPurchaseOrders();
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Could not reject purchase order.",
        variant: "destructive",
      });
    }
  };

  // Request finance approval
  const handleRequestFinanceApproval = async (id) => {
    try {
      // First, fetch the order to check payment terms and costs
      const orderRes = await fetch(`${API_URL}/purchase-orders/${id}`);
      if (!orderRes.ok) {
        throw new Error("Failed to fetch order details");
      }
      const order = await orderRes.json();
      
      // Validate payment terms
      if (!order.paymentTerms || order.paymentTerms === '') {
        toast({
          title: "⚠️ Payment Terms Required",
          description: "Please edit the order and set payment terms before sending to Finance.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate that all materials have unit costs filled
      const materialsWithoutCost = (order.materials || []).filter(m => !m.unit_cost || m.unit_cost === 0);
      const extraMaterialsWithoutCost = (order.extraMaterials || []).filter(m => !m.unit_cost || m.unit_cost === 0);
      
      if (materialsWithoutCost.length > 0 || extraMaterialsWithoutCost.length > 0) {
        const missingCostItems = [
          ...materialsWithoutCost.map(m => m.name),
          ...extraMaterialsWithoutCost.map(m => m.name)
        ];
        
        toast({
          title: "⚠️ Unit Costs Required",
          description: `Cannot send with ₹0 amount. Please edit and fill unit costs for: ${missingCostItems.join(', ')}`,
          variant: "destructive",
        });
        return;
      }
      
      // Calculate total to ensure it's not zero
      const totalCost = 
        (order.materials || []).reduce((sum, m) => sum + ((m.quantity || 0) * (m.unit_cost || 0)), 0) +
        (order.extraMaterials || []).reduce((sum, m) => sum + ((m.quantity || 0) * (m.unit_cost || 0)), 0);
      
      if (totalCost === 0) {
        toast({
          title: "⚠️ Invalid Total Amount",
          description: "Cannot send order with ₹0 total. Please edit and fill all unit costs.",
          variant: "destructive",
        });
        return;
      }
      
      const res = await fetch(`${API_URL}/purchase-orders/${id}/request-finance-approval`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestedBy: user?.fullName || user?.username || 'Unknown User' }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Finance request failed");
      }
      toast({
        title: "💰 Finance Approval Requested",
        description: `Request sent to Finance for ₹${totalCost.toLocaleString()} approval.`,
      });
      fetchPurchaseOrders();
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Could not request finance approval.",
        variant: "destructive",
      });
    }
  };

  // Start editing order
  const handleEditOrder = (order) => {
    setEditingOrder(order.id);
    setEditForm({
      productName: order.productName,
      quantity: order.quantity,
      materials: order.materials || [],
      extraMaterials: order.extraMaterials || [],
      paymentTerms: order.paymentTerms || 'full_payment'
    });
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingOrder(null);
    setEditForm({ productName: '', quantity: 0, materials: [], extraMaterials: [], paymentTerms: 'full_payment' });
  };

  // Save edited order
  const handleSaveEdit = async (id) => {
    try {
      const res = await fetch(`${API_URL}/purchase-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: editForm.productName,
          quantity: editForm.quantity,
          materials: editForm.materials,
          extra_materials: editForm.extraMaterials,
          payment_terms: editForm.paymentTerms
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Update failed");
      }
      toast({
        title: "✅ Order Updated",
        description: "Purchase order has been updated successfully.",
      });
      setEditingOrder(null);
      fetchPurchaseOrders();
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: err.message || "Could not update purchase order.",
        variant: "destructive",
      });
    }
  };

  // Add new extra material
  const handleAddExtraMaterial = () => {
    setEditForm(prev => ({
      ...prev,
      extraMaterials: [...prev.extraMaterials, { name: '', quantity: 1, unit_cost: 0 }]
    }));
  };

  // Update material unit cost only (name and quantity locked)
  const handleUpdateMaterialCost = (index, value) => {
    setEditForm(prev => ({
      ...prev,
      materials: prev.materials.map((material, i) => 
        i === index ? { ...material, unit_cost: value } : material
      )
    }));
  };

  // Update extra material (fully editable)
  const handleUpdateExtraMaterial = (index, field, value) => {
    setEditForm(prev => ({
      ...prev,
      extraMaterials: prev.extraMaterials.map((material, i) => 
        i === index ? { ...material, [field]: value } : material
      )
    }));
  };

  // Remove extra material
  const handleRemoveExtraMaterial = (index) => {
    setEditForm(prev => ({
      ...prev,
      extraMaterials: prev.extraMaterials.filter((_, i) => i !== index)
    }));
  };

  // Status badge (aligned with backend statuses)
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending_request: { color: "bg-yellow-100 text-yellow-800 border border-yellow-300", text: "Pending Request" },
      pending_store_check: { color: "bg-blue-100 text-blue-800 border border-blue-300", text: "Pending Store Check" },
      store_allocated: { color: "bg-green-100 text-green-800 border border-green-300", text: "Store Allocated" },
      partially_allocated: { color: "bg-amber-100 text-amber-800 border border-amber-300", text: "Partially Allocated" },
      insufficient_stock: { color: "bg-orange-100 text-orange-800 border border-orange-300", text: "Insufficient Stock" },
      pending_finance_approval: { color: "bg-indigo-100 text-indigo-800 border border-indigo-300", text: "Pending Finance Approval" },
      finance_approved: { color: "bg-purple-100 text-purple-800 border border-purple-300", text: "Finance Approved" },
      verified_in_store: { color: "bg-teal-100 text-teal-800 border border-teal-300", text: "Verified in Store" },
      approved: { color: "bg-green-100 text-green-800 border border-green-300", text: "Approved" },
      rejected: { color: "bg-red-100 text-red-800 border border-red-300", text: "Rejected" },
      completed: { color: "bg-gray-100 text-gray-800 border border-gray-300", text: "Completed" }
    };
    const config = statusConfig[status] || { color: "bg-gray-100 text-gray-800 border border-gray-300", text: status?.replace(/_/g, ' ') || "Unknown" };
    return <Badge className={`${config.color} font-medium`}>{config.text}</Badge>;
  };

  // Available actions (aligned with backend statuses)
  const getAvailableActions = (order) => {
    const actions = [];
    switch (order.status) {
      case 'pending_request':
        actions.push({
          label: 'Accept & Send to Store',
          action: () => handleApprove(order.id),
          icon: <ThumbsUp className="w-4 h-4 mr-2" />,
          className: 'bg-green-600 hover:bg-green-700 text-white'
        });
        actions.push({
          label: 'Reject',
          action: () => handleReject(order.id),
          icon: <Undo2 className="w-4 h-4 mr-2" />,
          className: 'bg-red-600 hover:bg-red-700 text-white'
        });
        break;
      case 'insufficient_stock':
      case 'partially_allocated':
        actions.push({
          label: 'Edit Order',
          action: () => handleEditOrder(order),
          icon: <Edit className="w-4 h-4 mr-2" />,
          className: 'bg-orange-600 hover:bg-orange-700 text-white'
        });
        actions.push({
          label: 'Send to Finance for Approval',
          action: () => handleRequestFinanceApproval(order.id),
          icon: <IndianRupee className="w-4 h-4 mr-2" />,
          className: 'bg-blue-600 hover:bg-blue-700 text-white'
        });
        break;
      default:
        break;
    }
    return actions;
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  // Auto-refresh every 15 seconds
  const { isRefreshing: autoRefreshing, lastRefreshTime, isPaused } = useAutoRefresh(
    fetchPurchaseOrders,
    15000,
    { enabled: true, pauseOnInput: true, pauseOnModal: true }
  );

  // Split orders into two sections
  const actionRequiredStatuses = [
    'pending_request',
    'insufficient_stock',
    'partially_allocated',
    'pending_store_check',
    'pending_finance_approval'
  ];
  const processedStatuses = [
    'approved',
    'completed',
    'finance_approved',
    'store_allocated',
    'verified_in_store',
    'rejected'
  ];

  const actionRequiredOrders = purchaseOrders.filter(order => actionRequiredStatuses.includes(order.status));
  const processedOrders = purchaseOrders.filter(order => processedStatuses.includes(order.status));

  // Tab state: 0 = Orders Requiring Action, 1 = Processed Orders
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <AutoRefreshIndicator 
        isRefreshing={autoRefreshing}
        lastRefreshTime={lastRefreshTime}
        isPaused={isPaused}
      />
      {/* Header */}
      <div className="max-w-7xl mx-auto bg-white shadow-md border-b-4 border-blue-800 rounded-b-lg">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
            {/* Left: Back + Title */}
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              <Button
                onClick={() => navigate(user.department === 'admin' ? '/dashboard/admin' : '/dashboard')}
                variant="outline"
                className="border border-gray-300 bg-white text-gray-800 text-sm placeholder-gray-500 w-full sm:w-auto"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-800 rounded-lg flex items-center justify-center shadow-lg">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Purchase Department</h1>
                  <p className="text-gray-600 text-sm sm:text-base font-medium">Purchase Management</p>
                </div>
              </div>
            </div>
            {/* Right: User Panel + Add Guest Button */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="bg-gradient-to-r from-green-50 to-indigo-50 border-2 border-green-200 px-4 py-4 sm:px-6 rounded-lg shadow-sm w-full sm:w-auto">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-gray-600 text-xs font-medium">Purchase Team</p>
                    <p className="text-green-600 text-xs font-medium">Purchase Management</p>
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

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex space-x-2 border-b border-blue-200 mb-8">
          <button
            className={`relative px-6 py-3 text-lg font-semibold focus:outline-none transition-colors border-b-4 ${activeTab === 0 ? 'border-blue-700 text-blue-800 bg-white' : 'border-transparent text-gray-500 bg-blue-50 hover:text-blue-700'}`}
            onClick={() => setActiveTab(0)}
          >
            Orders Requiring Action
            {actionRequiredOrders.length > 0 && (
              <span className="absolute top-2 right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                {actionRequiredOrders.length}
              </span>
            )}
          </button>
          <button
            className={`px-6 py-3 text-lg font-semibold focus:outline-none transition-colors border-b-4 ${activeTab === 1 ? 'border-blue-700 text-blue-800 bg-white' : 'border-transparent text-gray-500 bg-blue-50 hover:text-blue-700'}`}
            onClick={() => setActiveTab(1)}
          >
            Processed Orders
          </button>
        </div>
      </div>

      {/* Orders Section (Tab Content) */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid gap-10">
          {activeTab === 0 ? (
            // Orders Requiring Action Tab
            <div>
              <h2 className="text-2xl font-bold text-blue-800 mb-4">Orders Requiring Action</h2>
              {loading ? (
                <div className="min-h-[200px] flex items-center justify-center">
                  <div className="text-center">
                    <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-800 text-lg font-medium">Loading Purchase dashboard...</p>
                    <p className="text-gray-600 text-sm mt-1">Please wait while we retrieve the data</p>
                  </div>
                </div>
              ) : actionRequiredOrders.length === 0 ? (
                <Card className="bg-white border border-gray-300 shadow-sm">
                  <CardContent className="p-8 text-center">
                    <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No Orders Requiring Action</h3>
                    <p className="text-gray-600">All new or pending orders will appear here.</p>
                  </CardContent>
                </Card>
              ) : (
                actionRequiredOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {/* ...existing code for order card... */}
                    <Card className="bg-white border border-gray-300 shadow-sm hover:shadow-md transition-shadow mb-6">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-gray-800 text-lg">
                              Purchase Order #{order.id}
                            </CardTitle>
                            <p className="text-gray-600 text-sm mt-1">
                              Product: {order.productName} | Quantity: {order.quantity}
                            </p>
                            {((order.materials && order.materials.length > 0) || (order.extraMaterials && order.extraMaterials.length > 0)) && (
                              <p className="text-green-700 text-sm font-semibold mt-1">
                                Total Cost: ₹{(
                                  (order.materials || []).reduce((sum, material) => 
                                    sum + ((material.quantity || 0) * (material.unit_cost || 0)), 0
                                  ) +
                                  (order.extraMaterials || []).reduce((sum, material) => 
                                    sum + ((material.quantity || 0) * (material.unit_cost || 0)), 0
                                  )
                                ).toFixed(2)}
                              </p>
                            )}
                            <p className="text-gray-500 text-xs mt-1">
                              Created: {formatToIST(order.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">{getStatusBadge(order.status)}</div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {editingOrder === order.id ? (
                            // ...existing code for edit mode...
                            <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h4 className="text-blue-800 font-semibold mb-3 flex items-center">
                                <Edit className="w-4 h-4 mr-2" />
                                Editing Purchase Order
                              </h4>
                              {/* Product Name */}
                              <div>
                                <Label htmlFor="productName" className="text-sm font-medium text-gray-700">Product Name</Label>
                                <Input
                                  id="productName"
                                  value={editForm.productName}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, productName: e.target.value }))}
                                  className="mt-1"
                                />
                              </div>
                              {/* Quantity */}
                              <div>
                                <Label htmlFor="quantity" className="text-sm font-medium text-gray-700">Quantity</Label>
                                <Input
                                  id="quantity"
                                  type="number"
                                  value={editForm.quantity}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                                  className="mt-1"
                                />
                              </div>
                              
                              {/* Payment Terms */}
                              <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <IndianRupee className="w-5 h-5 text-purple-700" />
                                  <Label htmlFor="paymentTerms" className="text-sm font-semibold text-purple-900">Payment Terms</Label>
                                </div>
                                <select
                                  id="paymentTerms"
                                  value={editForm.paymentTerms}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, paymentTerms: e.target.value }))}
                                  className="w-full px-4 py-3 bg-white border-2 border-purple-400 rounded-lg text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                >
                                  <option value="full_payment">💰 Full Payment (100%)</option>
                                  <option value="50_50">📊 50-50 Split Payment</option>
                                  <option value="30_70">📊 30-70 Split Payment</option>
                                  <option value="70_30">📊 70-30 Split Payment</option>
                                  <option value="cod">🚚 Cash on Delivery (COD)</option>
                                  <option value="advance_50">💵 50% Advance</option>
                                  <option value="advance_30">💵 30% Advance</option>
                                  <option value="credit_30">📅 30 Days Credit</option>
                                  <option value="credit_60">📅 60 Days Credit</option>
                                  <option value="other">📝 Other (Specify in Notes)</option>
                                </select>
                                <p className="text-xs text-purple-700 mt-2">Select payment terms for Finance approval</p>
                              </div>
                              
                              {/* Required Materials (Locked - only cost editable) */}
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Label className="text-sm font-medium text-gray-700">
                                    Required Materials (Locked - Only Unit Cost Editable)
                                  </Label>
                                  <Badge className="bg-blue-100 text-blue-800 border border-blue-300 text-xs">
                                    Original Requisition
                                  </Badge>
                                </div>
                                <div className="space-y-2">
                                  {editForm.materials.map((material, idx) => (
                                    <div key={idx} className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-sm">
                                      <div className="flex-1">
                                        <Input
                                          placeholder="Material name"
                                          value={material.name || ''}
                                          disabled
                                          className="bg-gray-50 cursor-not-allowed text-gray-700 font-medium border-gray-300"
                                        />
                                      </div>
                                      <div className="w-20">
                                        <Input
                                          type="number"
                                          placeholder="Qty"
                                          value={material.quantity || 1}
                                          disabled
                                          className="bg-gray-50 cursor-not-allowed text-gray-700 font-medium border-gray-300"
                                        />
                                      </div>
                                      <div className="w-32">
                                        <Input
                                          type="number"
                                          placeholder="Unit Cost (₹)"
                                          value={material.unit_cost || 0}
                                          onChange={(e) => handleUpdateMaterialCost(idx, parseFloat(e.target.value) || 0)}
                                          className="bg-gray-50 cursor-not-allowed text-gray-700 font-medium border-gray-300"
                                        />
                                      </div>
                                      <div className="text-sm text-gray-700 font-semibold w-24 text-right">
                                        ₹{((material.quantity || 1) * (material.unit_cost || 0)).toFixed(2)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Extra Materials (Fully Editable) */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Label className="text-sm font-medium text-gray-700">Extra Materials (Optional)</Label>
                                    <Badge className="bg-green-100 text-green-800 border border-green-300 text-xs">
                                      Additional Purchase
                                    </Badge>
                                  </div>
                                  <Button
                                    type="button"
                                    onClick={handleAddExtraMaterial}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Extra Material
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  {editForm.extraMaterials.length === 0 ? (
                                    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 text-center">
                                      <p className="text-sm text-gray-500">No extra materials added. Click "Add Extra Material" to purchase additional items.</p>
                                    </div>
                                  ) : (
                                    editForm.extraMaterials.map((material, idx) => (
                                      <div key={idx} className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg p-3 shadow-sm">
                                        <div className="flex-1">
                                          <Input
                                            placeholder="Material name"
                                            value={material.name || ''}
                                            onChange={(e) => handleUpdateExtraMaterial(idx, 'name', e.target.value)}
                                            className="bg-gray-50 cursor-not-allowed text-gray-700 font-medium border-gray-300"                                          
                                            />
                                        </div>
                                        <div className="w-20">
                                          <Input
                                            type="number"
                                            placeholder="Qty"
                                            value={material.quantity || 1}
                                            onChange={(e) => handleUpdateExtraMaterial(idx, 'quantity', parseInt(e.target.value) || 1)}
                                            className="bg-gray-50 cursor-not-allowed text-gray-700 font-medium border-gray-300"
                                          />
                                        </div>
                                        <div className="w-32">
                                          <Input
                                            type="number"
                                            placeholder="Unit Cost (₹)"
                                            value={material.unit_cost || 0}
                                            onChange={(e) => handleUpdateExtraMaterial(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                                            className="bg-gray-50 cursor-not-allowed text-gray-700 font-medium border-gray-300"
                                          />
                                        </div>
                                        <div className="text-sm text-gray-700 font-semibold w-24 text-right">
                                          ₹{((material.quantity || 1) * (material.unit_cost || 0)).toFixed(2)}
                                        </div>
                                        <Button
                                          type="button"
                                          onClick={() => handleRemoveExtraMaterial(idx)}
                                          size="sm"
                                          variant="destructive"
                                          className="shrink-0"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                              
                              {/* Total Cost Summary */}
                              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                  <span className="text-lg font-semibold text-gray-800">Total Purchase Cost:</span>
                                  <span className="text-2xl font-bold text-green-700">
                                    ₹{(
                                      (editForm.materials || []).reduce((sum, material) => 
                                        sum + ((material.quantity || 0) * (material.unit_cost || 0)), 0
                                      ) +
                                      (editForm.extraMaterials || []).reduce((sum, material) => 
                                        sum + ((material.quantity || 0) * (material.unit_cost || 0)), 0
                                      )
                                    ).toFixed(2)}
                                  </span>
                                </div>
                                <div className="mt-2 text-sm text-gray-600 flex justify-between">
                                  <span>Required Materials: ₹{(editForm.materials || []).reduce((sum, m) => sum + ((m.quantity || 0) * (m.unit_cost || 0)), 0).toFixed(2)}</span>
                                  <span>Extra Materials: ₹{(editForm.extraMaterials || []).reduce((sum, m) => sum + ((m.quantity || 0) * (m.unit_cost || 0)), 0).toFixed(2)}</span>
                                </div>
                              </div>
                              
                              {/* Edit Actions */}
                              <div className="flex space-x-3 pt-4">
                                <Button
                                  onClick={() => handleSaveEdit(order.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <Save className="w-4 h-4 mr-2" />
                                  Save Changes
                                </Button>
                                <Button
                                  onClick={handleCancelEdit}
                                  variant="outline"
                                  className="border-gray-300"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <>
                              {order.materials && order.materials.length > 0 && (
                                <div className="mb-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <h4 className="text-gray-800 font-semibold">Required Materials:</h4>
                                    <Badge className="bg-blue-100 text-blue-800 border border-blue-300 text-xs">
                                      Shortage
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {order.materials.map((material, idx) => (
                                      <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <div className="flex justify-between items-center">
                                          <span className="text-gray-800 font-medium">
                                            {typeof material === 'string' ? material : material.name || material}
                                          </span>
                                          <div className="text-right text-sm">
                                            {typeof material === 'object' && material.quantity && (
                                              <div className="text-gray-600">
                                                Qty: {material.quantity}
                                                {material.unit_cost && (
                                                  <div className="text-green-700 font-semibold">
                                                    ₹{((material.quantity || 0) * (material.unit_cost || 0)).toFixed(2)}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {order.extraMaterials && order.extraMaterials.length > 0 && (
                                <div className="mb-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <h4 className="text-gray-800 font-semibold">Extra Materials:</h4>
                                    <Badge className="bg-green-100 text-green-800 border border-green-300 text-xs">
                                      Additional
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {order.extraMaterials.map((material, idx) => (
                                      <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-3">
                                        <div className="flex justify-between items-center">
                                          <span className="text-gray-800 font-medium">
                                            {typeof material === 'string' ? material : material.name || material}
                                          </span>
                                          <div className="text-right text-sm">
                                            {typeof material === 'object' && material.quantity && (
                                              <div className="text-gray-600">
                                                Qty: {material.quantity}
                                                {material.unit_cost && (
                                                  <div className="text-green-700 font-semibold">
                                                    ₹{((material.quantity || 0) * (material.unit_cost || 0)).toFixed(2)}
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Payment Terms Display - Only show for orders with insufficient stock (going to finance) */}
                              {order.status === 'insufficient_stock' && order.paymentTerms && (
                                <div className="mb-4 bg-purple-50 border-2 border-purple-300 rounded-lg p-3">
                                  <div className="flex items-center gap-2">
                                    <IndianRupee className="w-5 h-5 text-purple-700" />
                                    <span className="text-sm font-semibold text-purple-900">Payment Terms:</span>
                                    <span className="text-sm font-bold text-purple-800">
                                      {order.paymentTerms === 'full_payment' && '💰 Full Payment (100%)'}
                                      {order.paymentTerms === '50_50' && '📊 50-50 Split Payment'}
                                      {order.paymentTerms === '30_70' && '📊 30-70 Split Payment'}
                                      {order.paymentTerms === '70_30' && '📊 70-30 Split Payment'}
                                      {order.paymentTerms === 'cod' && '🚚 Cash on Delivery'}
                                      {order.paymentTerms === 'advance_50' && '💵 50% Advance'}
                                      {order.paymentTerms === 'advance_30' && '💵 30% Advance'}
                                      {order.paymentTerms === 'credit_30' && '📅 30 Days Credit'}
                                      {order.paymentTerms === 'credit_60' && '📅 60 Days Credit'}
                                      {order.paymentTerms === 'other' && '📝 Other Terms'}
                                    </span>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex space-x-3 pt-4">
                                {getAvailableActions(order).map((actionItem, idx) => (
                                  <Button
                                    key={idx}
                                    onClick={actionItem.action}
                                    className={actionItem.className}
                                  >
                                    {actionItem.icon}
                                    {actionItem.label}
                                  </Button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          ) : (
            // Processed Orders Tab
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Processed Orders</h2>
              {loading ? (
                <div className="min-h-[100px] flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : processedOrders.length === 0 ? (
                <Card className="bg-white border border-gray-300 shadow-sm">
                  <CardContent className="p-8 text-center">
                    <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No Processed Orders</h3>
                    <p className="text-gray-600">Orders that have been processed will appear here.</p>
                  </CardContent>
                </Card>
              ) : (
                processedOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-white border border-gray-300 shadow-sm hover:shadow-md transition-shadow mb-6">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-gray-800 text-lg">
                              Purchase Order #{order.id}
                            </CardTitle>
                            <p className="text-gray-600 text-sm mt-1">
                              Product: {order.productName} | Quantity: {order.quantity}
                            </p>
                            {((order.materials && order.materials.length > 0) || (order.extraMaterials && order.extraMaterials.length > 0)) && (
                              <p className="text-green-700 text-sm font-semibold mt-1">
                                Total Cost: ₹{(
                                  (order.materials || []).reduce((sum, material) => 
                                    sum + ((material.quantity || 0) * (material.unit_cost || 0)), 0
                                  ) +
                                  (order.extraMaterials || []).reduce((sum, material) => 
                                    sum + ((material.quantity || 0) * (material.unit_cost || 0)), 0
                                  )
                                ).toFixed(2)}
                              </p>
                            )}
                            <p className="text-gray-500 text-xs mt-1">
                              Created: {formatToIST(order.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">{getStatusBadge(order.status)}</div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {order.materials && order.materials.length > 0 && (
                            <div className="mb-4">
                              <div className="flex items-center gap-2 mb-3">
                                <h4 className="text-gray-800 font-semibold">Required Materials:</h4>
                                <Badge className="bg-blue-100 text-blue-800 border border-blue-300 text-xs">
                                  Shortage
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {order.materials.map((material, idx) => (
                                  <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-800 font-medium">
                                        {typeof material === 'string' ? material : material.name || material}
                                      </span>
                                      <div className="text-right text-sm">
                                        {typeof material === 'object' && material.quantity && (
                                          <div className="text-gray-600">
                                            Qty: {material.quantity}
                                            {material.unit_cost && (
                                              <div className="text-green-700 font-semibold">
                                                ₹{((material.quantity || 0) * (material.unit_cost || 0)).toFixed(2)}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {order.extraMaterials && order.extraMaterials.length > 0 && (
                            <div className="mb-4">
                              <div className="flex items-center gap-2 mb-3">
                                <h4 className="text-gray-800 font-semibold">Extra Materials:</h4>
                                <Badge className="bg-green-100 text-green-800 border border-green-300 text-xs">
                                  Additional
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {order.extraMaterials.map((material, idx) => (
                                  <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-800 font-medium">
                                        {typeof material === 'string' ? material : material.name || material}
                                      </span>
                                      <div className="text-right text-sm">
                                        {typeof material === 'object' && material.quantity && (
                                          <div className="text-gray-600">
                                            Qty: {material.quantity}
                                            {material.unit_cost && (
                                              <div className="text-green-700 font-semibold">
                                                ₹{((material.quantity || 0) * (material.unit_cost || 0)).toFixed(2)}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Payment Terms Display - Only show for orders with insufficient stock (going to finance) */}
                          {order.status === 'insufficient_stock' && order.paymentTerms && (
                            <div className="mb-4 bg-purple-50 border-2 border-purple-300 rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <IndianRupee className="w-5 h-5 text-purple-700" />
                                <span className="text-sm font-semibold text-purple-900">Payment Terms:</span>
                                <span className="text-sm font-bold text-purple-800">
                                  {order.paymentTerms === 'full_payment' && '💰 Full Payment (100%)'}
                                  {order.paymentTerms === '50_50' && '📊 50-50 Split Payment'}
                                  {order.paymentTerms === '30_70' && '📊 30-70 Split Payment'}
                                  {order.paymentTerms === '70_30' && '📊 70-30 Split Payment'}
                                  {order.paymentTerms === 'cod' && '🚚 Cash on Delivery'}
                                  {order.paymentTerms === 'advance_50' && '💵 50% Advance'}
                                  {order.paymentTerms === 'advance_30' && '💵 30% Advance'}
                                  {order.paymentTerms === 'credit_30' && '📅 30 Days Credit'}
                                  {order.paymentTerms === 'credit_60' && '📅 60 Days Credit'}
                                  {order.paymentTerms === 'other' && '📝 Other Terms'}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* No action buttons for processed orders */}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm text-center text-gray-600">
            <p className="font-medium">© Procurement Management System</p>
            <p className="text-sm mt-1">For technical support, contact IT Department</p>
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

export default PurchaseDepartment;

