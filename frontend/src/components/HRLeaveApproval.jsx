import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { useToast } from './ui/use-toast';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from './ui/card';
import {
    AlertCircle,
    CheckCircle,
    XCircle,
    Clock,
    User,
    Calendar,
    FileText,
    Badge
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const HRLeaveApproval = ({ hrPersonId }) => {
    const { toast } = useToast();
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [actionType, setActionType] = useState('approve'); // 'approve' or 'reject'
    const [rejectionReason, setRejectionReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'approved', 'rejected'

    // Fetch leave requests pending HR approval
    const fetchPendingHRLeaves = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/hr/leaves-pending-hr-approval`);
            if (!response.ok) throw new Error('Failed to fetch leaves');
            const data = await response.json();
            setLeaves(data);
        } catch (error) {
            console.error('Error fetching leaves:', error);
            toast({
                title: 'Error',
                description: 'Failed to load leave requests',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingHRLeaves();
    }, []);

    const handleApproveClick = (leave) => {
        setSelectedLeave(leave);
        setActionType('approve');
        setRejectionReason('');
        setDialogOpen(true);
    };

    const handleRejectClick = (leave) => {
        setSelectedLeave(leave);
        setActionType('reject');
        setRejectionReason('');
        setDialogOpen(true);
    };

    const handleSubmitApproval = async () => {
        if (actionType === 'reject' && !rejectionReason.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Please provide a rejection reason',
                variant: 'destructive'
            });
            return;
        }

        try {
            setSubmitting(true);
            const response = await fetch(`${API_BASE}/hr/leaves/${selectedLeave.id}/approve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    approved: actionType === 'approve',
                    approverId: hrPersonId,
                    rejectionReason: actionType === 'reject' ? rejectionReason : null
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to process leave request');
            }

            toast({
                title: 'Success',
                description: `Leave request ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`
            });

            // Refresh the list
            fetchPendingHRLeaves();
            setDialogOpen(false);
        } catch (error) {
            console.error('Error processing leave:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to process leave request',
                variant: 'destructive'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getLeaveTypeColor = (leaveType) => {
        const colors = {
            casual: 'bg-blue-100 text-blue-800',
            sick: 'bg-red-100 text-red-800',
            earned: 'bg-green-100 text-green-800',
            maternity: 'bg-pink-100 text-pink-800',
            paternity: 'bg-purple-100 text-purple-800'
        };
        return colors[leaveType] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-gray-500">Loading leave requests...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Leave Requests - Final Approval</h2>
                <p className="text-gray-600 mt-2">Review manager-approved leave requests for final HR approval</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b">
                <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                        filterStatus === 'all'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                    All ({leaves.length})
                </button>
            </div>

            {leaves.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <p className="text-gray-600">No pending leave requests for approval</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {leaves.map(leave => (
                        <Card key={leave.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <CardTitle className="flex items-center gap-2">
                                            <User className="h-5 w-5 text-blue-600" />
                                            {leave.employeeName}
                                        </CardTitle>
                                        <CardDescription>
                                            Leave ID: {leave.id}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={getLeaveTypeColor(leave.leaveType)}>
                                            {leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)}
                                        </Badge>
                                        <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 rounded-full">
                                            <Clock className="h-4 w-4 text-yellow-700" />
                                            <span className="text-sm font-medium text-yellow-700">HR Review</span>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Leave Details */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label className="text-xs text-gray-500 uppercase">Start Date</Label>
                                        <p className="text-lg font-semibold flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            {formatDate(leave.startDate)}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-gray-500 uppercase">End Date</Label>
                                        <p className="text-lg font-semibold flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            {formatDate(leave.endDate)}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-gray-500 uppercase">Days</Label>
                                        <p className="text-lg font-semibold">{leave.daysRequested} days</p>
                                    </div>
                                </div>

                                {/* Reason */}
                                {leave.reason && (
                                    <div>
                                        <Label className="text-xs text-gray-500 uppercase flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            Reason
                                        </Label>
                                        <p className="text-gray-700 bg-gray-50 p-3 rounded mt-1">{leave.reason}</p>
                                    </div>
                                )}

                                {/* Manager Approval Info */}
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="font-medium text-green-900">Manager Approved</p>
                                            <p className="text-sm text-green-700 mt-1">
                                                <strong>{leave.managerName}</strong> approved on{' '}
                                                {leave.managerApprovedAt ? formatDateTime(leave.managerApprovedAt) : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Request Timeline */}
                                <div className="text-xs text-gray-500 pt-2 border-t space-y-1">
                                    <p>Requested on: {formatDateTime(leave.createdAt)}</p>
                                    {leave.managerApprovedAt && (
                                        <p>Manager approved: {formatDateTime(leave.managerApprovedAt)}</p>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <Button
                                        onClick={() => handleApproveClick(leave)}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Approve
                                    </Button>
                                    <Button
                                        onClick={() => handleRejectClick(leave)}
                                        variant="outline"
                                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Reject
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Approval Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedLeave && (
                                <span>
                                    {selectedLeave.employeeName} •{' '}
                                    {formatDate(selectedLeave.startDate)} to {formatDate(selectedLeave.endDate)} •{' '}
                                    {selectedLeave.daysRequested} days
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {actionType === 'reject' && (
                        <div className="space-y-4 py-4">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-800">
                                    Please provide a reason for rejection. This will be communicated to the employee and their manager.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                                <Textarea
                                    id="rejection-reason"
                                    placeholder="E.g., Budget limit exceeded, exceeds quota, policy violation, etc."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="resize-none"
                                    rows={4}
                                />
                            </div>
                        </div>
                    )}

                    {actionType === 'approve' && (
                        <div className="space-y-4 py-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-green-800">
                                    This leave request will be marked as fully approved.
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmitApproval}
                            disabled={submitting}
                            className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                        >
                            {submitting ? 'Processing...' : (actionType === 'approve' ? 'Approve Leave' : 'Reject Leave')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default HRLeaveApproval;