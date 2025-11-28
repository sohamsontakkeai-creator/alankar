import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import { 
  Store, 
  Package, 
  CheckCircle, 
  Star,
  ArrowLeft,
  Eye,
  ShoppingBag,
  Award,
  AlertCircle,
  TestTube,
  Settings,
  Shield,
  Users,
  RefreshCw,
  UserCheck,
  XCircle,
  Clock,
  Loader2,
  ListChecks
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GuestDialog } from '@/components/GuestDialog';
import { API_BASE } from '@/lib/api';
import OrderStatusBar from '@/components/ui/OrderStatusBar';
import LeaveRequestButton from '@/components/LeaveRequestButton';
import ManagerLeaveApprovalButton from '@/components/ManagerLeaveApprovalButton';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { AutoRefreshIndicator } from '@/components/AutoRefreshIndicator';

const ShowroomDepartment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // All hooks must be at the top level and in the same order on every render
  const [products, setProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showGuestDialog, setShowGuestDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // Tab state: 0 = Products Ready for Showroom, 1 = Products on Display
  const [testingDialogOpen, setTestingDialogOpen] = useState(false);
  const [selectedProductForTesting, setSelectedProductForTesting] = useState(null);
  const [machineResults, setMachineResults] = useState([]);
  const [testSummary, setTestSummary] = useState(null);
  const [assemblySummaries, setAssemblySummaries] = useState({});
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [updatingMachineIds, setUpdatingMachineIds] = useState(new Set());

  // Load data from backend (MySQL via Flask)
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch completed assembly products
      console.log('Fetching completed assembly products...');
      console.log('API_BASE:', API_BASE);
      console.log('Full URL:', `${API_BASE}/assembly/completed`);
      const assemblyResponse = await fetch(`${API_BASE}/assembly/completed`);
      console.log('Response status:', assemblyResponse.status);
      if (!assemblyResponse.ok) {
        throw new Error(`Assembly API error: ${assemblyResponse.status} ${assemblyResponse.statusText}`);
      }
      const assemblyData = await assemblyResponse.json();
      console.log('Assembly data received:', assemblyData);
      console.log('Assembly data length:', assemblyData.length);
      console.log('Setting products state with:', assemblyData);
      setProducts(assemblyData);
      console.log('Products state set successfully');

      const summaryPayload = {};
      await Promise.all(
        assemblyData.map(async (order) => {
          try {
            const summaryRes = await fetch(`${API_BASE}/showroom/testing/summary/${order.id}`);
            if (summaryRes.ok) {
              const summaryData = await summaryRes.json();
              summaryPayload[order.id] = summaryData;
            } else {
              console.warn(`Summary fetch failed for order ${order.id}: ${summaryRes.status}`);
            }
          } catch (summaryError) {
            console.warn(`Failed to fetch summary for assembly order ${order.id}`, summaryError);
          }
        })
      );
      console.log('Setting assembly summaries:', summaryPayload);
      setAssemblySummaries(summaryPayload);
      console.log('Checking products state after summaries:', products.length);

      // Fetch displayed showroom products (SYNC with Sales Department)
      // This endpoint must return the up-to-date quantity after sales
      console.log('Fetching displayed showroom products from sales...');
      const showroomResponse = await fetch(`${API_BASE}/sales/showroom/available`);
      if (!showroomResponse.ok) {
        console.error(`Sales Showroom API error: ${showroomResponse.status}`);
        // Don't throw - just set empty displayed products
        setDisplayedProducts([]);
      } else {
        const showroomData = await showroomResponse.json();
        console.log('Sales Showroom data received:', showroomData);
        setDisplayedProducts(showroomData);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      console.error("Error stack:", err.stack);
      setError(err.message);
      // Don't reset products on error!
      toast({
        title: "Error Loading Data",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh every 8 seconds
  const { isRefreshing: autoRefreshing, lastRefreshTime, isPaused } = useAutoRefresh(
    loadData,
    8000,
    { enabled: true, pauseOnInput: true, pauseOnModal: true }
  );

  // Testing system functions
  const openTestingDialog = async (product) => {
    setSelectedProductForTesting(product);
    setTestingDialogOpen(true);
    setLoadingMachines(true);
    try {
      const machinesRes = await fetch(`${API_BASE}/showroom/testing/machines/${product.id}`);
      if (!machinesRes.ok) {
        throw new Error('Unable to load machine testing data');
      }
      const machinesData = await machinesRes.json();
      setMachineResults(machinesData);

      const summaryRes = await fetch(`${API_BASE}/showroom/testing/summary/${product.id}`);
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setTestSummary(summaryData);
        setAssemblySummaries(prev => ({ ...prev, [product.id]: summaryData }));
      }
    } catch (machineError) {
      console.error('Failed to fetch machine testing data', machineError);
      toast({
        title: 'Machine Testing Unavailable',
        description: machineError.message || 'Unable to load machine testing data. Please retry later.',
        variant: 'destructive',
      });
      setTestingDialogOpen(false);
    } finally {
      setLoadingMachines(false);
    }
  };

  const closeTestingDialog = () => {
    setTestingDialogOpen(false);
    setSelectedProductForTesting(null);
    setMachineResults([]);
    setTestSummary(null);
  };

  const refreshMachineSummary = async (assemblyOrderId) => {
    try {
      const summaryRes = await fetch(`${API_BASE}/showroom/testing/summary/${assemblyOrderId}`);
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setTestSummary(summaryData);
        setAssemblySummaries(prev => ({ ...prev, [assemblyOrderId]: summaryData }));
      }
    } catch (error) {
      console.warn('Unable to refresh testing summary', error);
    }
  };

  const updateMachineResult = async ({ machineId, result, engineNumber, notes }) => {
    setUpdatingMachineIds(prev => new Set(prev).add(machineId));
    try {
      const res = await fetch(`${API_BASE}/showroom/testing/machine/${machineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testResult: result,
          engineNumber,
          notes,
          testedBy: user?.fullName || user?.username || 'Unknown User',
        }),
      });

      if (!res.ok) {
        const errorPayload = await res.json();
        throw new Error(errorPayload.error || 'Failed to update machine testing result');
      }

      const updatedMachine = await res.json();
      setMachineResults(prev => prev.map(machine => (machine.id === machineId ? updatedMachine : machine)));
      await refreshMachineSummary(updatedMachine.assemblyOrderId);
      toast({
        title: result === 'pass' ? 'Machine Passed' : result === 'fail' ? 'Machine Failed' : 'Machine Pending',
        description: result === 'pass'
          ? 'Machine marked as passed. It can move forward to showroom preparation.'
          : result === 'fail'
            ? 'Machine marked as failed. It will be routed back to assembly for rework.'
            : 'Machine status reset to pending.',
      });
    } catch (error) {
      console.error('Failed to update machine test result', error);
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdatingMachineIds(prev => {
        const next = new Set(prev);
        next.delete(machineId);
        return next;
      });
    }
  };

  const processAssemblyAfterTesting = async (assemblyOrderId) => {
    try {
      const res = await fetch(`${API_BASE}/showroom/testing/process/${assemblyOrderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processedBy: user?.fullName || user?.username || 'Unknown User',
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || payload.message || 'Failed to process assembly order');
      }

      if (payload.failedMachines && payload.failedMachines.length > 0) {
        toast({
          title: 'Assembly Requires Rework',
          description: `${payload.failedMachines.length} machine(s) failed testing and have been sent back to assembly`,
          variant: 'destructive',
        });
        loadData();
      } else {
        toast({
          title: 'Assembly Approved',
          description: payload.message || 'All machines passed testing. Product moved to showroom!',
        });
        // Remove from local products list and refresh showroom
        setProducts(prev => prev.filter(order => order.id !== assemblyOrderId));
        loadData();
      }
      closeTestingDialog();
    } catch (error) {
      console.error('Failed to process assembly results', error);
      toast({
        title: 'Processing Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };



  // Removed markAsSold function - selling is handled by Sales department

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': 
        return 'bg-green-100 text-green-800';
      default: 
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available':
        return <Eye className="w-3 h-3" />;
      default: 
        return <Package className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-800 text-lg font-medium">Loading Showroom dashboard...</p>
          <p className="text-gray-600 text-sm mt-1">Please wait while we retrieve the data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="bg-white border border-red-300 shadow-sm p-8 max-w-md">
          <CardContent className="text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">System Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Reload System
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  const readyCount = products.length;
  const getAssemblySummary = (assemblyOrderId) => assemblySummaries[assemblyOrderId] || null;
  const canProceedToShowroom = (assemblyOrderId) => {
    const summary = getAssemblySummary(assemblyOrderId);
    return summary?.canProceed;
  };

  const failedMachineCount = (assemblyOrderId) => {
    const summary = getAssemblySummary(assemblyOrderId);
    return summary ? summary.failed : 0;
  };

  const pendingMachineCount = (assemblyOrderId) => {
    const summary = getAssemblySummary(assemblyOrderId);
    return summary ? summary.pending : 0;
  };

  const totalMachineCount = (assemblyOrderId) => {
    const summary = getAssemblySummary(assemblyOrderId);
    return summary ? summary.totalMachines : null;
  };

  // Debug: Log products state before render
  console.log('RENDER: products state:', products);
  console.log('RENDER: products.length:', products.length);
  console.log('RENDER: loading:', loading);

  return (
    <div className="min-h-screen bg-white">
      <AutoRefreshIndicator 
        isRefreshing={autoRefreshing}
        lastRefreshTime={lastRefreshTime}
        isPaused={isPaused}
      />
      {/* Header */}
      <div className="max-w-7xl mx-auto bg-white shadow-md border-b-4 border-green-800 rounded-b-lg">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
            {/* Left: Back + Title */}
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
              <Button
                onClick={() => navigate(user?.department === 'admin' ? '/dashboard/admin' : '/dashboard')}
                variant="outline"
                className="border border-gray-300 bg-white text-gray-800 text-sm placeholder-gray-500 w-full sm:w-auto"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-800 rounded-lg flex items-center justify-center shadow-lg">
                  <Store className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Showroom Department</h1>
                  <p className="text-gray-600 text-sm sm:text-base font-medium">Product Display Management System</p>
                </div>
              </div>
            </div>
            {/* Right: User Panel + Add Guest Button */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 px-4 py-4 sm:px-6 rounded-lg shadow-sm w-full sm:w-auto">
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-gray-600 text-xs font-medium">Showroom Team</p>
                    <p className="text-blue-600 text-xs font-medium">Product Display Management</p>
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
      

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex space-x-2 border-b border-blue-200 mb-8">
          <button
            className={`relative px-6 py-3 text-lg font-semibold focus:outline-none transition-colors border-b-4 ${activeTab === 0 ? 'border-blue-700 text-blue-800 bg-white' : 'border-transparent text-gray-500 bg-blue-50 hover:text-blue-700'}`}
            onClick={() => setActiveTab(0)}
          >
            Products Ready for Showroom
            {readyCount > 0 && (
              <span className="absolute top-2 right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                {readyCount}
              </span>
            )}
            {readyCount > 0 && (
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  Ready: {products.filter(product => canProceedToShowroom(product.id)).length}
                </span>
                <span className="inline-flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-600" />
                  Failed: {products.reduce((acc, product) => acc + failedMachineCount(product.id), 0)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-yellow-600" />
                  Pending: {products.reduce((acc, product) => acc + pendingMachineCount(product.id), 0)}
                </span>
              </div>
            )}
          </button>
          <button
            className={`px-6 py-3 text-lg font-semibold focus:outline-none transition-colors border-b-4 ${activeTab === 1 ? 'border-blue-700 text-blue-800 bg-white' : 'border-transparent text-gray-500 bg-blue-50 hover:text-blue-700'}`}
            onClick={() => setActiveTab(1)}
          >
            Products on Display
          </button>
        </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 0 ? (
        // Products Ready for Showroom Tab
        <div className="px-6 mb-8">
          <div className="bg-white border border-gray-300 rounded-sm shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-800">Products Ready for Showroom</h2>
              <p className="text-gray-600 text-sm mt-1">Products ready for testing and showroom display</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {products.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-sm">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No Products Available</h3>
                    <p className="text-gray-600">
                      {loading ? 'Loading products...' : 'Completed products from assembly will appear here.'}
                    </p>
                    {!loading && (
                      <p className="text-gray-500 text-sm mt-2">
                        Ensure assembly orders are marked as "completed" to display them here.
                      </p>
                    )}
                  </div>
                ) : (
                  products.map((product, index) => (
                    <div key={product.id}>
                      {/* ...existing card rendering for available products... */}
                      <Card className="bg-white border border-gray-300 shadow-sm">
                        <CardHeader className="bg-gray-50 border-b border-gray-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-gray-800 text-lg font-semibold">{product.productName}</CardTitle>
                              <div className="mt-2 space-y-1">
                                <p className="text-gray-600 text-sm">
                                <span className="font-medium">Total Machines:</span> {product.quantity} units
                                </p>
                                {product.pendingMachines && (
                                  <p className="text-blue-600 text-sm font-medium">
                                    <span className="font-medium">Machines for Testing:</span> {product.pendingMachines} units
                                  </p>
                                )}
                                {product.hasReworkedMachines && (
                                  <p className="text-orange-600 text-sm font-medium">
                                    <RefreshCw className="w-3 h-3 inline mr-1" />
                                    Contains reworked machines returned for re-testing
                                  </p>
                                )}
                                <p className="text-gray-600 text-sm">
                                  <span className="font-medium">Assembly Order:</span> #{product.id}
                                </p>
                                <p className="text-gray-600 text-sm">
                                  <span className="font-medium">Completed:</span> {new Date(product.completedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Badge className={`border ${product.hasReworkedMachines 
                              ? 'bg-orange-100 text-orange-800 border-orange-300' 
                              : 'bg-green-100 text-green-800 border-green-300'}`}>
                              {product.hasReworkedMachines ? (
                                <>
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  Rework Returned
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Assembly Complete
                                </>
                              )}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">

                          {/* Testing Progress */}
                          <div className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-gray-700 text-sm font-medium">Machine Testing Status:</span>
                              <span className="text-gray-600 text-sm">
                                {totalMachineCount(product.id) !== null
                                  ? `${totalMachineCount(product.id) - pendingMachineCount(product.id)}/${totalMachineCount(product.id)} Machines Evaluated`
                                  : 'Loading...'}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-sm h-3 mb-3">
                              <div
                                className={`h-3 rounded-sm transition-all duration-300 ${
                                  canProceedToShowroom(product.id)
                                    ? 'bg-green-600'
                                    : pendingMachineCount(product.id) > 0
                                      ? 'bg-yellow-500'
                                      : failedMachineCount(product.id) > 0
                                        ? 'bg-red-600'
                                        : 'bg-gray-300'
                                }`}
                                style={{
                                  width: totalMachineCount(product.id)
                                    ? `${((totalMachineCount(product.id) - pendingMachineCount(product.id)) / Math.max(totalMachineCount(product.id), 1)) * 100}%`
                                    : '0%'
                                }}
                              ></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                                <CheckCircle className="w-4 h-4 text-green-700" />
                                <span className="text-xs font-medium text-green-700">
                                  Passed: {getAssemblySummary(product.id)?.passed ?? 0}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                                <XCircle className="w-4 h-4 text-red-700" />
                                <span className="text-xs font-medium text-red-700">
                                  Failed: {failedMachineCount(product.id)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                <Clock className="w-4 h-4 text-yellow-600" />
                                <span className="text-xs font-medium text-yellow-600">
                                  Pending: {pendingMachineCount(product.id)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3">
                            {/* Always show Conduct Test button */}
                            <Button
                              onClick={() => openTestingDialog(product)}
                              variant="outline"
                              className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                              <TestTube className="w-4 h-4 mr-2" />
                              {pendingMachineCount(product.id) === totalMachineCount(product.id) 
                                ? 'Conduct Test' 
                                : 'View Machine Tests'}
                            </Button>
                            
                            {/* Only show Move to Showroom button if at least one machine has been tested */}
                            {totalMachineCount(product.id) !== null && 
                             pendingMachineCount(product.id) < totalMachineCount(product.id) && (
                              <Button
                                onClick={() => processAssemblyAfterTesting(product.id)}
                                className={`flex-1 ${
                                  canProceedToShowroom(product.id)
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                }`}
                                disabled={
                                  !canProceedToShowroom(product.id) ||
                                  displayedProducts.some(p => p.productionOrderId === product.productionOrderId)
                                }
                              >
                                <Store className="w-4 h-4 mr-2" />
                                {displayedProducts.some(p => p.productionOrderId === product.productionOrderId)
                                  ? 'In Showroom'
                                  : canProceedToShowroom(product.id)
                                    ? 'Move to Showroom'
                                    : failedMachineCount(product.id) > 0
                                      ? 'Resolve Failed Machines'
                                      : 'Testing Incomplete'}
                              </Button>
                            )}
                            
                            {/* Show Send Failed Machines button only if there are failed machines and testing has started */}
                            {failedMachineCount(product.id) > 0 && 
                             pendingMachineCount(product.id) < totalMachineCount(product.id) && (
                              getAssemblySummary(product.id)?.failedMachinesInRework ? (
                                <Button
                                  variant="outline"
                                  disabled
                                  className="flex-1 border-green-300 text-green-700 bg-green-50 cursor-not-allowed"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Sent to Rework
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => processAssemblyAfterTesting(product.id)}
                                  variant="outline"
                                  className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                                >
                                  <ArrowLeft className="w-4 h-4 mr-2" />
                                  Send Failed Machines
                                </Button>
                              )
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Products on Display Tab
        <div className="px-6 mb-8">
          <div className="bg-white border border-gray-300 rounded-sm shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-800">Products on Display</h2>
              <p className="text-gray-600 text-sm mt-1">Products currently on display for customers</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {displayedProducts.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-sm">
                    <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No Products on Display</h3>
                    <p className="text-gray-600">Complete product testing to add items to the showroom display.</p>
                  </div>
                ) : (
                  displayedProducts.map((product, index) => (
                    <div key={`showroom-${product.id}`}>
                      <Card className="bg-white border border-gray-300 shadow-sm">
                        <CardHeader className="bg-blue-50 border-b border-gray-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-gray-800 text-lg font-semibold">{product.name || product.productName}</CardTitle>
                              <div className="mt-2 space-y-1">
                                <p className="text-gray-600 text-sm">
                                  <span className="font-medium">Total Batch:</span> {product.originalQuantity || product.original_qty} units
                                </p>
                                <p className="text-green-600 text-sm font-medium">
                                  <span className="font-medium">On Display:</span> {product.displayQuantity || product.quantity} units
                                </p>
                                <p className="text-blue-600 text-sm">
                                  <span className="font-medium">Available for Sale:</span> {product.quantity} units
                                </p>
                                {product.soldQuantity > 0 && (
                                  <p className="text-purple-600 text-sm">
                                    <span className="font-medium">Already Sold:</span> {product.soldQuantity} units
                                  </p>
                                )}
                                
                                {/* Enhanced Machine Status Breakdown */}
                                <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded">
                                  <p className="text-xs font-medium text-gray-700 mb-1">Machine Status Breakdown:</p>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <span className="text-green-600">
                                      <span className="font-medium">On Display:</span> {product.displayQuantity || product.quantity}
                                    </span>
                                    {product.reworkQuantity > 0 && (
                                      <span className="text-red-600">
                                        <span className="font-medium">In Rework:</span> {product.reworkQuantity}
                                      </span>
                                    )}
                                    {product.soldQuantity > 0 && (
                                      <span className="text-purple-600">
                                        <span className="font-medium">Sold:</span> {product.soldQuantity}
                                      </span>
                                    )}
                                    {product.reworkQuantity === 0 && product.soldQuantity === 0 && (
                                      <span className="text-gray-500">
                                        <span className="font-medium">Complete Batch</span>
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Progress Bar */}
                                  <div className="mt-2">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-green-500 h-2 rounded-l-full" 
                                        style={{ 
                                          width: `${((product.displayQuantity || product.quantity) / (product.originalQuantity || product.original_qty)) * 100}%` 
                                        }}
                                      ></div>
                                      {product.reworkQuantity > 0 && (
                                        <div 
                                          className="bg-red-500 h-2" 
                                          style={{ 
                                            width: `${(product.reworkQuantity / (product.originalQuantity || product.original_qty)) * 100}%`,
                                            marginTop: '-8px',
                                            marginLeft: `${((product.displayQuantity || product.quantity) / (product.originalQuantity || product.original_qty)) * 100}%`
                                          }}
                                        ></div>
                                      )}
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                      <span>0</span>
                                      <span>{product.originalQuantity || product.original_qty} total</span>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-gray-600 text-sm">
                                  <span className="font-medium">Display Date:</span> {new Date(product.displayedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Badge className={`${getStatusColor(product.showroomStatus)} border`}>
                              {getStatusIcon(product.showroomStatus)}
                              <span className="ml-1 capitalize">{product.showroomStatus || 'available'}</span>
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-center">
                            {(product.showroomStatus === 'available' || !product.showroomStatus) && (
                              <div className="text-right">
                                <p>
                                  <Badge className="bg-green-100 text-green-800 border border-green-300">
                                  <Eye className="w-3 h-3 mr-1" />
                                  On Display and Ready for Sales
                                </Badge>
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Testing Dialog */}
      <Dialog open={testingDialogOpen} onOpenChange={setTestingDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col bg-white">
          <DialogHeader className="border-b border-gray-200 pb-4 px-6 pt-6 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl text-gray-800">
              <div className="bg-blue-100 p-2 rounded-lg">
                <TestTube className="w-5 h-5 text-blue-700" />
              </div>
              Machine Testing Tracker
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-3">
              <strong>Product:</strong> {selectedProductForTesting?.productName}<br />
              <span className="text-gray-500">Update the status for each machine. Failed machines will be sent back to assembly for rework.</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6">
            {loadingMachines ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
                <span className="text-gray-600">Loading machines...</span>
              </div>
            ) : (
              <div className="space-y-6 py-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="p-6 border border-blue-200 rounded-lg bg-blue-50">
                    <div className="flex items-center gap-3 text-blue-800 font-semibold mb-4">
                      <ListChecks className="w-5 h-5" />
                      Testing Summary
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-green-100 text-green-800 rounded-lg text-center">
                        <div className="text-lg font-bold">{testSummary?.passed ?? 0}</div>
                        <div className="text-xs">Passed</div>
                      </div>
                      <div className="p-3 bg-red-100 text-red-800 rounded-lg text-center">
                        <div className="text-lg font-bold">{testSummary?.failed ?? 0}</div>
                        <div className="text-xs">Failed</div>
                      </div>
                      <div className="p-3 bg-yellow-100 text-yellow-800 rounded-lg text-center">
                        <div className="text-lg font-bold">{testSummary?.pending ?? 0}</div>
                        <div className="text-xs">Pending</div>
                      </div>
                    </div>
                    {testSummary && !testSummary.canProceed && (
                      <p className="text-sm text-red-700 mt-4 p-3 bg-red-100 rounded-lg">
                        ⚠️ Complete all machine testing before proceeding to showroom
                      </p>
                    )}
                    {testSummary?.canProceed && (
                      <p className="text-sm text-green-700 mt-4 p-3 bg-green-100 rounded-lg">
                        ✅ All machines tested! Ready for showroom placement
                      </p>
                    )}
                  </div>
                  
                  <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="font-semibold text-gray-800 mb-3">Instructions:</div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">1.</span>
                        <span>Enter engine/serial numbers for each machine</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">2.</span>
                        <span>Mark each machine as <span className="text-green-600 font-medium">Pass</span> or <span className="text-red-600 font-medium">Fail</span></span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">3.</span>
                        <span>Add notes for failed machines to help assembly team</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">4.</span>
                        <span>Failed machines will be sent back for rework automatically</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Machine Testing Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                    <h3 className="text-lg font-semibold text-gray-800">Machine Testing Results</h3>
                    <p className="text-sm text-gray-600 mt-1">Test each machine individually and record results</p>
                  </div>
                  
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <div className="min-w-full">
                      {/* Table Header */}
                      <div className="grid grid-cols-12 gap-4 bg-gray-100 text-sm font-semibold text-gray-700 py-3 px-6 border-b">
                        <div className="col-span-2">Machine No.</div>
                        <div className="col-span-2">Engine / Serial</div>
                        <div className="col-span-3">Test Status</div>
                        <div className="col-span-3">Notes</div>
                        <div className="col-span-2 text-center">Current Status</div>
                      </div>
                      
                      {/* Table Body */}
                      <div className="divide-y divide-gray-200">
                        {machineResults.map(machine => {
                          const isUpdating = updatingMachineIds.has(machine.id);
                          return (
                            <div key={machine.id} className="grid grid-cols-12 gap-4 items-center py-4 px-6 hover:bg-gray-50">
                              {/* Machine Number */}
                              <div className="col-span-2">
                                <span className="font-semibold text-gray-800">{machine.machineNumber}</span>
                              </div>
                              
                              {/* Engine Number Input */}
                              <div className="col-span-2">
                                <Input
                                  className="w-full"
                                  defaultValue={machine.engineNumber || ''}
                                  placeholder="Engine no."
                                  onBlur={(event) => {
                                    const newValue = event.target.value;
                                    if (newValue !== (machine.engineNumber || '')) {
                                      updateMachineResult({
                                        machineId: machine.id,
                                        result: machine.testResult,
                                        engineNumber: newValue,
                                        notes: machine.notes,
                                      });
                                    }
                                  }}
                                />
                              </div>
                              
                              {/* Status Buttons */}
                              <div className="col-span-3">
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant={machine.testResult === 'pass' ? 'default' : 'outline'}
                                    className={`px-3 py-1 text-xs ${machine.testResult === 'pass' ? 'bg-green-600 hover:bg-green-700 text-white' : 'text-green-700 border-green-300 hover:bg-green-50'}`}
                                    disabled={isUpdating}
                                    onClick={() => updateMachineResult({
                                      machineId: machine.id,
                                      result: 'pass',
                                      engineNumber: machine.engineNumber,
                                      notes: machine.notes,
                                    })}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Pass
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={machine.testResult === 'fail' ? 'default' : 'outline'}
                                    className={`px-3 py-1 text-xs ${machine.testResult === 'fail' ? 'bg-red-600 hover:bg-red-700 text-white' : 'text-red-700 border-red-300 hover:bg-red-50'}`}
                                    disabled={isUpdating}
                                    onClick={() => updateMachineResult({
                                      machineId: machine.id,
                                      result: 'fail',
                                      engineNumber: machine.engineNumber,
                                      notes: machine.notes,
                                    })}
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Fail
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={machine.testResult === 'pending' ? 'default' : 'outline'}
                                    className={`px-3 py-1 text-xs ${machine.testResult === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'text-yellow-700 border-yellow-300 hover:bg-yellow-50'}`}
                                    disabled={isUpdating}
                                    onClick={() => updateMachineResult({
                                      machineId: machine.id,
                                      result: 'pending',
                                      engineNumber: machine.engineNumber,
                                      notes: machine.notes,
                                    })}
                                  >
                                    <Clock className="w-3 h-3 mr-1" />
                                    Reset
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Notes Input */}
                              <div className="col-span-3">
                                <Input
                                  className="w-full"
                                  defaultValue={machine.notes || ''}
                                  placeholder="Add notes..."
                                  onBlur={(event) => {
                                    const newValue = event.target.value;
                                    if (newValue !== (machine.notes || '')) {
                                      updateMachineResult({
                                        machineId: machine.id,
                                        result: machine.testResult,
                                        engineNumber: machine.engineNumber,
                                        notes: newValue,
                                      });
                                    }
                                  }}
                                />
                              </div>
                              
                              {/* Status Display */}
                              <div className="col-span-2 text-center">
                                {isUpdating ? (
                                  <span className="inline-flex items-center gap-2 text-xs text-blue-600">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Updating...
                                  </span>
                                ) : (
                                  <Badge
                                    className={`px-2 py-1 text-xs font-medium ${
                                      machine.testResult === 'pass'
                                        ? 'bg-green-100 text-green-800 border border-green-200'
                                        : machine.testResult === 'fail'
                                          ? 'bg-red-100 text-red-800 border border-red-200'
                                          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                    }`}
                                  >
                                    {machine.testResult === 'pass' ? '✓ Ready' : machine.testResult === 'fail' ? '✗ Rework' : '⏳ Pending'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between items-center gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="text-sm text-gray-600">
              {testSummary && (
                <span>
                  Progress: {testSummary.passed + testSummary.failed} of {testSummary.totalMachines} machines tested
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={closeTestingDialog} 
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Close
              </Button>
              {selectedProductForTesting && (
                <>
                  {/* Show "Complete Testing First" button when testing is incomplete */}
                  {testSummary?.pending > 0 && (
                    <Button
                      disabled
                      className="px-6 py-2 bg-gray-400 text-gray-600 cursor-not-allowed"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Complete Testing First
                    </Button>
                  )}
                  
                  {/* Show "Process Result" button when all testing is complete */}
                  {testSummary?.pending === 0 && (
                    <Button
                      onClick={() => processAssemblyAfterTesting(selectedProductForTesting.id)}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Store className="w-4 h-4 mr-2" />
                      Process Result
                    </Button>
                  )}
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-12 bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="text-center text-gray-600">
          <p className="font-medium">
            © Product Display Management System
          </p>
          <p className="text-sm mt-1">
            For technical support, contact IT Department
          </p>
        </div>
      </div>

      {/* Guest Dialog */}
      <GuestDialog 
        open={showGuestDialog} 
        onOpenChange={setShowGuestDialog}
      />
    </div>
  );
// Removed duplicate dialog and footer
};

export default ShowroomDepartment;
