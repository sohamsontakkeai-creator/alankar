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
import { formatToIST } from '@/utils/dateFormatter';
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
    FileText
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const ManagerLeaveApproval = ({ managerId }) => {
    const { toast } = useToast();
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [actionType, setActionType] = useState('approve'); // 'approve' or 'reject'
    const [rejectionReason, setRejectionReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Fetch pending leave requests
    const fetchPendingLeaves = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/hr/manager/${managerId}/leaves-pending`);
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
        fetchPendingLeaves();
    }, [managerId]);

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
            const response = await fetch(`${API_BASE}/hr/leaves/${selectedLeave.id}/manager-approve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    approved: actionType === 'approve',
                    managerId: managerId,
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
            fetchPendingLeaves();
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
                <h2 className="text-2xl font-bold text-gray-900">Leave Requests Pending Your Approval</h2>
                <p className="text-gray-600 mt-2">Review and approve/reject leave requests from your team members</p>
            </div>

            {leaves.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <p className="text-gray-600">No pending leave requests</p>
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
                                            Leave ID: {leave.id} • {leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)} Leave
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 rounded-full">
                                        <Clock className="h-4 w-4 text-yellow-700" />
                                        <span className="text-sm font-medium text-yellow-700">Pending</span>
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

                                {/* Request Details */}
                                <div className="text-xs text-gray-500 pt-2 border-t">
                                    <p>Requested on: {formatToIST(leave.createdAt)}</p>
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
                                    Please provide a reason for rejection. This will be communicated to the employee.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                                <Textarea
                                    id="rejection-reason"
                                    placeholder="E.g., No coverage available, exceeds quota limit, etc."
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
                                    This leave will be sent to HR for final approval.
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

export default ManagerLeaveApproval;