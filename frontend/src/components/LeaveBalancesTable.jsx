import React, { useState, useMemo } from 'react';

const LeaveBalancesTable = ({ leaveBalances, employees }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBalances = useMemo(() => {
    if (!searchQuery.trim()) return leaveBalances;
    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/);
    return leaveBalances.filter(balance => {
      const employee = employees.find(e => e.id === balance.employeeId);
      const fullName = employee ? (employee.name || `${employee.firstName} ${employee.lastName}`) : '';
      const nameLower = fullName.toLowerCase();
      return searchTerms.every(term => nameLower.includes(term));
    });
  }, [leaveBalances, searchQuery, employees]);

  const handleReset = () => {
    setSearchQuery("");
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-black font-semibold">Employee Leave Balances</h3>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Casual Leave</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sick Leave</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earned Leave</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredBalances.length > 0 ? filteredBalances.map((balance) => {
              const employee = employees.find(e => e.id === balance.employeeId);
              const employeeName = employee ? (employee.name || `${employee.firstName} ${employee.lastName}`) : 'Unknown';
              
              return (
                <tr key={balance.employeeId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{employeeName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {balance.casualLeave?.remaining || 0} / {balance.casualLeave?.total || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {balance.sickLeave?.remaining || 0} / {balance.sickLeave?.total || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {balance.earnedLeave?.remaining || 0} / {balance.earnedLeave?.total || 0}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                  No leave balances found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default React.memo(LeaveBalancesTable);
