
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, NativeSelect } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { getUserHeaders } from '@/utils/api';
import LeaveRequestButton from '@/components/LeaveRequestButton';
import ManagerLeaveApprovalButton from '@/components/ManagerLeaveApprovalButton';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { AutoRefreshIndicator } from '@/components/AutoRefreshIndicator';
import { 
    ShoppingCart, 
    Users,
    ArrowLeft, 
    TrendingUp, 
    Package, 
    IndianRupee, 
    Calendar,
    Plus,
    Edit,
    CheckCircle,
    AlertCircle,
    RefreshCw,
    Truck,
    Search as SearchIcon,
    Award,
    X,
    UserCheck,
    Download,
    Clock
} from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import OrderStatusBar from '@/components/ui/OrderStatusBar';
import SalesPerformanceDashboard from '@/components/SalesPerformanceDashboard';
import { GuestDialog } from '@/components/GuestDialog';

const SalesDepartment = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [showroomProducts, setShowroomProducts] = useState([]);
    const [salesOrders, setSalesOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [salesSummary, setSalesSummary] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isEditingOrder, setIsEditingOrder] = useState(false);
    const [showCreateOrderDialog, setShowCreateOrderDialog] = useState(false);
    const [showCreateCustomerDialog, setShowCreateCustomerDialog] = useState(false);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [showTransportCostDialog, setShowTransportCostDialog] = useState(false);
    const [showDriverDetailsDialog, setShowDriverDetailsDialog] = useState(false);
    const [showTransportDemandDialog, setShowTransportDemandDialog] = useState(false);
    const [rejectedTransportApprovals, setRejectedTransportApprovals] = useState([]);
    const [selectedTransportApproval, setSelectedTransportApproval] = useState(null);
    const [customerNegotiationDialog, setCustomerNegotiationDialog] = useState(false);
    const [negotiationForm, setNegotiationForm] = useState({
        customerResponse: '', // 'accept' or 'reject'
        negotiatedAmount: '',
        customerNotes: ''
    });
const [showCouponDialog, setShowCouponDialog] = useState(false);
const [couponForm, setCouponForm] = useState({
    couponCode: '',
    reason: '',
    paymentDueDate: ''
});
const [showDeliveryTypeChangeDialog, setShowDeliveryTypeChangeDialog] = useState(false);
const [deliveryTypeChangeForm, setDeliveryTypeChangeForm] = useState({
    deliveryType: '',
    transportCost: '',
    paymentType: 'paid', // Default to 'paid'
    reason: ''
});
const [paymentReminders, setPaymentReminders] = useState([]);
    const [notificationCounts, setNotificationCounts] = useState({
        pendingOrders: 0,
        pendingApprovals: 0,
        pendingPayments: 0,
        pendingTransport: 0,
        pendingDispatch: 0
    });
    const [showPerformanceModal, setShowPerformanceModal] = useState(false);
    const [showGuestDialog, setShowGuestDialog] = useState(false);
    const { toast } = useToast();

    // Form states
    const [orderForm, setOrderForm] = useState({
        customerName: '',
        customerContact: '',
        customerEmail: '',
        customerAddress: '',
        gstNumber: '',
        deliveryAddress: '',
        sameAsBilling: false,
        showroomProductId: '',
        unitPrice: '',
        quantity: 1,
        discountAmount: 0,
        paymentMethod: '',
        salesPerson: user?.fullName || '', // Automatically set to logged-in user's full name
        notes: '',
        transportCost: 0,
        origin: '',
        destination: '',
        distance: '',
        vehicleType: '',
        totalAmount: 0,
        deliveryType: 'self delivery', // Default to self delivery
        paymentType: '' // Only for part load: 'to pay' or 'paid'
    });

    // Transport cost estimation form state
    const [transportCostForm, setTransportCostForm] = useState({
        origin: '',
        destination: '',
        distance: '',
        vehicleType: '',
        distanceCost: 0,
        totalCost: 0,
        discountAmount: 0
    });

    const [includeTransportCost, setIncludeTransportCost] = useState(false);
    const [gstVerification, setGstVerification] = useState({
        isVerifying: false,
        isVerified: false,
        verificationResult: null,
        lastVerifiedGst: null
    });

    const [customerForm, setCustomerForm] = useState({
        name: '',
        contact: '',
        email: '',
        address: '',
        customerType: 'retail',
        creditLimit: 0
    });



    const [paymentForm, setPaymentForm] = useState({
        totalAmount: 0,
        receivedAmount: '',
        balanceAmount: 0,
        paymentMethod: 'cash',
        // online
        utrNumber: '',
        onlinePaymentDate: '',
        onlineDetails: '',
        // cash denominations
        denoms: { 2000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 },
        cashTotalFromDenoms: 0,
        // split
        splitCashAmount: 0,
        splitOnlineAmount: 0,
        handOverTo: ''
    });

    // const [showDriverDetailsDialog, setShowDriverDetailsDialog] = useState(false);
    const [driverForm, setDriverForm] = useState({ driverName: '', driverNumber: '', vehicleNumber: '' });
    const [driverDetailsByOrder, setDriverDetailsByOrder] = useState({});
    

    const fetchAllData = async () => {
        await Promise.all([
            fetchData(),
            fetchPaymentReminders()
        ]);
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    // Auto-refresh every 8 seconds
    const { isRefreshing: autoRefreshing, lastRefreshTime, isPaused } = useAutoRefresh(
        fetchAllData,
        8000,
        { enabled: true, pauseOnInput: true, pauseOnModal: true }
    );

    // Handle transport cost form initialization
    useEffect(() => {
        if (showTransportCostDialog) {
            if (isEditingOrder && selectedOrder) {
                // If editing, prefill with existing transport details
                setTransportCostForm({
                    origin: selectedOrder.origin || '',
                    destination: selectedOrder.destination || '',
                    distance: selectedOrder.distance || '',
                    vehicleType: selectedOrder.vehicleType || '',
                    distanceCost: selectedOrder.distanceCost || 0,
                    totalCost: selectedOrder.transportCost || 0,
                    discountAmount: selectedOrder.transportDiscountAmount || 0
                });
                setIncludeTransportCost(selectedOrder.transportCost > 0);
            } else {
                // If creating new, reset the form
                setTransportCostForm({
                    origin: '',
                    destination: '',
                    distance: '',
                    vehicleType: '',
                    distanceCost: 0,
                    totalCost: 0,
                    discountAmount: 0
                });
                setIncludeTransportCost(false);
            }
        }
    }, [showTransportCostDialog, isEditingOrder, selectedOrder]);
    
    // Calculate notification counts whenever salesOrders changes
    useEffect(() => {
        if (salesOrders.length > 0) {
            const counts = {
                pendingOrders: salesOrders.filter(order => order.orderStatus === 'pending').length,
                pendingApprovals: salesOrders.filter(order => order.approvalStatus === 'pending').length,
                pendingPayments: salesOrders.filter(order => order.paymentStatus === 'pending' || order.paymentStatus === 'partial').length,
                pendingTransport: salesOrders.filter(order => 
                    (order.deliveryType === 'transport' && !order.transportArranged) || 
                    rejectedTransportApprovals.some(approval => approval.orderNumber === order.orderNumber)
                ).length,
                pendingDispatch: salesOrders.filter(order => 
                    order.orderStatus === 'confirmed' && 
                    (order.paymentStatus === 'completed' || order.financeBypass === true) && 
                    order.afterSalesStatus !== 'sent_to_dispatch'
                ).length,
                paymentReminders: paymentReminders.filter(r => r.status === 'overdue').length
            };
            setNotificationCounts(counts);
        }
    }, [salesOrders, rejectedTransportApprovals]);

    // Ensure salesPerson is always set to the logged-in user's full name
    useEffect(() => {
        if (user?.fullName) {
            console.log('[SALES] User logged in:', user.fullName);
            console.log('[SALES] Setting salesPerson to:', user.fullName);
            setOrderForm(prev => ({
                ...prev,
                salesPerson: user.fullName
            }));
        }
    }, [user]);

    const fetchData = async () => {
    try {
        setLoading(true);
        console.log('API_BASE:', API_BASE); // Check if API_BASE is defined
        
        // Get user headers for role-based filtering
        const userHeaders = getUserHeaders();
        
        const endpoints = [
            { url: `${API_BASE}/sales/showroom/available`, setter: setShowroomProducts, name: 'products' },
            { url: `${API_BASE}/sales/orders`, setter: setSalesOrders, name: 'orders' },
            { url: `${API_BASE}/sales/customers`, setter: setCustomers, name: 'customers' },
            { url: `${API_BASE}/sales/summary`, setter: setSalesSummary, name: 'summary' },
            { url: `${API_BASE}/transport/approvals/rejected`, setter: setRejectedTransportApprovals, name: 'rejectedApprovals' }
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint.url, {
                    headers: userHeaders
                });
                if (response.ok) {
                    const data = await response.json();
                    
                    // For sales orders, check approval status
                    if (endpoint.name === 'orders') {
                        try {
                            const approvalResponse = await fetch(`${API_BASE}/approval/pending`);
                            if (approvalResponse.ok) {
                                const approvalData = await approvalResponse.json();
                                const ordersWithApprovalStatus = data.map(order => {
                                    const hasPendingApproval = approvalData.approvals?.some(approval => 
                                        approval.orderNumber === order.orderNumber
                                    );
                                    return {
                                        ...order,
                                        approvalStatus: hasPendingApproval ? 'pending' : order.approvalStatus
                                    };
                                });
                                endpoint.setter(ordersWithApprovalStatus);
                            } else {
                                endpoint.setter(data);
                            }
                        } catch (approvalError) {
                            console.error('Error checking approval status:', approvalError);
                            endpoint.setter(data);
                        }
                    } else {
                        endpoint.setter(data);
                    }
                    
                    console.log(`✅ Loaded ${endpoint.name}:`, data.length || 'N/A');
                } else {
                    console.error(`❌ Failed to load ${endpoint.name}:`, response.status);
                    toast({
                        title: `Error fetching ${endpoint.name}`,
                        description: `Status: ${response.status} - ${response.statusText}`,
                        variant: "destructive"
                    });
                }
            } catch (fetchError) {
                console.error(`Network error fetching ${endpoint.name}:`, fetchError);
                toast({
                    title: `Network Error`,
                    description: `Failed to connect to server for ${endpoint.name}`,
                    variant: "destructive"
                });
            }
        }
    } catch (error) {
        console.error('General error in fetchData:', error);
        toast({
            title: "Error",
            description: "Failed to fetch data - check console for details",
            variant: "destructive"
        });
    } finally {
        setLoading(false);
    }
};

const fetchPaymentReminders = async () => {
    try {
        const userHeaders = getUserHeaders();
        console.log('[PAYMENT REMINDERS DEBUG] User headers being sent:', userHeaders);
        console.log('[PAYMENT REMINDERS DEBUG] Current user:', user);
        
        const response = await fetch(`${API_BASE}/sales/payment-reminders`, {
            headers: userHeaders
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('[PAYMENT REMINDERS DEBUG] Received reminders:', data);
            setPaymentReminders(data.reminders || []);
        } else {
            console.error('[PAYMENT REMINDERS DEBUG] Response not ok:', response.status);
        }
    } catch (error) {
        console.error('Error fetching payment reminders:', error);
    }
};

const handleDownloadInvoice = async (orderId, orderNumber, orderData = null) => {
    try {
        toast({ title: 'Opening Invoice...', description: 'Generating invoice' });
        
        // Always use POST with order data to ensure latest values
        const dataToSend = orderData || {};
        
        const response = await fetch(`${API_BASE}/sales/orders/${orderId}/invoice`, {
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

const handleCreateOrder = async () => {
    try {
        // ✅ Validate required fields before submission
        const requiredFields = [
            { key: 'customerName', label: 'Customer Name' },
            { key: 'customerContact', label: 'Customer Contact' },
            { key: 'customerAddress', label: 'Billing Address' },
            { key: 'deliveryAddress', label: 'Delivery Address' },
            { key: 'deliveryType', label: 'Delivery Type' },
            { key: 'unitPrice', label: 'Unit Price' },
            { key: 'quantity', label: 'Quantity' },
            { key: 'salesPerson', label: 'Sales Person' }
        ];

        for (const field of requiredFields) {
            const value = orderForm[field.key];
            if (value === undefined || value === null || value.toString().trim() === '') {
                toast({
                    title: 'Missing Information',
                    description: `${field.label} is required.`,
                    variant: 'destructive'
                });
                return; // stop function if missing any field
            }
        }

        // ✅ For Part Load, make sure payment type is selected
        if (orderForm.deliveryType === 'part load' && !orderForm.paymentType) {
            toast({
                title: 'Missing Information',
                description: 'Please select a payment type for part load delivery.',
                variant: 'destructive'
            });
            return;
        }

        // ✅ For Company Delivery, make sure transport cost is filled
        if (orderForm.deliveryType === 'company delivery' && (!orderForm.transportCost || orderForm.transportCost <= 0)) {
            toast({
                title: 'Missing Information',
                description: 'Transport cost is required for company delivery. Please enter the transport cost.',
                variant: 'destructive'
            });
            return;
        }

        // For Part Load and Company Delivery orders, determine if transport approval is needed
        const needsTransportApproval = orderForm.deliveryType === 'part load' || orderForm.deliveryType === 'company delivery';
        
        // Set the initial order status based on delivery type
        const orderPayload = {
            ...orderForm,
            orderStatus: needsTransportApproval ? 'pending_transport_approval' : 'pending'
        };
        
        console.log('[SALES] Creating order with salesPerson:', orderPayload.salesPerson);
        console.log('[SALES] Current user fullName:', user?.fullName);
        
        let response;
        if (isEditingOrder && selectedOrder) {
            // Update existing order
            response = await fetch(`${API_BASE}/sales/orders/${selectedOrder.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderPayload),
            });
        } else {
            // Create new order
            response = await fetch(`${API_BASE}/sales/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderPayload),
            });
        }

        if (response.ok) {
            const orderData = await response.json();
            const needsTransportApproval = orderForm.deliveryType === 'part load' || orderForm.deliveryType === 'company delivery';
            const needsFreeDeliveryApproval = orderForm.deliveryType === 'free delivery';
            
            // Create free delivery approval request if needed
            if (!isEditingOrder && needsFreeDeliveryApproval) {
                try {
                    const approvalResponse = await fetch(`${API_BASE}/approval/free-delivery`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            salesOrderId: orderData.id,
                            requestedBy: user?.fullName || user?.username || 'Unknown User',
                            reason: `Free delivery requested for order ${orderData.orderNumber}`
                        }),
                    });
                    
                    if (!approvalResponse.ok) {
                        console.error('Failed to create free delivery approval request');
                    }
                } catch (error) {
                    console.error('Error creating free delivery approval request:', error);
                }
            }
            
            if (isEditingOrder) {
                // Update existing order in the list
                setSalesOrders(prev => prev.map(order => 
                    order.id === selectedOrder.id ? orderData : order
                ));
                
                // Check if delivery type was changed to provide specific feedback
                const deliveryTypeChanged = selectedOrder.deliveryType !== orderForm.deliveryType;
                let updateMessage = "Sales order has been updated successfully";
                
                // If delivery type changed to company/part load, create transport approval
                if (deliveryTypeChanged && needsTransportApproval) {
                    try {
                        // The backend should handle this, but we can verify
                        console.log('Delivery type changed to transport approval type:', orderForm.deliveryType);
                    } catch (error) {
                        console.error('Error with transport approval:', error);
                    }
                }
                
                // If delivery type changed to free delivery, create free delivery approval
                if (deliveryTypeChanged && needsFreeDeliveryApproval) {
                    try {
                        const approvalResponse = await fetch(`${API_BASE}/approval/free-delivery`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                salesOrderId: orderData.id,
                                requestedBy: user?.fullName || user?.username || 'Unknown User',
                                reason: `Free delivery requested for updated order ${orderData.orderNumber}`
                            }),
                        });
                        
                        if (!approvalResponse.ok) {
                            console.error('Failed to create free delivery approval request');
                        }
                    } catch (error) {
                        console.error('Error creating free delivery approval request:', error);
                    }
                }
                
                if (deliveryTypeChanged) {
                    const oldType = selectedOrder.deliveryType || 'self delivery';
                    const newType = orderForm.deliveryType;
                    
                    if (oldType === 'self delivery' && (newType === 'part load' || newType === 'company delivery')) {
                        updateMessage = `Delivery type changed to ${newType}. Order status changed to pending transport approval.`;
                    } else if ((oldType === 'part load' || oldType === 'company delivery') && newType === 'self delivery') {
                        updateMessage = `Delivery type changed to ${newType}. Pending transport approval requests have been automatically deleted.`;
                    } else if ((oldType === 'part load' || oldType === 'company delivery') && (newType === 'part load' || newType === 'company delivery')) {
                        updateMessage = `Delivery type changed from ${oldType} to ${newType}. Transport approval request updated.`;
                    }
                }
                
                toast({
                    title: "Order Updated",
                    description: updateMessage
                });
            } else {
                // Add new order to the list
                setSalesOrders(prev => [orderData, ...prev]);
                let message = "Sales order has been created successfully";
                
                // Customize message based on delivery type
                switch(orderForm.deliveryType) {
                    case 'part load':
                        message = "Order created and sent to Transport Department for approval";
                        break;
                    case 'company delivery':
                        message = "Order created and sent to Transport Department for approval";
                        break;
                    case 'free delivery':
                        message = "Order created and sent for free delivery approval";
                        break;
                    default:
                        message = "Sales order has been created successfully";
                }
                
                toast({
                    title: "Order Created",
                    description: message
                });
            }
            
            setShowCreateOrderDialog(false);
            setIsEditingOrder(false);
            setSelectedOrder(null);
            setOrderForm({
                customerName: '',
                customerContact: '',
                customerEmail: '',
                customerAddress: '',
                gstNumber: '',
                deliveryAddress: '',
                sameAsBilling: false,
                showroomProductId: '',
                unitPrice: '',
                quantity: 1,
                discountAmount: 0,
                paymentMethod: '',
                salesPerson: user?.fullName || '', // Reset to current user's full name
                notes: '',
                transportCost: 0,
                totalAmount: 0,
                deliveryType: 'self delivery'
            });
            fetchData(); // Refresh data
        } else {
            const error = await response.json();
            toast({
                title: "Error",
                description: error.error || "Failed to create order",
                variant: "destructive"
            });
        }
    } catch (error) {
        console.error('Error creating order:', error);
        toast({
            title: "Error",
            description: "Failed to create order",
            variant: "destructive"
        });
    }
};


    const handleConfirmTransportDemand = async (approvalId, action, agreedAmount = null) => {
        try {
            const payload = {
                action: action // 'accept_demand' or 'modify_order'
            };
            
            if (action === 'modify_order' && agreedAmount !== null) {
                payload.agreedTransportCost = parseFloat(agreedAmount);
            }
            
            const response = await fetch(`${API_BASE}/sales/transport/approvals/${approvalId}/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            
            if (response.ok) {
                const result = await response.json();
                toast({
                    title: "Transport Demand Confirmed",
                    description: result.message
                });
                
                // Refresh data to reflect changes
                fetchData();
                setShowTransportDemandDialog(false);
                setSelectedTransportApproval(null);
            } else {
                const error = await response.json();
                toast({
                    title: "Error",
                    description: error.error || "Failed to confirm transport demand",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error confirming transport demand:', error);
            toast({
                title: "Error",
                description: "Failed to confirm transport demand",
                variant: "destructive"
            });
        }
    };

    const handleSendBackToTransport = async () => {
        try {
            const payload = {
                negotiatedAmount: parseFloat(negotiationForm.negotiatedAmount),
                customerNotes: negotiationForm.customerNotes,
                salesPerson: user?.username || 'Sales Department'
            };
            
            const response = await fetch(`${API_BASE}/sales/transport/approvals/${selectedTransportApproval.id}/renegotiate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const result = await response.json();
                toast({
                    title: "Sent to Transport",
                    description: "Negotiated amount sent to transport for review"
                });
                
                // Refresh data and close dialogs
                fetchData();
                setCustomerNegotiationDialog(false);
                setShowTransportDemandDialog(false);
                setSelectedTransportApproval(null);
                setNegotiationForm({ customerResponse: '', negotiatedAmount: '', customerNotes: '' });
            } else {
                const error = await response.json();
                toast({
                    title: "Error",
                    description: error.error || "Failed to send negotiation to transport",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error sending back to transport:', error);
            toast({
                title: "Error",
                description: "Failed to send negotiation to transport",
                variant: "destructive"
            });
        }
    };

    const handleVerifyGST = async () => {
        if (!orderForm.gstNumber.trim()) {
            toast({
                title: "Error",
                description: "Please enter a GST number to verify",
                variant: "destructive"
            });
            return;
        }

        setGstVerification(prev => ({ ...prev, isVerifying: true }));

        try {
            const response = await fetch(`${API_BASE}/sales/verify-gst`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ gstNumber: orderForm.gstNumber }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setGstVerification({
                    isVerifying: false,
                    isVerified: result.verified,
                    verificationResult: result,
                    lastVerifiedGst: orderForm.gstNumber
                });

                if (result.verified) {
                    toast({
                        title: "✅ GST Verified",
                        description: result.message,
                    });
                } else {
                    toast({
                        title: "❌ GST Not Verified",
                        description: result.message,
                        variant: "destructive"
                    });
                }
            } else {
                setGstVerification(prev => ({ 
                    ...prev, 
                    isVerifying: false,
                    isVerified: false,
                    verificationResult: result
                }));
                toast({
                    title: "Verification Failed",
                    description: result.message || "Failed to verify GST number",
                    variant: "destructive"
                });
            }
        } catch (error) {
            setGstVerification(prev => ({ 
                ...prev, 
                isVerifying: false,
                isVerified: false,
                verificationResult: null
            }));
            toast({
                title: "Error",
                description: "Failed to connect to verification service",
                variant: "destructive"
            });
        }
    };

    const handleProcessPayment = async () => {
    try {
        // ✅ Step 1: Required Field Validations
        if (!selectedOrder) {
            toast({ title: 'Error', description: 'No order selected', variant: 'destructive' });
            return;
        }

        if (!paymentForm.totalAmount || Number(paymentForm.totalAmount) <= 0) {
            toast({ title: 'Error', description: 'Total Amount is required and must be greater than 0', variant: 'destructive' });
            return;
        }

        if (paymentForm.receivedAmount === '' || paymentForm.receivedAmount === null || Number(paymentForm.receivedAmount) <= 0) {
            toast({ title: 'Error', description: 'Received Amount is required and must be greater than 0', variant: 'destructive' });
            return;
        }

        if (!paymentForm.paymentMethod) {
            toast({ title: 'Error', description: 'Payment Method is required', variant: 'destructive' });
            return;
        }

        // ✅ Step 2: Conditional Checks based on Payment Method
        if (paymentForm.paymentMethod === 'cash') {
            const denomTotal = Object.entries(paymentForm.denoms).reduce(
                (sum, [note, qty]) => sum + (Number(note) * Number(qty || 0)),
                0
            );

            if (denomTotal !== Number(paymentForm.receivedAmount)) {
                toast({
                    title: 'Mismatch',
                    description: 'Cash denominations total must equal Received Amount',
                    variant: 'destructive'
                });
                return;
            }
        }

        if (paymentForm.paymentMethod === 'online') {
            if (!paymentForm.utrNumber || paymentForm.utrNumber.trim() === '') {
                toast({
                    title: 'Missing UTR',
                    description: 'UTR Number is required for Online payments',
                    variant: 'destructive'
                });
                return;
            }
            if (!paymentForm.onlinePaymentDate) {
                toast({
                    title: 'Missing Date',
                    description: 'Online Payment Date is required for Online payments',
                    variant: 'destructive'
                });
                return;
            }
        }

        if (paymentForm.paymentMethod === 'split') {
            const splitCash = Number(paymentForm.splitCashAmount || 0);
            const splitOnline = Number(paymentForm.splitOnlineAmount || 0);
            const totalSplit = splitCash + splitOnline;

            if (totalSplit !== Number(paymentForm.receivedAmount)) {
                toast({
                    title: 'Mismatch',
                    description: 'Split Cash + Online amounts must equal Received Amount',
                    variant: 'destructive'
                });
                return;
            }

            if (splitOnline > 0) {
                if (!paymentForm.utrNumber || paymentForm.utrNumber.trim() === '') {
                    toast({
                        title: 'Missing UTR',
                        description: 'UTR Number is required for the Online portion of Split payments',
                        variant: 'destructive'
                    });
                    return;
                }
                if (!paymentForm.onlinePaymentDate) {
                    toast({
                        title: 'Missing Date',
                        description: 'Online Payment Date is required for the Online portion of Split payments',
                        variant: 'destructive'
                    });
                    return;
                }
            }

            // Validate denominations for cash portion
            const denomTotal = Object.entries(paymentForm.denoms).reduce(
                (sum, [note, qty]) => sum + (Number(note) * Number(qty || 0)),
                0
            );
            if (denomTotal !== splitCash) {
                toast({
                    title: 'Mismatch',
                    description: 'Cash denominations total must equal Split Cash Amount',
                    variant: 'destructive'
                });
                return;
            }
        }

        // ✅ Step 3: Proceed with original payment process
        const response = await fetch(`${API_BASE}/sales/orders/${selectedOrder.id}/payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: Number(paymentForm.receivedAmount || 0),
                paymentMethod: paymentForm.paymentMethod,
                utrNumber: paymentForm.utrNumber,
                onlinePaymentDate: paymentForm.onlinePaymentDate,
                onlineDetails: paymentForm.onlineDetails,
                denoms: paymentForm.denoms,
                splitCashAmount: paymentForm.splitCashAmount,
                splitOnlineAmount: paymentForm.splitOnlineAmount,
                handOverTo: paymentForm.handOverTo,
                notes: paymentForm.notes
            }),
        });

        if (response.ok) {
            setShowPaymentDialog(false);
            setPaymentForm({
                totalAmount: 0,
                receivedAmount: 0,
                balanceAmount: 0,
                paymentMethod: 'cash',
                utrNumber: '',
                onlinePaymentDate: '',
                onlineDetails: '',
                denoms: { 2000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 },
                cashTotalFromDenoms: 0,
                splitCashAmount: 0,
                splitOnlineAmount: 0,
                notes: ''
            });
            toast({
                title: "Success",
                description: "Payment processed successfully , Sent to Finance for check",
            });
            fetchData(); // Refresh data
        } else {
            const error = await response.json();
            toast({
                title: "Error",
                description: error.error || "Failed to process payment",
                variant: "destructive"
            });
        }
    } catch (error) {
        console.error('Error processing payment:', error);
        toast({
            title: "Error",
            description: "Failed to process payment",
            variant: "destructive"
        });
    }
};
const handleCouponSubmit = async () => {
    try {
        // Validate required fields
        if (!couponForm.couponCode || !couponForm.reason || !couponForm.paymentDueDate) {
            toast({
                title: 'Missing Information',
                description: 'Please fill all required fields',
                variant: 'destructive'
            });
            return;
        }

        // Validate payment due date is not in the past
        const today = new Date().toISOString().split('T')[0];
        if (couponForm.paymentDueDate < today) {
            toast({
                title: 'Invalid Date',
                description: 'Payment due date cannot be in the past',
                variant: 'destructive'
            });
            return;
        }

        const payload = {
            couponCode: couponForm.couponCode,
            reason: couponForm.reason,
            paymentDueDate: couponForm.paymentDueDate,
            requestedBy: user?.username || 'Sales User'
        };

        console.log('Sending coupon request:', payload);

        const res = await fetch(`${API_BASE}/sales/orders/${selectedOrder.id}/coupon`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const out = await res.json();

        if (res.ok) {
            toast({ 
                title: 'Approval Request Sent', 
                description: `Order ${selectedOrder.orderNumber} sent to Management for approval. Payment due: ${couponForm.paymentDueDate}` 
            });
            setShowCouponDialog(false);
            fetchData(); // Refresh orders
            fetchPaymentReminders(); // Refresh reminders
        } else {
            toast({ 
                title: 'Failed to apply coupon', 
                description: out.error || 'Try again', 
                variant: 'destructive' 
            });
        }
    } catch (error) {
        console.error('Coupon application error:', error);
        toast({ 
            title: 'Error', 
            description: 'Failed to apply coupon', 
            variant: 'destructive' 
        });
    }
};

const handleDeliveryTypeChange = async () => {
    try {
        // Validate required fields
        if (!deliveryTypeChangeForm.deliveryType) {
            toast({
                title: 'Error',
                description: 'Please select a delivery type',
                variant: 'destructive'
            });
            return;
        }

        // Only validate transport cost if it's not a "to_pay" part load
        const isToPayPartLoad = deliveryTypeChangeForm.deliveryType === 'part load' && deliveryTypeChangeForm.paymentType === 'to_pay';
        
        if (!isToPayPartLoad && (!deliveryTypeChangeForm.transportCost || parseFloat(deliveryTypeChangeForm.transportCost) <= 0)) {
            toast({
                title: 'Error',
                description: 'Please enter a valid transport cost greater than 0',
                variant: 'destructive'
            });
            return;
        }

        const response = await fetch(`${API_BASE}/sales/orders/${selectedOrder.id}/change-delivery-type`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getUserHeaders()
            },
            body: JSON.stringify({
                deliveryType: deliveryTypeChangeForm.deliveryType,
                transportCost: isToPayPartLoad ? 0 : parseFloat(deliveryTypeChangeForm.transportCost || 0),
                paymentType: deliveryTypeChangeForm.paymentType,
                reason: deliveryTypeChangeForm.reason
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to change delivery type');
        }

        toast({
            title: 'Success',
            description: `Delivery type changed successfully. Additional amount due: ₹${result.additionalAmountDue}. Order sent for transport approval.`,
            variant: 'default'
        });

        // Update the order in the list
        setSalesOrders(prev => prev.map(order => 
            order.id === selectedOrder.id ? result.salesOrder : order
        ));

        // Close dialog and reset form
        setShowDeliveryTypeChangeDialog(false);
        setDeliveryTypeChangeForm({
            deliveryType: '',
            transportCost: '',
            reason: ''
        });
        setSelectedOrder(null);

        // Refresh data to get updated counts
        fetchData();

    } catch (error) {
        console.error('Delivery type change error:', error);
        toast({
            title: 'Error',
            description: error.message || 'Failed to change delivery type',
            variant: 'destructive'
        });
    }
};

    const getStatusBadge = (status) => {
        const statusConfig = {
            'pending': { 
                className: 'bg-yellow-100 text-yellow-800 border border-yellow-300 shadow-sm', 
                icon: AlertCircle 
            },
            'pending_transport_approval': { 
                className: 'bg-orange-100 text-orange-800 border border-orange-300 shadow-sm whitespace-normal break-words', 
                icon: Truck 
            },
            'pending_free_delivery_approval': { 
                className: 'bg-blue-100 text-blue-800 border border-blue-300 shadow-sm whitespace-normal break-words', 
                icon: Package
            },
            'confirmed': { 
                className: 'bg-green-100 text-green-800 border border-green-300 shadow-sm', 
                icon: CheckCircle 
            },
            'delivered': { 
                className: 'bg-green-100 text-green-800 border border-green-300 shadow-sm', 
                icon: CheckCircle 
            },
            'cancelled': { 
                className: 'bg-red-100 text-red-800 border border-red-300 shadow-sm', 
                icon: AlertCircle 
            }
        };

        const config = statusConfig[status] || statusConfig['pending'];
        const Icon = config.icon;

        let displayText = status;
        if (status === 'pending_transport_approval') displayText = 'Pending\nTransport Approval';
        if (status === 'pending_free_delivery_approval') displayText = 'Pending\nFree Delivery Approval';

        return (
            <Badge className={`${config.className} flex items-center gap-1.5 px-3 py-1 rounded-md`} style={{ whiteSpace: 'pre-line', textAlign: 'center', lineHeight: '1.1' }}>
                <Icon className="h-3.5 w-3.5" />
                <span className="font-semibold capitalize">{displayText}</span>
            </Badge>
        );
    };

    const getPaymentStatusBadge = (status) => {
        const statusConfig = {
            'pending': { 
                className: 'bg-red-100 text-red-800 border border-red-300 shadow-sm font-semibold', 
                icon: AlertCircle 
            },
            'pending_finance_approval': { 
                className: 'bg-red-100 text-red-800 border border-red-300 shadow-sm font-semibold whitespace-normal break-words', 
                icon: AlertCircle 
            },
            'partial': { 
                className: 'bg-orange-100 text-orange-800 border border-orange-300 shadow-sm font-semibold', 
                icon: AlertCircle 
            },
            'completed': { 
                className: 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm font-semibold', 
                icon: CheckCircle 
            },
            'finance_rejected': { 
                className: 'bg-red-100 text-red-800 border border-red-300 shadow-sm font-semibold', 
                icon: AlertCircle 
            }
        };

        const config = statusConfig[status] || statusConfig['pending'];
        const Icon = config.icon;

        let displayText = status;
        if (status === 'pending_finance_approval') displayText = 'Pending\nFinance Approval';

        return (
            <Badge className={`${config.className} flex items-center gap-1 font-medium`} style={{ whiteSpace: 'pre-line', textAlign: 'center', lineHeight: '1.1' }}>
                <Icon className="h-3 w-3" />
                <span>{displayText}</span>
            </Badge>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-800 text-lg font-medium">Loading Sales dashboard...</p>
          <p className="text-gray-600 text-sm mt-1">Please wait while we retrieve the data</p>
        </div>
      </div>
        );
    }

    return (
       <div className="min-h-screen bg-white">
       <AutoRefreshIndicator 
           isRefreshing={autoRefreshing}
           lastRefreshTime={lastRefreshTime}
           isPaused={isPaused}
       />
    {/* Government Header */}
    <div className="max-w-7xl mx-auto bg-white shadow-md border-b-4 border-blue-800 rounded-b-lg">
      {/* Main Header */}
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
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sales Department</h1>
                <p className="text-gray-600 text-sm sm:text-base font-medium">
                  Sales Management System
                </p>
              </div>
            </div>
          </div>

          {/* User Info Panel & Performance Button */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="bg-gradient-to-r from-green-50 to-indigo-50 border-2 border-green-200 px-4 py-4 sm:px-6 rounded-lg shadow-sm w-full sm:w-auto">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-gray-600 text-xs font-medium">Sales Team</p>
                  <p className="text-green-600 text-xs font-medium">Sales Management</p>
                </div>
              </div>
            </div>

            {/* My Performance Button */}
            <Button
              onClick={() => setShowPerformanceModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 w-full sm:w-auto"
            >
              <Award className="w-4 h-4" />
              <span>My Performance</span>
            </Button>

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
        

    <div className="px-6 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white border border-gray-300 shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Orders</p>
                   
                    <p className="text-2xl font-bold text-gray-800 mt-1">{salesSummary.totalOrders || 0}</p>
                  </div>
                  <div className="bg-blue-100 p-2 rounded-sm">
                     <ShoppingCart className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-300 shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
                    
                    <p className="text-2xl font-bold text-gray-800 mt-1">
                     ₹{salesSummary.totalRevenue?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="bg-green-100 p-2 rounded-sm">
                    <IndianRupee className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-300 shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Today's Orders</p>
                    
                    <p className="text-2xl font-bold text-gray-800 mt-1">
                      {salesSummary.todayOrders || 0}
                    </p>
                  </div>
                  <div className="bg-orange-100 p-2 rounded-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-gray-300 shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Today's Revenue</p>
                    
                    <p className="text-2xl font-bold text-gray-800 mt-1">
                      ₹{salesSummary.todayRevenue?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="bg-purple-100 p-2 rounded-sm">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        




            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="overflow-x-auto">
                <TabsList className="flex md:grid md:grid-cols-6 w-full overflow-x-auto overflow-y-hidden md:overflow-x-hidden whitespace-nowrap bg-gray-100 border border-gray-300 pl-60 md:pl-0">
                    <TabsTrigger value="dashboard" className="text-gray-800">Dashboard</TabsTrigger>
                    <TabsTrigger value="showroom" className="text-gray-800">Showroom Products</TabsTrigger>
                    <TabsTrigger value="orders" className="text-gray-800 relative">
                        Sales Orders
                        {notificationCounts.pendingOrders > 0 && (
                            <Badge variant="destructive" className="ml-2">
                                {notificationCounts.pendingOrders}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="transport" className="text-gray-800 relative">
                        Transport Reviews
                        {notificationCounts.pendingTransport > 0 && (
                            <Badge variant="destructive" className="ml-2">
                                {notificationCounts.pendingTransport}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="afterSales" className="text-gray-800 relative">
                        After Sales
                        {notificationCounts.pendingDispatch > 0 && (
                            <Badge variant="destructive" className="ml-2">
                                {notificationCounts.pendingDispatch}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="reminders" className="text-gray-800 relative">
                    Payment Reminders
                    {paymentReminders.length > 0 && (
                        <Badge variant="destructive" className="ml-2">
                            {paymentReminders.length}
                        </Badge>
                    )}
                </TabsTrigger>
                </TabsList>

                {/* Dashboard Tab */}
                <TabsContent value="dashboard" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="bg-white border border-gray-300 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-gray-800">Recent Sales Orders</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {salesOrders.slice(0, 5).map((order) => (
                                        <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                            <div>
                                                <p className="font-medium text-gray-800">{order.orderNumber}</p>
                                                <p className="text-sm text-gray-600">{order.customerName}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-gray-800">₹{order.finalAmount}</p>
                                                {getStatusBadge(order.orderStatus)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white border border-gray-300 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-gray-800">Available Products</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {showroomProducts.slice(0, 5).map((product) => (
                                        <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                            <div>
                                                <p className="font-medium text-gray-800">{product.name}</p>
                                                <p className="text-sm text-gray-600">{product.category}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-gray-800">₹{product.salePrice}</p>
                                                <Badge variant="default">Available</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Showroom Products Tab */}
               <TabsContent value="showroom" className="space-y-6">
    <Card className="bg-white border border-gray-300 shadow-sm">
        <CardHeader className="border-b border-gray-200">
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="text-2xl font-bold text-gray-800">
                        Available Showroom Products
                    </CardTitle>
                    <CardDescription className="text-gray-600 mt-1">
                        Browse and sell products from your showroom
                    </CardDescription>
                </div>
                {/* <Button 
                    onClick={() => setShowCreateOrderDialog(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Sales Order
                </Button> */}
            </div>
        </CardHeader>
        
        <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {showroomProducts.map((product) => (
                    <Card key={product.id} className="bg-gray-50 border border-gray-300 shadow-sm hover:bg-gray-100 transition-colors">
                        <CardHeader>
                            <CardTitle className="text-gray-800 text-md">{product.name}</CardTitle>
                            <CardDescription className="text-gray-600">{product.category}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Sale Price:</span>
                                <span className="font-bold text-gray-800">₹{product.salePrice}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Cost Price:</span>
                                <span className="text-gray-600">₹{product.costPrice}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Quantity:</span>
                                <span className="text-gray-600">{product.quantity || 1}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Displayed:</span>
                                <span className="text-gray-600">
                                    {new Date(product.displayedAt).toLocaleDateString()}
                                </span>
                            </div>
                            <Button 
                                onClick={() => {
                                    setSelectedProduct(product);
                                    setOrderForm(prev => ({
                                        ...prev,
                                        showroomProductId: product.id,
                                        unitPrice: product.salePrice
                                    }));
                                    setShowCreateOrderDialog(true);
                                }}
                                className="w-full bg-green-600 hover:bg-green-700"
                            >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Sell Product
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </CardContent>
    </Card>
</TabsContent>

                {/* Sales Orders Tab */}
               <TabsContent value="orders" className="space-y-6">
    <Card className="bg-white border border-gray-300 shadow-sm">
        <CardHeader className="border-b border-gray-200">
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="text-2xl font-bold text-gray-800">
                        Sales Orders
                    </CardTitle>
                    <CardDescription className="text-gray-600 mt-1">
                        Manage and track all your sales orders
                    </CardDescription>
                </div>
                <div className="relative w-96">
                    <Input 
                        type="search"
                        placeholder="Search orders by customer name, order number or status..."
                        className="pl-10 pr-4 py-2"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-5 w-5 text-gray-400" />
                    </div>
                </div>
            </div>
        </CardHeader>
        
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-gray-200">
                            <TableHead className="text-gray-800">Order #</TableHead>
                            <TableHead className="text-gray-800">Customer</TableHead>
                            <TableHead className="text-gray-800">Product</TableHead>
                            <TableHead className="text-gray-800">Quantity</TableHead>
                            <TableHead className="text-gray-800">Amount</TableHead>
                            <TableHead className="text-gray-800">Balance</TableHead>
                            <TableHead className="text-gray-800">Status</TableHead>
                            <TableHead className="text-gray-800">Payment</TableHead>
                            <TableHead className="text-gray-800">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {salesOrders.filter(order => {
                            if (!searchQuery) return true;
                            const searchLower = searchQuery.toLowerCase();
                            return (
                                order.orderNumber?.toLowerCase().includes(searchLower) ||
                                order.customerName?.toLowerCase().includes(searchLower) ||
                                order.orderStatus?.toLowerCase().includes(searchLower) ||
                                order.paymentStatus?.toLowerCase().includes(searchLower) ||
                                order.showroomProduct?.name?.toLowerCase().includes(searchLower)
                            );
                        }).map((order) => (
                            <TableRow key={order.id} className="border-gray-200">
                                <TableCell className="text-gray-800 font-medium">{order.orderNumber}</TableCell>
                                <TableCell className="text-gray-800">{order.customerName}</TableCell>
                                <TableCell className="text-gray-800">{order.showroomProduct?.name}</TableCell>
                                <TableCell className="text-gray-800">{order.quantity}</TableCell>
                                <TableCell className="text-gray-800">₹{order.finalAmount}</TableCell>
                                <TableCell className="text-gray-800">₹{Math.max(0, Number(order.balanceAmount ?? (Number(order.finalAmount||0) - Number(order.amountPaid||0))))}</TableCell>
                                <TableCell>{getStatusBadge(order.orderStatus)}</TableCell>
                                <TableCell>{getPaymentStatusBadge(order.paymentStatus)}</TableCell>
                                <TableCell>
                                    {(order.orderStatus !== 'confirmed' || 
                                      order.paymentStatus !== 'completed' || 
                                      order.paymentStatus === 'pending') && (
                                        <div className="flex items-center gap-2">
                                            {/* Show status warning for non-confirmed orders */}
                                            {order.orderStatus !== 'confirmed' && order.paymentStatus !== 'completed' && (
                                                <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-xs">
                                                    <AlertCircle className="h-3 w-3" />
                                                    <span>Awaiting Confirmation</span>
                                                </div>
                                            )}
                                            {/* Finance button: show only if payment is not completed */}
                                            {order.paymentStatus !== 'completed' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={order.orderStatus !== 'confirmed'}
                                                className={order.orderStatus !== 'confirmed' ? 'cursor-not-allowed opacity-50 bg-gray-100 hover:bg-gray-100' : ''}
                                                onClick={() => {
                                                    if (order.orderStatus !== 'confirmed') {
                                                        toast({
                                                            title: "Finance Access Blocked",
                                                            description: "Order must be confirmed before finance processing. Current status: " + (order.orderStatus || 'pending'),
                                                            variant: "destructive"
                                                        });
                                                        return;
                                                    }
                                                    setSelectedOrder(order);
                                                    const computedBalance = Math.max(0, Number(order.balanceAmount ?? (Number(order.finalAmount || 0) - Number(order.amountPaid || 0))));
                                                    const isPartial = String(order.paymentStatus) === 'partial';
                                                    const isFinanceRejected = String(order.paymentStatus) === 'finance_rejected';
                                                    setPaymentForm(prev => ({
                                                        ...prev,
                                                        totalAmount: (isPartial || isFinanceRejected) ? computedBalance : Number(order.finalAmount || 0),
                                                        receivedAmount: '',
                                                        balanceAmount: computedBalance,
                                                        paymentMethod: prev.paymentMethod || 'cash'
                                                    }));
                                                    setShowPaymentDialog(true);
                                                }}
                                                title={order.orderStatus !== 'confirmed' ? `Finance blocked - Order status: ${order.orderStatus || 'pending'}` : 'Process Payment'}
                                            >
                                                <IndianRupee className="h-3 w-3" />
                                            </Button>
                                        )}
                                        {/* Edit button: show only if payment is pending */}
                                        {order.paymentStatus === 'pending' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedOrder(order);
                                                    setIsEditingOrder(true);
                                                    // Pre-fill the order form with existing order data
                                                    setOrderForm({
                                                        customerName: order.customerName || '',
                                                        customerContact: order.customerContact || '',
                                                        customerEmail: order.customerEmail || '',
                                                        customerAddress: order.customerAddress || '',
                                                        gstNumber: order.gstNumber || '',
                                                        deliveryAddress: order.deliveryAddress || '',
                                                        sameAsBilling: order.deliveryAddress === order.customerAddress,
                                                        showroomProductId: order.showroomProductId || '',
                                                        unitPrice: order.unitPrice || '',
                                                        quantity: order.quantity || 1,
                                                        discountAmount: order.discountAmount || 0,
                                                        paymentMethod: order.paymentMethod || '',
                                                        salesPerson: order.salesPerson || '',
                                                        notes: order.notes || '',
                                                        transportCost: order.transportCost || 0,
                                                        origin: order.origin || '',
                                                        destination: order.destination || '',
                                                        distance: order.distance || '',
                                                        vehicleType: order.vehicleType || '',
                                                        totalAmount: (order.unitPrice || 0) * (order.quantity || 1) + (order.transportCost || 0),
                                                        deliveryType: order.deliveryType || 'self delivery'
                                                    });

                                                    // Pre-fill transport cost form if transport cost exists
                                                    if (order.transportCost > 0) {
                                                        setTransportCostForm({
                                                            origin: order.origin || '',
                                                            destination: order.destination || '',
                                                            distance: order.distance || '',
                                                            vehicleType: order.vehicleType || '',
                                                            distanceCost: order.distanceCost || order.transportCost || 0,
                                                            totalCost: order.transportCost || 0,
                                                            discountAmount: order.transportDiscountAmount || 0
                                                        });
                                                        setIncludeTransportCost(true);
                                                    }
                                                    setShowCreateOrderDialog(true);
                                                }}
                                                title={order.orderStatus !== 'confirmed' ? `Edit blocked - Order status: ${order.orderStatus || 'pending'}` : 'Edit Order'}
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                        )}
                                        </div>
                                    )}
                                    
                                    {/* Change Delivery Type button: show only for completed payments with self delivery, but not for delivered orders */}
                                    {order.paymentStatus === 'completed' && order.deliveryType === 'self delivery' && order.orderStatus !== 'delivered' && (
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700"
                                                onClick={() => {
                                                    setSelectedOrder(order);
                                                    setDeliveryTypeChangeForm({
                                                        deliveryType: '',
                                                        transportCost: '',
                                                        paymentType: 'paid',
                                                        reason: ''
                                                    });
                                                    setShowDeliveryTypeChangeDialog(true);
                                                }}
                                                title="Change delivery type from self to company/part load"
                                            >
                                                <Truck className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
</TabsContent>

                {/* After Sales Tab */}
                <TabsContent value="transport" className="space-y-6">
                    <Card className="border-2 border-gray-200 shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                            <CardTitle className="flex items-center gap-2">
                                <Truck className="h-5 w-5" />
                                Transport Demand Reviews
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 bg-white">
                            {rejectedTransportApprovals.length === 0 ? (
                                <div className="text-center py-8 text-gray-600">
                                    <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <p className="text-lg font-medium">No Transport Demands</p>
                                    <p className="text-sm">All transport requests have been processed</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-50">
                                                <TableHead className="text-gray-800 font-medium">Order #</TableHead>
                                                <TableHead className="text-gray-800 font-medium">Customer</TableHead>
                                                <TableHead className="text-gray-800 font-medium">Product</TableHead>
                                                <TableHead className="text-gray-800 font-medium">Delivery Type</TableHead>
                                                <TableHead className="text-gray-800 font-medium">Original Cost</TableHead>
                                                <TableHead className="text-gray-800 font-medium">Demanded Cost</TableHead>
                                                <TableHead className="text-gray-800 font-medium">Transport Notes</TableHead>
                                                <TableHead className="text-gray-800 font-medium">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {rejectedTransportApprovals.map((approval) => (
                                                <TableRow key={approval.id} className="hover:bg-gray-50">
                                                    <TableCell className="font-medium text-gray-800">{approval.orderNumber}</TableCell>
                                                    <TableCell className="text-gray-800">
                                                        <div>
                                                            <div className="font-medium">{approval.customerName}</div>
                                                            <div className="text-sm text-gray-500">{approval.customerContact}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-gray-800">{approval.productName}</TableCell>
                                                    <TableCell>
                                                        <Badge className="bg-amber-100 text-amber-800 border border-amber-300">
                                                            {approval.deliveryType}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-gray-800">₹{approval.originalTransportCost?.toFixed(2) || '0.00'}</TableCell>
                                                    <TableCell className="text-red-600 font-medium">₹{approval.demandAmount?.toFixed(2) || '0.00'}</TableCell>
                                                    <TableCell className="text-gray-600 max-w-xs truncate">{approval.transportNotes || 'No notes'}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                                onClick={() => {
                                                                    setSelectedTransportApproval(approval);
                                                                    setShowTransportDemandDialog(true);
                                                                }}
                                                            >
                                                                Review
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

               <TabsContent value="afterSales" className="space-y-6">
    <Card className="bg-white border border-gray-300 shadow-sm">
        <CardHeader className="border-b border-gray-200">
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="text-2xl font-bold text-gray-800">
                        After Sales
                    </CardTitle>
                    <CardDescription className="text-gray-600 mt-1">
                        Process completed orders and manage dispatch
                    </CardDescription>
                </div>
            </div>
        </CardHeader>
        
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="border-gray-200">
                            <TableHead className="text-gray-800">Order #</TableHead>
                            <TableHead className="text-gray-800">Customer</TableHead>
                            <TableHead className="text-gray-800">Product</TableHead>
                            <TableHead className="text-gray-800">Delivery Type</TableHead>
                            <TableHead className="text-gray-800">Status</TableHead>
                            <TableHead className="text-gray-800">Action</TableHead>
                            <TableHead className="text-gray-800">Invoice</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {salesOrders.map((order) => (
                            <TableRow key={order.id} className="border-gray-200">
                                <TableCell className="text-gray-800 font-medium">{order.orderNumber}</TableCell>
                                <TableCell className="text-gray-800">{order.customerName}</TableCell>
                                <TableCell className="text-gray-800">{order.showroomProduct?.name}</TableCell>
                                <TableCell className="text-gray-800">
                                    {order.afterSalesStatus === 'sent_to_dispatch' || order.orderStatus === 'delivered' ? (
                                        <span className="capitalize">{order.deliveryType}</span>
                                    ) : (
                                        <span className="capitalize font-medium text-blue-600">
                                            {order.deliveryType || 'self delivery'}
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {order.orderStatus === 'delivered'
                                        ? getStatusBadge('delivered')
                                        : order.afterSalesStatus === 'sent_to_dispatch'
                                            ? <Badge variant="secondary">in-dispatch</Badge>
                                            : getStatusBadge(order.orderStatus || 'pending')}
                                </TableCell>
                                <TableCell>
                                    {order.orderStatus === 'delivered' || order.afterSalesStatus === 'sent_to_dispatch' ? null : (
                                        (order.paymentStatus === 'completed' || order.financeBypass === true) ? (
                                            <Button
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-700"
                                                disabled={order.approvalStatus === 'pending'}
                                                onClick={async () => {
                                                     const deliveryType = order.deliveryType || 'self delivery';
                                                    if (!deliveryType) {
                                                        toast({ title: 'Select delivery type', variant: 'destructive' });
                                                        return;
                                                    }
                                                    if (order.paymentStatus !== 'completed' && order.financeBypass !== true) {
                                                       const message = order.paymentStatus === 'finance_rejected'
                                                            ? 'Payment rejected by finance - cannot dispatch'
                                                            : 'Complete payment before dispatch or use coupon bypass';
                                                        toast({ title: 'Payment pending', description: message, variant: 'destructive' });
                                                        return;
                                                    }
                                                    const saved = driverDetailsByOrder[order.id];
                                                    if (deliveryType === 'self delivery' && !saved) {
                                                        setSelectedOrder(order);
                                                        setDriverForm({ driverName: '', driverNumber: '', vehicleNumber: '' });
                                                       setShowDriverDetailsDialog(true);
                                                        return;
                                                    }
                                                   const payload = deliveryType === 'self delivery' ? { deliveryType, driverDetails: saved } : { deliveryType };
                                                    const res = await fetch(`${API_BASE}/sales/orders/${order.id}/dispatch`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify(payload)
                                                    });
                                                    if (res.ok) {
                                                        let updated;
                                                        try {
                                                            updated = await res.json();
                                                        } catch (_) {
                                                            updated = {};
                                                        }
                                                        const serverDeliveryType = updated?.deliveryType || updated?.dispatch?.deliveryType || deliveryType;
                                                        toast({ title: 'Sent to dispatch', description: `Order ${order.orderNumber}` });
                                                        setSalesOrders(prev => prev.map(o => o.id === order.id ? { ...o, afterSalesStatus: 'sent_to_dispatch', deliveryType: serverDeliveryType } : o))
                                                    } else {
                                                        const err = await res.json().catch(() => ({}));
                                                        toast({ title: 'Failed to send', description: err.error || 'Try again', variant: 'destructive' });
                                                    }
                                                }}
                                            >
                                                {order.approvalStatus === 'pending' ? 'Pending Admin Approval' : 
                                                 order.approvalStatus === 'approved' ? 'Send to Dispatch (Bypassed)' :
                                                 order.orderStatus === 'pending_free_delivery_approval' ? 'Pending Free Delivery Approval' :
                                                 order.financeBypass === true ? 'Send to Dispatch (Bypassed)' : 
                                                 (order.deliveryType === 'self delivery' && !driverDetailsByOrder[order.id] ? 'Add Driver Details' : 'Send to Dispatch')}
                                            </Button>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Badge variant="destructive">Payment pending</Badge>
                                                {order.approvalStatus === 'pending' ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-orange-600 text-orange-700 hover:bg-orange-50"
                                                        disabled
                                                    >
                                                        Pending Admin Approval
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-blue-600 text-blue-700 hover:bg-blue-50"
                                                       onClick={() => {
                                                            setSelectedOrder(order);
                                                            setCouponForm({
                                                                couponCode: '',
                                                                reason: '',
                                                                paymentDueDate: ''
                                                            });
                                                            setShowCouponDialog(true);
                                                        }}
                                                                                                            >
                                                        Coupon Bypass
                                                    </Button>
                                                )}
                                            </div>
                                        )
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-green-600 text-green-700 hover:bg-green-50"
                                        onClick={() => handleDownloadInvoice(order.id, order.orderNumber, order)}
                                        title="Download Proforma Invoice"
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
</TabsContent>

<TabsContent value="reminders" className="space-y-6">
    <Card className="bg-white border border-gray-300 shadow-sm">
        <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-2xl font-bold text-gray-800">Payment Reminders</CardTitle>
            <CardDescription>Orders with pending payments that need follow-up</CardDescription>
        </CardHeader>
        <CardContent>
            {paymentReminders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No payment reminders at this time</p>
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
                                        <Badge variant={reminder.status === 'overdue' ? 'destructive' : 'secondary'}>
                                            {reminder.status === 'overdue' 
                                                ? `${reminder.daysOverdue} days overdue` 
                                                : 'Due today'
                                            }
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        Customer: {reminder.customerName}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Salesperson: <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-medium">
                                            {reminder.salesPerson || 'N/A'}
                                        </span>
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Amount: ₹{reminder.finalAmount?.toLocaleString()}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Due Date: {new Date(reminder.paymentDueDate).toLocaleDateString()}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <p className="text-xs text-gray-500">
                                            Payment Status: 
                                        </p>
                                        {reminder.paymentStatus === 'pending_finance_approval' ? (
                                            <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                                                <Clock className="h-3 w-3 mr-1" />
                                                Sent to Finance for Approval
                                            </Badge>
                                        ) : reminder.paymentStatus === 'partial' ? (
                                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                                Partial Payment
                                            </Badge>
                                        ) : reminder.paymentStatus === 'pending' ? (
                                            <Badge className="bg-red-100 text-red-800 border-red-300">
                                                Payment Pending
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline">
                                                {reminder.paymentStatus}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            // Find and select the order for payment processing
                                            const order = salesOrders.find(o => o.id === reminder.orderId);
                                            if (order) {
                                                setSelectedOrder(order);
                                                
                                                // Prefill payment form with total amount from reminder
                                                const total = Number(reminder.finalAmount || 0);
                                                const paid = Number(order.amountPaid || 0);
                                                const balance = Math.max(0, total - paid);
                                                const isPartial = String(order.paymentStatus) === 'partial';
                                                const isFinanceRejected = String(order.paymentStatus) === 'finance_rejected';
                                                
                                                setPaymentForm(prev => ({
                                                    ...prev,
                                                    totalAmount: (isPartial || isFinanceRejected) ? balance : total,
                                                    balanceAmount: balance,
                                                    receivedAmount: '',
                                                    paymentMethod: 'cash',
                                                    // Reset other fields
                                                    utrNumber: '',
                                                    onlinePaymentDate: '',
                                                    onlineDetails: '',
                                                    denoms: { 2000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 },
                                                    cashTotalFromDenoms: 0,
                                                    splitCashAmount: 0,
                                                    splitOnlineAmount: 0,
                                                    handOverTo: ''
                                                }));
                                                
                                                setShowPaymentDialog(true);
                                            }
                                        }}
                                    >
                                        <IndianRupee className="h-3 w-3 mr-1" />
                                        Process Payment
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
    </Card>
</TabsContent>
            </Tabs>

            {/* Create Sales Order Dialog */}
            <Dialog open={showCreateOrderDialog} onOpenChange={setShowCreateOrderDialog}>
                <DialogContent className="bg-gray-900 border-gray-200">
                    <DialogHeader>
                        <DialogTitle>Create Sales Order</DialogTitle>
                        <DialogDescription>Create a new sales order for a showroom product</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-auto pr-2">
                        {/* Quick Delivery Type Selection */}
                        <div className="bg-gray-800/50 border border-gray-700 rounded-md p-3">
                            <label className="text-sm text-gray-300 font-medium">Delivery Type</label>
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                                <Button
                                    type="button"
                                    variant={orderForm.deliveryType === 'self delivery' ? 'default' : 'outline'}
                                    className={orderForm.deliveryType === 'self delivery' ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-600 text-gray-200'}
                                    onClick={() => {
                                        setOrderForm(prev => ({ ...prev, deliveryType: 'self delivery' }));
                                        setIncludeTransportCost(false);
                                        setOrderForm(prev => ({ ...prev, transportCost: 0, totalAmount: (parseFloat(prev.unitPrice)||0) * (prev.quantity||1) }));
                                    }}
                                >
                                    Self Delivery
                                </Button>
                                <Button
                                    type="button"
                                    variant={orderForm.deliveryType === 'company delivery' ? 'default' : 'outline'}
                                    className={orderForm.deliveryType === 'company delivery' ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-600 text-gray-200'}
                                    onClick={() => {
                                        setOrderForm(prev => ({ ...prev, deliveryType: 'company delivery' }));
                                    }}
                                >
                                    Company Delivery
                                </Button>
                                <Button
                                    type="button"
                                    variant={orderForm.deliveryType === 'part load' ? 'default' : 'outline'}
                                    className={orderForm.deliveryType === 'part load' ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-600 text-gray-200'}
                                    onClick={() => {
                                        setOrderForm(prev => ({ ...prev, deliveryType: 'part load' }));
                                        // Part load transport is external; do not include our transport cost
                                        setIncludeTransportCost(false);
                                        setOrderForm(prev => ({ ...prev, transportCost: 0, totalAmount: (parseFloat(prev.unitPrice)||0) * (prev.quantity||1) }));
                                    }}
                                >
                                    Part Load
                                </Button>
                                <Button
                                    type="button"
                                    variant={orderForm.deliveryType === 'free delivery' ? 'default' : 'outline'}
                                    className={orderForm.deliveryType === 'free delivery' ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-600 text-gray-200'}
                                    onClick={() => {
                                        setOrderForm(prev => ({ ...prev, deliveryType: 'free delivery' }));
                                        setIncludeTransportCost(false);
                                        setOrderForm(prev => ({ ...prev, transportCost: 0, totalAmount: (parseFloat(prev.unitPrice)||0) * (prev.quantity||1) }));
                                    }}
                                >
                                    Free Delivery
                                </Button>
                            </div>
                            {orderForm.deliveryType === 'company delivery' && (
                                <p className="text-xs text-gray-400 mt-2">Transport cost can be added via estimation below.</p>
                            )}
                            {orderForm.deliveryType === 'free delivery' && (
                                <p className="text-xs text-green-400 mt-2">Transport cost is not charged for free delivery.</p>
                            )}
                            {orderForm.deliveryType === 'part load' && (
                                <>
                                    <p className="text-xs text-gray-400 mt-2">LR details can be added in Transport → Partload Details after order is created.</p>
                                    <div className="mt-2">
                                        <Label htmlFor="paymentType">Payment Type *</Label>
                                        <select
                                            id="paymentType"
                                            className="bg-gray-800 border-gray-200 rounded px-2 py-1 w-full text-white"
                                            value={orderForm.paymentType}
                                            onChange={e => {
                                                const value = e.target.value;
                                                setOrderForm(prev => ({
                                                    ...prev,
                                                    paymentType: value,
                                                    transportCost: value === 'to pay' ? 0 : prev.transportCost
                                                }));
                                            }}
                                        >
                                            <option value="">Select Payment Type</option>
                                            <option value="to pay">To pay</option>
                                            <option value="paid">Paid</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="customerName">Customer Name *</Label>
                                <Input
                                    id="customerName"
                                    value={orderForm.customerName}
                                    onChange={(e) => setOrderForm(prev => ({ ...prev, customerName: e.target.value }))}
                                    className="bg-gray-800 border-gray-200"
                                />
                            </div>
                            <div>
                                <Label htmlFor="customerContact">Contact</Label>
                                <Input
                                    id="customerContact"
                                    type = "number"
                                    value={orderForm.customerContact}
                                    onChange={(e) => setOrderForm(prev => ({ ...prev, customerContact: e.target.value }))}
                                    className="bg-gray-800 border-gray-200"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="customerEmail">Email</Label>
                            <Input
                                id="customerEmail"
                                type="email"
                                value={orderForm.customerEmail}
                                onChange={(e) => setOrderForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                                className="bg-gray-800 border-gray-200"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="totalAmount">Total Amount</Label>
                                <Input
                                    id="totalAmount"
                                    type="number"
                                    value={orderForm.totalAmount}
                                    readOnly
                                    className="bg-gray-700 border-gray-200 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <Label htmlFor="unitPrice">Unit Price *</Label>
                                <Input
                                    id="unitPrice"
                                    type="number"
                                    value={orderForm.unitPrice}
                                    onChange={(e) => {
                                        const unitPrice = parseFloat(e.target.value) || 0;
                                        const quantity = orderForm.quantity || 1;
                                        let transportCost = includeTransportCost ? (orderForm.transportCost || 0) : 0;
                                        // If part load and to pay, transport cost is 0
                                        if (orderForm.deliveryType === 'part load' && orderForm.paymentType === 'to pay') {
                                            transportCost = 0;
                                        }
                                        const totalAmount = (unitPrice * quantity) + transportCost;
                                        setOrderForm(prev => ({ 
                                            ...prev, 
                                            unitPrice: e.target.value,
                                            totalAmount: totalAmount,
                                            transportCost: transportCost
                                        }));
                                    }}
                                    className="bg-gray-800 border-gray-200"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="quantity">Quantity</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    value={orderForm.quantity}
                                    onChange={(e) => {
                                        const quantity = parseInt(e.target.value) || 1;
                                        const unitPrice = parseFloat(orderForm.unitPrice) || 0;
                                        const transportCost = includeTransportCost ? (orderForm.transportCost || 0) : 0;
                                        const totalAmount = (unitPrice * quantity) + transportCost;
                                        setOrderForm(prev => ({ 
                                            ...prev, 
                                            quantity: quantity,
                                            totalAmount: totalAmount
                                        }));
                                    }}
                                    className="bg-gray-800 border-gray-200"
                                />
                            </div>
                            <div>
                                <Label htmlFor="discountAmount">Discount Amount</Label>
                                <Input
                                    id="discountAmount"
                                    type="number"
                                    value={orderForm.discountAmount}
                                    onChange={(e) => setOrderForm(prev => ({ ...prev, discountAmount: parseFloat(e.target.value) || 0 }))}
                                    className="bg-gray-800 border-gray-200 "
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="salesPerson">Sales Person *</Label>
                                <Input
                                    id="salesPerson"
                                    value={orderForm.salesPerson}
                                    readOnly
                                    disabled
                                    className="bg-gray-700 border-gray-200 cursor-not-allowed opacity-75"
                                    title="Automatically set to your email"
                                />
                            </div>
                            <div className="flex items-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowTransportCostDialog(true)}
                                    className={`w-full bg-gray-700 border-gray-200 hover:bg-gray-600 ${orderForm.deliveryType === 'part load' && orderForm.paymentType === 'to pay' ? 'cursor-not-allowed opacity-60' : ''}`}
                                    disabled={orderForm.deliveryType === 'part load' && orderForm.paymentType !== 'paid'}
                                >
                                    Check Transport Estimation Cost
                                </Button>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="customerAddress">Billing Address</Label>
                            <Textarea
                                id="customerAddress"
                                value={orderForm.customerAddress}
                                onChange={(e) => setOrderForm(prev => ({ ...prev, customerAddress: e.target.value, deliveryAddress: prev.sameAsBilling ? e.target.value : prev.deliveryAddress }))}
                                className="bg-gray-800 border-gray-200"
                            />
                        </div>
                        <div>
                            <Label htmlFor="gstNumber">GST No.</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="gstNumber"
                                    value={orderForm.gstNumber}
                                    onChange={(e) => {
                                        setOrderForm(prev => ({ ...prev, gstNumber: e.target.value }));
                                        // Reset verification status when GST number changes
                                        if (gstVerification.lastVerifiedGst !== e.target.value) {
                                            setGstVerification(prev => ({
                                                ...prev,
                                                isVerified: false,
                                                verificationResult: null,
                                                lastVerifiedGst: null
                                            }));
                                        }
                                    }}
                                    className="bg-gray-800 border-gray-200 flex-1"
                                    placeholder="Enter GST number"
                                />
                                <Button
                                    type="button"
                                    onClick={handleVerifyGST}
                                    disabled={gstVerification.isVerifying || !orderForm.gstNumber.trim()}
                                    className={`px-4 ${
                                        gstVerification.isVerified && gstVerification.lastVerifiedGst === orderForm.gstNumber
                                            ? 'bg-green-600 hover:bg-green-700'
                                            : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                >
                                    {gstVerification.isVerifying ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Verifying...
                                        </div>
                                    ) : gstVerification.isVerified && gstVerification.lastVerifiedGst === orderForm.gstNumber ? (
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4" />
                                            Verified
                                        </div>
                                    ) : (
                                        'Verify GST'
                                    )}
                                </Button>
                            </div>
                            {gstVerification.verificationResult && gstVerification.lastVerifiedGst === orderForm.gstNumber && (
                                <div className={`mt-2 p-2 rounded text-sm ${
                                    gstVerification.isVerified 
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        {gstVerification.isVerified ? (
                                            <CheckCircle className="w-4 h-4" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4" />
                                        )}
                                        <span className="font-medium">
                                            {gstVerification.isVerified ? 'Verified' : 'Not Verified'}
                                        </span>
                                    </div>
                                    <p className="mt-1">{gstVerification.verificationResult.message}</p>
                                    {gstVerification.verificationResult.details?.businessName && (
                                        <p className="mt-1 text-xs">
                                            Business: {gstVerification.verificationResult.details.businessName}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    id="sameAsBilling"
                                    type="checkbox"
                                    checked={orderForm.sameAsBilling}
                                    onChange={(e) => setOrderForm(prev => ({ ...prev, sameAsBilling: e.target.checked, deliveryAddress: e.target.checked ? prev.customerAddress : prev.deliveryAddress }))}
                                />
                                <Label htmlFor="sameAsBilling">Delivery Address same as Billing Address</Label>
                            </div>
                            <Label htmlFor="deliveryAddress">Delivery Address</Label>
                            <Textarea
                                id="deliveryAddress"
                                value={orderForm.deliveryAddress}
                                onChange={(e) => setOrderForm(prev => ({ ...prev, deliveryAddress: e.target.value, sameAsBilling: false }))}
                                className="bg-gray-800 border-gray-200"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowCreateOrderDialog(false);
                            setIsEditingOrder(false);
                            setSelectedOrder(null);
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateOrder} className="bg-blue-600 hover:bg-blue-700">
                            {isEditingOrder ? 'Update Order' : 'Create Order'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment Dialog */}
            <Dialog open={showPaymentDialog} onOpenChange={(open)=>{
                setShowPaymentDialog(open);
                if (open && selectedOrder) {
                    const total = Number(selectedOrder.finalAmount || 0);
                    const paid = Number(selectedOrder.amountPaid || 0);
                    const balance = Math.max(0, total - paid);
                    const isPartial = String(selectedOrder.paymentStatus) === 'partial';
                    const isFinanceRejected = String(selectedOrder.paymentStatus) === 'finance_rejected';
                    setPaymentForm(prev => ({
                        ...prev,
                        totalAmount: (isPartial || isFinanceRejected) ? balance : total,
                        balanceAmount: balance
                    }));
                }
            }}>
                <DialogContent className="bg-gray-900 border-gray-200 w-full max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Process Payment</DialogTitle>
                        <DialogDescription>
                           Process payment for order: {selectedOrder?.orderNumber}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[70vh] overflow-auto pr-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="totalAmount">Total Amount</Label>
                                <Input
                                    id="totalAmount"
                                    type="number"
                                    value={paymentForm.totalAmount}
                                    onChange={(e)=>{
                                        const total = Number(e.target.value || 0);
                                        const balance = total - Number(paymentForm.receivedAmount || 0);
                                        setPaymentForm(prev=>({ ...prev, totalAmount: total, balanceAmount: balance }))
                                    }}
                                    className="bg-gray-800 border-gray-200"
                                />
                            </div>
                            <div>
                                <Label htmlFor="paymentAmount">Received Amount *</Label>
                                <Input
                                    id="paymentAmount"
                                    type="number"
                                    value={paymentForm.receivedAmount === 0 ? '' : paymentForm.receivedAmount}
                                    onChange={(e) => {
                                        const received = e.target.value === '' ? '' : Number(e.target.value || 0);
                                        const balance = Number(paymentForm.totalAmount || 0) - Number(received || 0);
                                        setPaymentForm(prev => ({ ...prev, receivedAmount: received, balanceAmount: balance }));
                                    }}
                                    className="bg-gray-800 border-gray-200"
                                />
                            </div>
                            <div>
                                <Label htmlFor="balanceAmount">Balance Amount</Label>
                                <Input
                                    id="balanceAmount"
                                    type="number"
                                    disabled
                                    value={paymentForm.balanceAmount}
                                    className="bg-gray-800 border-gray-200"
                                />
                            </div>
                            <div>
                                <Label htmlFor="paymentMethod">Payment Method *</Label>
                                <NativeSelect
                                  value={paymentForm.paymentMethod || 'cash'}
                                  onChange={(value) => {
                                    const v = typeof value === 'string' ? value : (value?.target?.value || 'cash');
                                    setPaymentForm(prev => ({ ...prev, paymentMethod: v }));
                                  }}
                                  className="bg-gray-800 border-gray-200"
                                >
                                  <option value="cash">Cash</option>
                                  <option value="online">Online</option>
                                  <option value="split">Split (Cash + Online)</option>
                                </NativeSelect>
                            </div>
                        </div>
                        {paymentForm.paymentMethod === 'online' && (
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor="utr">UTR Number </Label>
                              <Input id="utr" value={paymentForm.utrNumber} onChange={(e)=> setPaymentForm(prev=>({ ...prev, utrNumber: e.target.value }))} className="bg-gray-800 border-gray-200" />
                            </div>
                            <div>
                              <Label htmlFor="onlineDate">Online Payment Date</Label>
                              <Input id="onlineDate" type="date" value={paymentForm.onlinePaymentDate} onChange={(e)=> setPaymentForm(prev=>({ ...prev, onlinePaymentDate: e.target.value }))} className="bg-gray-800 border-gray-200" />
                            </div>
                            <div>
                              <Label htmlFor="onlineDetails">Other Details</Label>
                              <Textarea id="onlineDetails" value={paymentForm.onlineDetails} onChange={(e)=> setPaymentForm(prev=>({ ...prev, onlineDetails: e.target.value }))} className="bg-gray-800 border-gray-200" />
                            </div>
                          </div>
                        )}
                        {paymentForm.paymentMethod === 'cash' && (
                          <div className="space-y-3">
                            <div className="font-semibold">Cash Denominations</div>
                            <div className="grid grid-cols-3 gap-3">
                              {Object.keys(paymentForm.denoms).map((note)=> (
                                <div key={note} className="space-y-1">
                                  <Label>₹{note}</Label>
                                  <Input type="number" min="0" value={paymentForm.denoms[note]} onChange={(e)=>{
                                    const qty = Math.max(0, parseInt(e.target.value || 0));
                                    setPaymentForm(prev=>{
                                      const denoms = { ...prev.denoms, [note]: qty };
                                      const total = Object.entries(denoms).reduce((sum, [n,q]) => sum + (Number(n)*Number(q||0)), 0);
                                      return { ...prev, denoms, cashTotalFromDenoms: total };
                                    })
                                  }} className="bg-gray-800 border-gray-200" />
                                </div>
                              ))}
                            </div>
                            <div className={`text-sm ${paymentForm.cashTotalFromDenoms === Number(paymentForm.receivedAmount || 0) ? 'text-green-500' : 'text-red-500'}`}>
                              Total Cash (from denoms): ₹{paymentForm.cashTotalFromDenoms}
                            </div>
                          </div>
                        )}
                        {paymentForm.paymentMethod === 'split' && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor="splitCash">Cash Amount</Label>
                                <Input id="splitCash" type="number" value={paymentForm.splitCashAmount} onChange={(e)=> setPaymentForm(prev=>({ ...prev, splitCashAmount: Number(e.target.value||0) }))} className="bg-gray-800 border-gray-200" />
                              </div>
                              <div>
                                <Label htmlFor="splitOnline">Online Amount</Label>
                                <Input id="splitOnline" type="number" value={paymentForm.splitOnlineAmount} onChange={(e)=> setPaymentForm(prev=>({ ...prev, splitOnlineAmount: Number(e.target.value||0) }))} className="bg-gray-800 border-gray-200" />
                              </div>
                            </div>
                            <div className="text-sm text-gray-200">Split total: ₹{Number(paymentForm.splitCashAmount||0)+Number(paymentForm.splitOnlineAmount||0)}</div>
                            <div className="font-semibold">Cash Denominations</div>
                            <div className="grid grid-cols-3 gap-3">
                              {Object.keys(paymentForm.denoms).map((note)=> (
                                <div key={note} className="space-y-1">
                                  <Label>₹{note}</Label>
                                  <Input type="number" min="0" value={paymentForm.denoms[note]} onChange={(e)=>{
                                    const qty = Math.max(0, parseInt(e.target.value || 0));
                                    setPaymentForm(prev=>{
                                      const denoms = { ...prev.denoms, [note]: qty };
                                      const total = Object.entries(denoms).reduce((sum, [n,q]) => sum + (Number(n)*Number(q||0)), 0);
                                      return { ...prev, denoms, cashTotalFromDenoms: total };
                                    })
                                  }} className="bg-gray-800 border-gray-200" />
                                </div>
                              ))}
                            </div>
                            <div className={`text-sm ${paymentForm.cashTotalFromDenoms === Number(paymentForm.splitCashAmount || 0) ? 'text-green-500' : 'text-red-500'}`}>
                              Total Cash (from denoms): ₹{paymentForm.cashTotalFromDenoms}
                            </div>
                            <div>
                              <Label htmlFor="utrSplit">UTR Number (Online)</Label>
                              <Input id="utrSplit" value={paymentForm.utrNumber} onChange={(e)=> setPaymentForm(prev=>({ ...prev, utrNumber: e.target.value }))} className="bg-gray-800 border-gray-200 " />
                            </div>
                            <div>
                              <Label htmlFor="onlineDateSplit">Online Payment Date</Label>
                              <Input id="onlineDateSplit" type="date" value={paymentForm.onlinePaymentDate} onChange={(e)=> setPaymentForm(prev=>({ ...prev, onlinePaymentDate: e.target.value }))} className="bg-gray-800 border-gray-200" />
                            </div>
                          </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleProcessPayment} className="bg-green-600 hover:bg-green-700">
                            Process Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Driver Details Dialog for Self Delivery */}
            <Dialog open={showDriverDetailsDialog} onOpenChange={setShowDriverDetailsDialog}>
                <DialogContent className="bg-gray-900 border-gray-200 max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Driver Details</DialogTitle>
                        <DialogDescription>Provide driver information for self delivery</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label htmlFor="driverName">Driver Name *</Label>
                            <Input id="driverName" value={driverForm.driverName} onChange={(e)=> setDriverForm(prev=>({ ...prev, driverName: e.target.value }))} className="bg-gray-800 border-gray-200" />
                        </div>
                        <div>
                            <Label htmlFor="driverNumber">Driver Number *</Label>
                            <Input id="driverNumber"  type="number" value={driverForm.driverNumber} onChange={(e)=> setDriverForm(prev=>({ ...prev, driverNumber: e.target.value }))} className="bg-gray-800 border-gray-200" />
                        </div>
                        <div>
                            <Label htmlFor="vehicleNumber">Vehicle Number * </Label>
                            <Input id="vehicleNumber" value={driverForm.vehicleNumber} onChange={(e)=> setDriverForm(prev=>({ ...prev, vehicleNumber: e.target.value }))} className="bg-gray-800 border-gray-200" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={()=> setShowDriverDetailsDialog(false)}>Cancel</Button>
                        <Button onClick={async ()=>{
                            // Validate
                            if (!driverForm.driverName.trim() || !driverForm.driverNumber.trim() || !driverForm.vehicleNumber.trim()) {
                                toast({ title: 'All fields required', variant: 'destructive' });
                                return;
                            }
                            const order = selectedOrder;
                            if (!order) { setShowDriverDetailsDialog(false); return; }
                            // Save in local state
                            setDriverDetailsByOrder(prev=> ({ ...prev, [order.id]: { ...driverForm } }));
                            setShowDriverDetailsDialog(false);
                            // Proceed to dispatch immediately
                            try {
                                                            const payload = { deliveryType: 'self delivery', driverDetails: { ...driverForm } };
                                                            const res = await fetch(`${API_BASE}/sales/orders/${order.id}/dispatch`, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify(payload)
                                                            });
                                                            if (res.ok) {
                                                                let updated = await res.json().catch(()=>({}));
                                                                const serverDeliveryType = updated?.deliveryType || updated?.dispatch?.deliveryType || 'self delivery';
                                                                toast({ title: 'Sent to dispatch', description: `Order ${order.orderNumber}` });
                                                                setSalesOrders(prev => prev.map(o => o.id === order.id ? { ...o, afterSalesStatus: 'sent_to_dispatch', deliveryType: serverDeliveryType } : o));
                                                            } else {
                                                                const err = await res.json().catch(()=>({}));
                                                                toast({ title: 'Failed to send', description: err.error || 'Try again', variant: 'destructive' });
                                                            }
                                                        } catch (e) {
                                                            toast({ title: 'Failed to send', description: 'Network error', variant: 'destructive' });
                                                        }
                                                    }} className="bg-blue-600 hover:bg-blue-700">Proceed</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

           {/* Transport Demand Review Dialog */}
            <Dialog open={showTransportDemandDialog} onOpenChange={setShowTransportDemandDialog}>
                <DialogContent className="max-w-2xl bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-gray-800">Review Transport Demand</DialogTitle>
                        <p className="text-gray-600">
                            Transport department has rejected the original cost and provided a demand amount.
                        </p>
                    </DialogHeader>
                    {selectedTransportApproval && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <span className="text-sm text-gray-600">Order Number:</span>
                                    <p className="font-medium text-gray-800">{selectedTransportApproval.orderNumber}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Customer:</span>
                                    <p className="font-medium text-gray-800">{selectedTransportApproval.customerName}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Delivery Type:</span>
                                    <p className="font-medium text-gray-800">{selectedTransportApproval.deliveryType}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-gray-600">Product:</span>
                                    <p className="font-medium text-gray-800">{selectedTransportApproval.productName}</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 border border-blue-200 rounded-lg">
                                    <h4 className="font-medium text-blue-800 mb-2">Original Transport Cost</h4>
                                    <p className="text-2xl font-bold text-blue-600">₹{selectedTransportApproval.originalTransportCost?.toFixed(2) || '0.00'}</p>
                                </div>
                                <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                                    <h4 className="font-medium text-red-800 mb-2">Transport Demand</h4>
                                    <p className="text-2xl font-bold text-red-600">₹{selectedTransportApproval.demandAmount?.toFixed(2) || '0.00'}</p>
                                </div>
                            </div>
                            
                            {selectedTransportApproval.transportNotes && (
                                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <h4 className="font-medium text-yellow-800 mb-2">Transport Notes</h4>
                                    <p className="text-gray-700">{selectedTransportApproval.transportNotes}</p>
                                </div>
                            )}
                            
                            <div className="flex gap-3 pt-4">
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleConfirmTransportDemand(selectedTransportApproval.id, 'accept_demand')}
                                >
                                    Accept Demand Amount
                                </Button>
                                <Button
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => {
                                        setCustomerNegotiationDialog(true);
                                    }}
                                >
                                    Confirm with Customer
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowTransportDemandDialog(false);
                                        setSelectedTransportApproval(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>


            {/* Transport Cost Estimation Dialog */}
            <Dialog open={showTransportCostDialog} onOpenChange={(open) => {
                if (!open && !isEditingOrder) {
                    // Reset form when closing if not editing an order
                    setTransportCostForm({
                        origin: '',
                        destination: '',
                        distance: '',
                        vehicleType: '',
                        distanceCost: 0,
                        totalCost: 0,
                        discountAmount: 0
                    });
                    setIncludeTransportCost(false);
                }
                setShowTransportCostDialog(open);
            }}>
                <DialogContent 
                    className="bg-gray-900 border-gray-200 max-w-lg max-h-[90vh] overflow-y-auto"
                    style={{ zIndex: showDeliveryTypeChangeDialog ? 1100 : 900 }}
                >
                    <DialogHeader>
                        <DialogTitle>Transport Cost Estimation</DialogTitle>
                        <DialogDescription>
                            Calculate transport costs for delivery
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="origin" className="text-sm">Origin</Label>
                                <Input
                                    id="origin"
                                    value={transportCostForm.origin}
                                    onChange={(e) => setTransportCostForm(prev => ({ ...prev, origin: e.target.value }))}
                                    placeholder="Pickup location"
                                    className="bg-gray-800 border-gray-200 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="destination" className="text-sm">Destination</Label>
                                <Input
                                    id="destination"
                                    value={transportCostForm.destination}
                                    onChange={(e) => setTransportCostForm(prev => ({ ...prev, destination: e.target.value }))}
                                    placeholder="Delivery location"
                                    className="bg-gray-800 border-gray-200 text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label htmlFor="distance" className="text-sm">Distance (km)</Label>
                                <Input
                                    id="distance"
                                    type="number"
                                    value={transportCostForm.distance}
                                    onChange={(e) => setTransportCostForm(prev => ({ ...prev, distance: e.target.value }))}
                                    placeholder="km"
                                    className="bg-gray-800 border-gray-200  text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="discountAmount" className="text-sm">Discount Amount (₹)</Label>
                                <Input
                                    id="discountAmount"
                                    type="number"
                                    value={transportCostForm.discountAmount}
                                    onChange={(e) => setTransportCostForm(prev => ({ ...prev, discountAmount: e.target.value }))}
                                    placeholder="Enter discount"
                                    className="bg-gray-800 border-gray-200 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="vehicle-type" className="text-sm">Vehicle Type</Label>
                                <NativeSelect
                                    value={transportCostForm.vehicleType}
                                    onChange={(value) => {
                                        const v = typeof value === 'string' ? value : value?.target?.value;
                                        setTransportCostForm(prev => ({ ...prev, vehicleType: v }));
                                    }}
                                    className="bg-gray-800 border-gray-200 text-sm"
                                >
                                    <option value="">Select</option>
                                    <option value="truck">Truck (₹20/km)</option>
                                    <option value="van">Van (₹14/km)</option>
                                    <option value="motorcycle">Motorcycle (₹10/km)</option>
                                    <option value="pickup">Pickup (₹7/km)</option>
                                </NativeSelect>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={() => {
                                    const vehicleRates = {
                                        truck: 20,
                                        van: 14,
                                        motorcycle: 10,
                                        pickup: 7
                                    };

                                    const distance = parseFloat(transportCostForm.distance) || 0;
                                    const vehicleRate = vehicleRates[transportCostForm.vehicleType] || 0;

                                    const distanceCost = distance * vehicleRate;
                                    const preDiscountTotal = distanceCost; // Only distance * vehicle rate
                                    const discount = parseFloat(transportCostForm.discountAmount) || 0;
                                    const totalCost = Math.max(preDiscountTotal - discount, 0);

                                    setTransportCostForm(prev => ({
                                        ...prev,
                                        distanceCost,
                                        totalCost
                                    }));
                                }}
                            >
                                Calculate Cost
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-gray-700 border-gray-200 hover:bg-gray-600"
                                onClick={() => {
                                    setTransportCostForm({
                                        origin: '',
                                        destination: '',
                                        distance: '',
                                        weight: '',
                                        vehicleType: '',
                                        baseCost: 0,
                                        distanceCost: 0,
                                        weightCost: 0,
                                        fuelSurcharge: 0,
                                        totalCost: 0
                                    });
                                }}
                            >
                                Reset
                            </Button>
                        </div>

                        <Card className="bg-gray-800 border-gray-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">Cost Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Distance Cost (Distance × Vehicle Rate):</span>
                                        <span className="font-medium">₹{transportCostForm.distanceCost.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Discount:</span>
                                        <span className="font-medium">- ₹{(parseFloat(transportCostForm.discountAmount) || 0).toFixed(2)}</span>
                                    </div>
                                    <hr className="my-2 border-gray-200" />
                                    <div className="flex justify-between text-base font-semibold">
                                        <span>Total Cost:</span>
                                        <span>₹{transportCostForm.totalCost.toFixed(2)}</span>
                                    </div>
                                </div>

                                {transportCostForm.totalCost > 0 && selectedOrder?.paymentStatus !== 'completed' && (
                                    <div className="mt-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <input
                                                id="includeTransport"
                                                type="checkbox"
                                                checked={includeTransportCost}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setIncludeTransportCost(checked);
                                                }}
                                                className="rounded"
                                            />
                                            <Label htmlFor="includeTransport" className="text-sm">
                                                Add to order total
                                            </Label>
                                        </div>
                                        <Button
                                            className="w-full"
                                            onClick={() => {
                                                const unitPrice = parseFloat(orderForm.unitPrice) || 0;
                                                const quantity = orderForm.quantity || 1;
                                                let newTotalAmount = unitPrice * quantity;

                                                if (includeTransportCost) {
                                                    newTotalAmount += transportCostForm.totalCost;
                                                    setOrderForm(prev => ({
                                                        ...prev,
                                                        transportCost: transportCostForm.totalCost,
                                                        origin: transportCostForm.origin,
                                                        destination: transportCostForm.destination,
                                                        distance: transportCostForm.distance,
                                                        vehicleType: transportCostForm.vehicleType,
                                                        discountAmount: (parseFloat(prev.discountAmount) || 0),
                                                        totalAmount: Math.max(newTotalAmount - (parseFloat(prev.discountAmount) || 0), 0)
                                                    }));
                                                    toast({
                                                        title: "Added to total",
                                                        description: `₹${transportCostForm.totalCost.toFixed(2)} added to order total`
                                                    });
                                                } else {
                                                    setOrderForm(prev => ({
                                                        ...prev,
                                                        transportCost: 0,
                                                        totalAmount: newTotalAmount
                                                    }));
                                                    toast({
                                                        title: "Estimation only",
                                                        description: `₹${transportCostForm.totalCost.toFixed(2)} calculated (not added to order)`
                                                    });
                                                }
                                                // setIncludeTransportCost(includeTransportCost);
                                                setShowTransportCostDialog(false);
                                            }}
                                        >
                                            Proceed
                                        </Button>
                                    </div>
                                )}
                                
                                {/* Show calculated cost info when in delivery type change mode */}
                                {transportCostForm.totalCost > 0 && selectedOrder?.paymentStatus === 'completed' && (
                                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="text-sm text-green-800 font-medium">
                                            Calculated Transport Cost: ₹{transportCostForm.totalCost}
                                        </p>
                                        <p className="text-xs text-green-600 mt-1">
                                            Click "Use This Cost" below to apply this amount to the delivery type change.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowTransportCostDialog(false)}
                            className="bg-gray-700 border-gray-200 hover:bg-gray-600"
                        >
                            Close
                        </Button>
                        {/* Show "Use This Cost" button only when we have a selected order for delivery type change */}
                        {selectedOrder && selectedOrder.paymentStatus === 'completed' && selectedOrder.deliveryType === 'self delivery' && (
                            <Button
                                onClick={() => {
                                    // Simply use the calculated transport cost in delivery type change form
                                    setDeliveryTypeChangeForm(prev => ({
                                        ...prev,
                                        transportCost: transportCostForm.totalCost.toString()
                                    }));
                                    setShowTransportCostDialog(false);
                                    // Reopen delivery type change dialog
                                    setShowDeliveryTypeChangeDialog(true);
                                    toast({
                                        title: 'Transport Cost Applied',
                                        description: `Transport cost of ₹${transportCostForm.totalCost} has been applied to the delivery type change.`,
                                        variant: 'default'
                                    });
                                }}
                                className="bg-green-600 hover:bg-green-700"
                                disabled={!transportCostForm.totalCost || transportCostForm.totalCost <= 0}
                            >
                                Use This Cost (₹{transportCostForm.totalCost})
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Customer Negotiation Dialog */}
            <Dialog open={customerNegotiationDialog} onOpenChange={setCustomerNegotiationDialog}>
                <DialogContent className="max-w-md bg-white max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-gray-800 text-lg">Customer Negotiation</DialogTitle>
                        <p className="text-gray-600 text-sm">
                            Transport has demanded ₹{selectedTransportApproval?.demandAmount?.toLocaleString()} for this order.
                        </p>
                    </DialogHeader>
                    {selectedTransportApproval && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-xs text-gray-600">Order Number:</span>
                                        <p className="font-medium text-gray-800 text-sm truncate">{selectedTransportApproval.orderNumber}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-600">Customer:</span>
                                        <p className="font-medium text-gray-800 text-sm truncate">{selectedTransportApproval.customerName}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-xs text-gray-600">Original Transport Cost:</span>
                                        <p className="font-medium text-red-600 text-sm">₹{selectedTransportApproval.originalTransportCost?.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-600">Transport Demand:</span>
                                        <p className="font-bold text-orange-600 text-sm">₹{selectedTransportApproval.demandAmount?.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900 text-sm">Customer Response:</h4>
                                <div className="space-y-2">
                                    <div className="flex items-start space-x-2">
                                        <input
                                            type="radio"
                                            id="accept"
                                            name="customerResponse"
                                            value="accept"
                                            checked={negotiationForm.customerResponse === 'accept'}
                                            onChange={(e) => setNegotiationForm({...negotiationForm, customerResponse: e.target.value})}
                                            className="text-green-600 mt-1"
                                        />
                                        <label htmlFor="accept" className="text-gray-700 font-medium text-sm leading-tight">
                                            Customer accepts the demand amount (₹{selectedTransportApproval.demandAmount?.toLocaleString()})
                                        </label>
                                    </div>
                                    <div className="flex items-start space-x-2">
                                        <input
                                            type="radio"
                                            id="reject"
                                            name="customerResponse"
                                            value="reject"
                                            checked={negotiationForm.customerResponse === 'reject'}
                                            onChange={(e) => setNegotiationForm({...negotiationForm, customerResponse: e.target.value})}
                                            className="text-red-600 mt-1"
                                        />
                                        <label htmlFor="reject" className="text-gray-700 font-medium text-sm leading-tight">
                                            Customer rejects and wants to negotiate
                                        </label>
                                    </div>
                                </div>
                                
                                {negotiationForm.customerResponse === 'reject' && (
                                    <div className="mt-3 space-y-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                        <div className="space-y-1">
                                            <Label htmlFor="negotiated_amount" className="text-gray-700 font-medium text-sm">
                                                Customer's Counter Offer (₹)
                                            </Label>
                                            <Input
                                                id="negotiated_amount"
                                                type="number"
                                                value={negotiationForm.negotiatedAmount}
                                                onChange={(e) => setNegotiationForm({...negotiationForm, negotiatedAmount: e.target.value})}
                                                placeholder="Enter amount"
                                                className="border-gray-300 text-sm"
                                            />
                                        </div>
                                        
                                        <div className="space-y-1">
                                            <Label htmlFor="customer_notes" className="text-gray-700 font-medium text-sm">
                                                Customer's Reason/Notes
                                            </Label>
                                            <Textarea
                                                id="customer_notes"
                                                value={negotiationForm.customerNotes}
                                                onChange={(e) => setNegotiationForm({...negotiationForm, customerNotes: e.target.value})}
                                                placeholder="Why customer is offering this amount..."
                                                rows={2}
                                                className="border-gray-300 text-sm resize-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex flex-col gap-2 pt-2">
                                {negotiationForm.customerResponse === 'accept' && (
                                    <Button
                                        className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2"
                                        onClick={() => {
                                            handleConfirmTransportDemand(selectedTransportApproval.id, 'accept_demand');
                                            setCustomerNegotiationDialog(false);
                                            setNegotiationForm({ customerResponse: '', negotiatedAmount: '', customerNotes: '' });
                                        }}
                                    >
                                        Confirm Acceptance
                                    </Button>
                                )}
                                
                                {negotiationForm.customerResponse === 'reject' && (
                                    <Button
                                        className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm py-2"
                                        onClick={handleSendBackToTransport}
                                        disabled={!negotiationForm.negotiatedAmount || !negotiationForm.customerNotes}
                                    >
                                        Send to Transport for Verification
                                    </Button>
                                )}
                                
                                <Button
                                    variant="outline"
                                    className="w-full text-sm py-2"
                                    onClick={() => {
                                        setCustomerNegotiationDialog(false);
                                        setNegotiationForm({ customerResponse: '', negotiatedAmount: '', customerNotes: '' });
                                    }}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
            {/* My Performance Modal Dialog */}
            <Dialog open={showPerformanceModal} onOpenChange={setShowPerformanceModal}>
                <DialogContent className="max-w-5xl max-h-[90vh] bg-white overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-gray-800">My Sales Performance</DialogTitle>
                        <button
                            onClick={() => setShowPerformanceModal(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </DialogHeader>
                    <div className="mt-4">
                        <SalesPerformanceDashboard 
                            salesPerson={user?.fullName} 
                            isAdmin={false} 
                        />
                    </div>
                </DialogContent>
            </Dialog>
            {/* Guest Dialog */}
                <GuestDialog 
                open={showGuestDialog} 
                onOpenChange={setShowGuestDialog}
                onSuccess={() => fetchData()} // Optional: refresh data after guest is added
                />
                {/* Coupon Bypass Dialog */}
<Dialog open={showCouponDialog} onOpenChange={setShowCouponDialog}>
    <DialogContent className="max-w-md">
        <DialogHeader>
            <DialogTitle>Apply Coupon Bypass</DialogTitle>
            <DialogDescription>
                Enter coupon details and expected payment date for order {selectedOrder?.orderNumber}
            </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
            <div>
                <Label htmlFor="couponCode">Coupon Code *</Label>
                <Input
                    id="couponCode"
                    value={couponForm.couponCode}
                    onChange={(e) => setCouponForm(prev => ({...prev, couponCode: e.target.value}))}
                    placeholder="Enter coupon code"
                    className="mt-1"
                />
            </div>
            <div>
                <Label htmlFor="reason">Reason for Bypass *</Label>
                <Textarea
                    id="reason"
                    value={couponForm.reason}
                    onChange={(e) => setCouponForm(prev => ({...prev, reason: e.target.value}))}
                    placeholder="Enter reason for finance bypass"
                    className="mt-1"
                    rows={3}
                />
            </div>
            <div>
                <Label htmlFor="paymentDueDate">Expected Payment Date *</Label>
                <Input
                    id="paymentDueDate"
                    type="date"
                    value={couponForm.paymentDueDate}
                    onChange={(e) => setCouponForm(prev => ({...prev, paymentDueDate: e.target.value}))}
                    min={new Date().toISOString().split('T')[0]}
                    className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                    You will receive reminders if payment is not received by this date
                </p>
            </div>
        </div>
        <DialogFooter>
            <Button 
                variant="outline" 
                onClick={() => setShowCouponDialog(false)}
            >
                Cancel
            </Button>
            <Button onClick={handleCouponSubmit}>
                Apply Coupon
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>

{/* Delivery Type Change Dialog */}
<Dialog open={showDeliveryTypeChangeDialog} onOpenChange={setShowDeliveryTypeChangeDialog}>
    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" style={{ zIndex: 1000 }}>
        <DialogHeader>
            <DialogTitle>Change Delivery Type</DialogTitle>
            <DialogDescription>
                Change delivery type for completed payment order: {selectedOrder?.orderNumber}
                <br />
                <span className="text-orange-600 font-medium">
                    Additional transport cost will be added and payment status will change to partial.
                </span>
            </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
            <div>
                <Label htmlFor="deliveryType">New Delivery Type</Label>
                <Select 
                    value={deliveryTypeChangeForm.deliveryType} 
                    onValueChange={(value) => {
                        setDeliveryTypeChangeForm(prev => ({
                            ...prev, 
                            deliveryType: value,
                            // Reset transport cost when delivery type changes
                            transportCost: '',
                            // Reset payment type to default when changing delivery type
                            paymentType: 'paid'
                        }));
                    }}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select delivery type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="company delivery">Company Delivery</SelectItem>
                        <SelectItem value="part load">Part Load</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            {/* Payment Type - Only show for part load */}
            {deliveryTypeChangeForm.deliveryType === 'part load' && (
                <div>
                    <Label htmlFor="paymentType">Payment Type</Label>
                    <Select 
                        value={deliveryTypeChangeForm.paymentType} 
                        onValueChange={(value) => {
                            setDeliveryTypeChangeForm(prev => ({
                                ...prev, 
                                paymentType: value,
                                // Clear transport cost when switching to 'to_pay'
                                transportCost: value === 'to_pay' ? '0' : prev.transportCost
                            }));
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="paid">Paid (We pay transport cost)</SelectItem>
                            <SelectItem value="to_pay">To Pay (Customer pays transporter directly)</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                        {deliveryTypeChangeForm.paymentType === 'paid' 
                            ? 'Transport cost will be added to the order total' 
                            : 'Customer will pay transport cost directly to transporter'
                        }
                    </p>
                </div>
            )}
            
            <div>
                <Label htmlFor="transportCost">Additional Transport Cost (₹)</Label>
                {/* Show disabled message for part load with to_pay */}
                {deliveryTypeChangeForm.deliveryType === 'part load' && deliveryTypeChangeForm.paymentType === 'to_pay' ? (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 font-medium">No transport cost to add</p>
                        <p className="text-xs text-blue-600 mt-1">
                            Customer will pay transport cost directly to transporter
                        </p>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <Input
                            id="transportCost"
                            type="number"
                            placeholder="Enter transport cost"
                            value={deliveryTypeChangeForm.transportCost}
                            onChange={(e) => setDeliveryTypeChangeForm(prev => ({...prev, transportCost: e.target.value}))}
                            className="flex-1"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                // Pre-fill transport cost form with customer address as destination
                                setTransportCostForm({
                                    origin: '',
                                    destination: selectedOrder?.customerAddress || '',
                                    distance: '',
                                    vehicleType: '',
                                    distanceCost: 0,
                                    loadingCharges: 0,
                                    unloadingCharges: 0,
                                    otherCharges: 0,
                                    totalCost: 0
                                });
                                // Temporarily close delivery type change dialog
                                setShowDeliveryTypeChangeDialog(false);
                                setShowTransportCostDialog(true);
                            }}
                            className="whitespace-nowrap"
                        >
                            Calculate Cost
                        </Button>
                    </div>
                )}
            </div>
            
            <div>
                <Label htmlFor="reason">Reason for Change</Label>
                <Textarea
                    id="reason"
                    placeholder="Enter reason for delivery type change"
                    value={deliveryTypeChangeForm.reason}
                    onChange={(e) => setDeliveryTypeChangeForm(prev => ({...prev, reason: e.target.value}))}
                />
            </div>
            
            {selectedOrder && (
                <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900">Order Summary</h4>
                    <p className="text-sm text-blue-700">Current Amount: ₹{selectedOrder.finalAmount}</p>
                    {deliveryTypeChangeForm.deliveryType === 'part load' && deliveryTypeChangeForm.paymentType === 'to_pay' ? (
                        <>
                            <p className="text-sm text-blue-700">New Total: ₹{selectedOrder.finalAmount} (No change)</p>
                            <p className="text-sm text-blue-700">Additional Due: ₹0 (Customer pays transporter)</p>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-blue-700">
                                New Total: ₹{(parseFloat(selectedOrder.finalAmount || 0) + parseFloat(deliveryTypeChangeForm.transportCost || 0)).toFixed(2)}
                            </p>
                            <p className="text-sm text-blue-700">
                                Additional Due: ₹{parseFloat(deliveryTypeChangeForm.transportCost || 0).toFixed(2)}
                            </p>
                        </>
                    )}
                </div>
            )}
        </div>
        
        <DialogFooter>
            <Button 
                variant="outline" 
                onClick={() => setShowDeliveryTypeChangeDialog(false)}
            >
                Cancel
            </Button>
            <Button 
                onClick={handleDeliveryTypeChange}
                className="bg-orange-600 hover:bg-orange-700"
            >
                Change Delivery Type
            </Button>
        </DialogFooter>
    </DialogContent>
</Dialog>

            </div>
            <div className="mt-12 bg-white border-2 border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="text-center text-gray-600">
            <p className="font-medium">
              © Sales Management System
            </p>
            <p className="text-sm mt-1">
              For technical support, contact IT Department
            </p>
          </div>
        </div>
        </div>
        </div>
    );
};

export default SalesDepartment;
