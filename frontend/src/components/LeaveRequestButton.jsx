import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Calendar, Send } from 'lucide-react';
import { API_BASE } from '@/lib/api';

const LeaveRequestButton = ({ user, onSuccess }) => {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const handleSubmit = async () => {
    // Validation
    if (!leaveForm.leaveType || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) {
      toast({
        title: "Missing Information",
        description: "All fields are required.",
        variant: "destructive"
      });
      return;
    }

    // Validate dates
    const start = new Date(leaveForm.startDate);
    const end = new Date(leaveForm.endDate);
    if (end < start) {
      toast({
        title: "Invalid Dates",
        description: "End date must be after start date.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // First, find the employee ID by username/fullName
      let employeeId = user.employeeId;
      
      if (!employeeId) {
        // Try to find employee by full name
        const employeesResponse = await fetch(`${API_BASE}/hr/employees`);
        if (employeesResponse.ok) {
          const employees = await employeesResponse.json();
          const userFullName = user.fullName || user.username;
          
          // Find employee by matching full name or username
          const matchedEmployee = employees.find(emp => 
            emp.fullName === userFullName || 
            emp.firstName + ' ' + emp.lastName === userFullName ||
            emp.email === user.email
          );
          
          if (matchedEmployee) {
            employeeId = matchedEmployee.id;
          } else {
            toast({
              title: "Employee Not Found",
              description: "Could not find your employee record. Please contact HR.",
              variant: "destructive"
            });
            setLoading(false);
            return;
          }
        }
      }

      const response = await fetch(`${API_BASE}/hr/leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employeeId,
          leaveType: leaveForm.leaveType,
          startDate: leaveForm.startDate,
          endDate: leaveForm.endDate,
          reason: leaveForm.reason
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit leave request');
      }

      toast({
        title: "Success",
        description: "Leave request submitted successfully. Awaiting approval.",
      });

      // Reset form and close dialog
      setLeaveForm({
        leaveType: '',
        startDate: '',
        endDate: '',
        reason: ''
      });
      setShowDialog(false);

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
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

  // Calculate number of days
  const calculateDays = () => {
    if (leaveForm.startDate && leaveForm.endDate) {
      const start = new Date(leaveForm.startDate);
      const end = new Date(leaveForm.endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return days > 0 ? days : 0;
    }
    return 0;
  };

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Calendar className="w-4 h-4 mr-2" />
        Request Leave
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white border-gray-200 max-w-md">
          {/* Custom Header with explicit styling */}
          <div className="border-b border-gray-200 pb-4 mb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1" style={{ color: '#111827' }}>
              Request Leave
            </h2>
            <p className="text-sm text-gray-600" style={{ color: '#6B7280' }}>
              Submit a leave request for approval
            </p>
          </div>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="leaveType" className="text-gray-900 font-semibold">Leave Type *</Label>
              <Select
                value={leaveForm.leaveType}
                onValueChange={(value) => setLeaveForm({ ...leaveForm, leaveType: value })}
              >
                <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASUAL">Casual Leave</SelectItem>
                  <SelectItem value="SICK">Sick Leave</SelectItem>
                  <SelectItem value="EARNED">Earned Leave</SelectItem>
                  <SelectItem value="MATERNITY">Maternity Leave</SelectItem>
                  <SelectItem value="PATERNITY">Paternity Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-gray-900 font-semibold">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                  className="bg-white text-gray-900 border-gray-300"
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-gray-900 font-semibold">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                  className="bg-white text-gray-900 border-gray-300"
                  min={leaveForm.startDate}
                />
              </div>
            </div>

            {leaveForm.startDate && leaveForm.endDate && (
              <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded border border-blue-200">
                Duration: <span className="font-bold text-blue-700">{calculateDays()} day(s)</span>
              </div>
            )}

            <div>
              <Label htmlFor="reason" className="text-gray-900 font-semibold">Reason *</Label>
              <Textarea
                id="reason"
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                placeholder="Please provide a reason for your leave request"
                className="bg-white text-gray-900 border-gray-300"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeaveRequestButton;
