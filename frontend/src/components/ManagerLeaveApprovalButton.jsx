import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Users, CheckCircle, XCircle, Calendar, Clock } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatToIST } from '@/utils/dateFormatter';

const ManagerLeaveApprovalButton = ({ user }) => {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [teamLeaves, setTeamLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [notes, setNotes] = useState('');

  const [isManager, setIsManager] = useState(false);
  const [employeeRecord, setEmployeeRecord] = useState(null);
  
  // Check if user is a manager by fetching their employee record
  useEffect(() => {
    const checkIfManager = async () => {
      if (!user?.fullName && !user?.username) return;
      
      try {
        const employeesResponse = await fetch(`${API_BASE}/hr/employees`);
        if (employeesResponse.ok) {
          const employees = await employeesResponse.json();
          const userFullName = user.fullName || user.username;
          
          console.log('[Manager Leave] Looking for user:', userFullName);
          
          const matchedEmployee = employees.find(emp => 
            emp.fullName === userFullName || 
            (emp.firstName + ' ' + emp.lastName) === userFullName ||
            emp.email === user.email ||
            emp.fullName?.trim() === userFullName?.trim()
          );
          
          if (matchedEmployee) {
            console.log('[Manager Leave] Found employee record:', matchedEmployee);
            setEmployeeRecord(matchedEmployee);
            
            const designation = matchedEmployee.designation || '';
            const managerCheck = designation.toLowerCase().includes('manager');
            
            console.log('[Manager Leave] Designation:', designation);
            console.log('[Manager Leave] Is manager:', managerCheck);
            setIsManager(managerCheck);
          } else {
            console.log('[Manager Leave] No employee record found');
            setIsManager(false);
          }
        }
      } catch (error) {
        console.error('[Manager Leave] Error checking manager status:', error);
        setIsManager(false);
      }
    };
    
    checkIfManager();
  }, [user]);

  useEffect(() => {
    if (isManager && employeeRecord) {
      fetchTeamLeaves();
      // Refresh every 30 seconds
      const interval = setInterval(fetchTeamLeaves, 30000);
      return () => clearInterval(interval);
    }
  }, [isManager, employeeRecord]);

  const fetchTeamLeaves = async () => {
    if (!employeeRecord?.id) {
      console.log('[Manager Leave] No employee record available');
      return;
    }
    
    try {
      const managerId = employeeRecord.id;
      console.log('[Manager Leave] Fetching team leaves for manager ID:', managerId);
      
      const response = await fetch(`${API_BASE}/hr/leaves/my-team?managerId=${managerId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('[Manager Leave] Received team leaves:', data);
        setTeamLeaves(data);
        // Count only pending leaves (not manager-approved ones)
        const pending = data.filter(leave => leave.status === 'pending').length;
        setPendingCount(pending);
        console.log('[Manager Leave] Pending count:', pending);
      } else {
        console.log('[Manager Leave] Failed to fetch team leaves:', response.status);
      }
    } catch (error) {
      console.error('[Manager Leave] Error fetching team leaves:', error);
    }
  };

  const handleApprove = async (leaveId, approved) => {
    if (!employeeRecord?.id) {
      toast({
        title: "Error",
        description: "Could not find your employee record",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/hr/leaves/${leaveId}/manager-approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          managerId: employeeRecord.id,
          approved: approved,
          notes: notes || (approved ? 'Approved by manager' : 'Rejected by manager')
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process approval');
      }

      toast({
        title: "Success",
        description: `Leave request ${approved ? 'approved' : 'rejected'} successfully.`,
      });

      // Reset and refresh
      setSelectedLeave(null);
      setNotes('');
      fetchTeamLeaves();
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't show button if user is not a manager
  if (!isManager) {
    return null;
  }

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        className="bg-purple-600 hover:bg-purple-700 text-white relative"
      >
        <Users className="w-4 h-4 mr-2" />
        Team Leave Approvals
        {pendingCount > 0 && (
          <Badge className="ml-2 bg-red-500 text-white px-2 py-0.5 text-xs">
            {pendingCount}
          </Badge>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white border-gray-200 max-w-4xl max-h-[80vh] overflow-y-auto">
          {/* Custom Header */}
          <div className="border-b border-gray-200 pb-4 mb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1" style={{ color: '#111827' }}>
              Team Leave Requests
            </h2>
            <p className="text-sm text-gray-600" style={{ color: '#6B7280' }}>
              Approve or reject leave requests from your team members
            </p>
          </div>

          <div className="space-y-4">
            {teamLeaves.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No pending leave requests from your team</p>
              </div>
            ) : (
              teamLeaves.map(leave => (
                <div 
                  key={leave.id} 
                  className={`p-4 border-2 rounded-lg ${
                    leave.status === 'pending' 
                      ? 'border-yellow-300 bg-yellow-50' 
                      : leave.status === 'manager_approved'
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-lg text-gray-900">{leave.employeeName}</h4>
                        <Badge 
                          className={
                            leave.status === 'pending' 
                              ? 'bg-yellow-500' 
                              : leave.status === 'manager_approved'
                              ? 'bg-blue-500'
                              : 'bg-gray-500'
                          }
                        >
                          {leave.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                        <div className="flex items-center text-gray-700">
                          <Calendar className="w-4 h-4 mr-1" />
                          <span className="font-semibold">Type:</span>
                          <span className="ml-1">{leave.leaveType}</span>
                        </div>
                        <div className="flex items-center text-gray-700">
                          <Clock className="w-4 h-4 mr-1" />
                          <span className="font-semibold">Duration:</span>
                          <span className="ml-1">{leave.daysRequested} day(s)</span>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-700 mb-2">
                        <span className="font-semibold">Period:</span> {new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}
                      </div>
                      
                      <div className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                        <span className="font-semibold">Reason:</span> {leave.reason}
                      </div>

                      {leave.status === 'manager_approved' && (
                        <div className="mt-2 text-sm text-blue-700 bg-blue-100 p-2 rounded">
                          ✓ You approved this on {formatToIST(leave.managerApprovedAt)}
                          {leave.managerNotes && <div className="mt-1">Note: {leave.managerNotes}</div>}
                        </div>
                      )}
                    </div>

                    {leave.status === 'pending' && (
                      <div className="flex flex-col gap-2 ml-4">
                        <Button 
                          onClick={() => {
                            setSelectedLeave(leave);
                            setNotes('');
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={loading}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          onClick={() => {
                            setSelectedLeave({ ...leave, rejecting: true });
                            setNotes('');
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white"
                          disabled={loading}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval/Rejection Confirmation Dialog */}
      {selectedLeave && (
        <Dialog open={!!selectedLeave} onOpenChange={() => setSelectedLeave(null)}>
          <DialogContent className="bg-white border-gray-200 max-w-md">
            <div className="border-b border-gray-200 pb-4 mb-4">
              <h2 className="text-xl font-bold text-gray-900" style={{ color: '#111827' }}>
                {selectedLeave.rejecting ? 'Reject' : 'Approve'} Leave Request
              </h2>
              <p className="text-sm text-gray-600 mt-1" style={{ color: '#6B7280' }}>
                {selectedLeave.employeeName} - {selectedLeave.leaveType}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="notes" className="text-gray-900 font-semibold">
                  Notes {selectedLeave.rejecting && '*'}
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={selectedLeave.rejecting ? "Please provide a reason for rejection" : "Optional notes (e.g., 'Approved - enjoy your leave')"}
                  className="bg-white text-gray-900 border-gray-300"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedLeave(null)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleApprove(selectedLeave.id, !selectedLeave.rejecting)}
                disabled={loading || (selectedLeave.rejecting && !notes)}
                className={selectedLeave.rejecting ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
              >
                {loading ? 'Processing...' : (selectedLeave.rejecting ? 'Reject' : 'Approve')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ManagerLeaveApprovalButton;
