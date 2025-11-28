import React, { useState, useMemo } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const LeaveRequestsTable = ({ leaveRequests, onApprove }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return leaveRequests;
    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/);
    return leaveRequests.filter(leave => {
      const employeeName = (leave.employeeName || '').toLowerCase();
      return searchTerms.every(term => employeeName.includes(term));
    });
  }, [leaveRequests, searchQuery]);

  const handleReset = () => {
    setSearchQuery("");
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-black font-semibold">Recent Leave Requests</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleReset}
            className="text-sm text-red-600 hover:text-red-800 border border-red-600 hover:border-red-800 px-3 py-1 rounded transition"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Range</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRequests.length > 0 ? filteredRequests.map((leave) => (
              <tr key={leave.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{leave.employeeName || 'Unknown'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{leave.createdAt ? new Date(leave.createdAt).toLocaleDateString() : '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{leave.leaveType}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{leave.startDate && leave.endDate ? `${new Date(leave.startDate).toLocaleDateString()} - ${new Date(leave.endDate).toLocaleDateString()}` : '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1} days</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{leave.reason}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    leave.status === 'approved' ? 'bg-green-100 text-green-800' :
                    leave.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    leave.status === 'manager_approved' ? 'bg-blue-100 text-blue-800' :
                    leave.status === 'manager_rejected' ? 'bg-orange-100 text-orange-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {leave.status === 'manager_approved' ? 'Manager Approved' :
                     leave.status === 'manager_rejected' ? 'Manager Rejected' :
                     leave.status || 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {leave.status === 'manager_approved' ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onApprove(leave.id, true)}
                        className="text-green-600 hover:text-green-900"
                        title="HR Final Approval"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onApprove(leave.id, false)}
                        className="text-red-600 hover:text-red-900"
                        title="HR Reject"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ) : leave.status === 'pending' ? (
                    <span className="text-xs text-gray-500 italic">Awaiting manager approval</span>
                  ) : leave.status === 'manager_rejected' ? (
                    <span className="text-xs text-orange-600 italic">Rejected by manager</span>
                  ) : null}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                  No leave requests found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(LeaveRequestsTable);
