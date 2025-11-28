import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * SalesPersonalDashboard Component
 * Displays individual salesperson's monthly sales target and achievement metrics
 */
const SalesPersonalDashboard = ({ salesPerson }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchDashboard();
  }, [salesPerson, selectedYear, selectedMonth]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get('/api/sales/dashboard', {
        params: {
          salesPerson,
          year: selectedYear,
          month: selectedMonth
        }
      });

      setDashboard(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button 
          onClick={fetchDashboard}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">No target set for this month. Contact admin to set your monthly target.</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'on_track':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'progressing':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'at_risk':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'on_track':
        return '✓ On Track - Target Achieved!';
      case 'progressing':
        return '→ Progressing - Keep Going!';
      case 'at_risk':
        return '⚠ At Risk - Need to Accelerate';
      default:
        return 'Status Unknown';
    }
  };

  const { achieved, target, remaining, daysMetrics, dailyAverage, exceeded, monthName, status } = dashboard;

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-800 mb-2">Sales Dashboard</h1>
        <p className="text-slate-600">Monthly Target Tracking & Performance Metrics</p>
      </div>

      {/* Month/Year Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4 items-center">
        <label className="flex items-center gap-2">
          <span className="text-slate-700 font-medium">Month:</span>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2024, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-slate-700 font-medium">Year:</span>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </label>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg border-2 p-4 mb-6 ${getStatusColor(status)}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{getStatusText(status)}</h2>
            <p className="text-sm opacity-75">
              {monthName} {dashboard.year} - {daysMetrics.daysInMonth} days in month
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{achieved.percentage}%</div>
            <div className="text-sm opacity-75">Progress</div>
          </div>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Target Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-600 font-semibold">Monthly Target</h3>
            <div className="text-2xl">🎯</div>
          </div>
          <div className="text-3xl font-bold text-blue-600">₹{target.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <p className="text-slate-500 text-sm mt-2">Your monthly goal</p>
        </div>

        {/* Achieved Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-600 font-semibold">Achieved So Far</h3>
            <div className="text-2xl">✓</div>
          </div>
          <div className="text-3xl font-bold text-green-600">₹{achieved.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <p className="text-slate-500 text-sm mt-2">{achieved.percentage.toFixed(1)}% of target</p>
        </div>

        {/* Remaining Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-600 font-semibold">Remaining Target</h3>
            <div className="text-2xl">📊</div>
          </div>
          <div className="text-3xl font-bold text-orange-600">₹{remaining.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          <p className="text-slate-500 text-sm mt-2">{remaining.percentage.toFixed(1)}% to go</p>
        </div>

        {/* Exceeded Card (if applicable) */}
        {exceeded > 0 && (
          <div className="bg-white rounded-lg shadow p-6 border-2 border-green-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-600 font-semibold">Exceeded Target</h3>
              <div className="text-2xl">🎉</div>
            </div>
            <div className="text-3xl font-bold text-green-600">₹{exceeded.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <p className="text-slate-500 text-sm mt-2">Beyond target!</p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Monthly Progress</h3>
        <div className="relative w-full bg-slate-200 rounded-full h-8 overflow-hidden">
          <div 
            className={`${getProgressColor(achieved.percentage)} h-full rounded-full transition-all duration-500 flex items-center justify-center text-white font-bold text-sm`}
            style={{ width: `${Math.min(achieved.percentage, 100)}%` }}
          >
            {achieved.percentage > 5 && `${achieved.percentage.toFixed(1)}%`}
          </div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-600">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Days Metrics & Daily Average */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Days Metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Days Remaining</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
              <span className="text-slate-600">Days in Month</span>
              <span className="text-2xl font-bold text-slate-800">{daysMetrics.daysInMonth}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
              <span className="text-slate-600">Days Elapsed</span>
              <span className="text-2xl font-bold text-blue-600">{daysMetrics.daysElapsed}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded border-2 border-orange-300">
              <span className="text-slate-600 font-semibold">Days Remaining</span>
              <span className="text-2xl font-bold text-orange-600">{daysMetrics.daysRemaining}</span>
            </div>
            {daysMetrics.isCurrentMonth && (
              <div className="text-xs text-slate-500 pt-2">
                💡 This is the current month
              </div>
            )}
          </div>
        </div>

        {/* Daily Average */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Daily Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
              <span className="text-slate-600">Daily Avg Achieved</span>
              <span className="text-2xl font-bold text-green-600">₹{dailyAverage.achieved.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
              <span className="text-slate-600">Daily Avg Needed</span>
              <span className="text-2xl font-bold text-blue-600">₹{dailyAverage.needed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className={`flex justify-between items-center p-3 rounded border-2 ${
              dailyAverage.onTrack 
                ? 'bg-green-50 border-green-300' 
                : dailyAverage.onTrack === false
                ? 'bg-red-50 border-red-300'
                : 'bg-gray-50 border-gray-300'
            }`}>
              <span className="text-slate-600 font-semibold">On Track</span>
              <span className={`text-2xl font-bold ${
                dailyAverage.onTrack 
                  ? 'text-green-600' 
                  : dailyAverage.onTrack === false
                  ? 'text-red-600'
                  : 'text-gray-600'
              }`}>
                {dailyAverage.onTrack === true ? '✓ Yes' : dailyAverage.onTrack === false ? '✗ No' : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Target Details */}
      {target.details && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Target Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide">Assignment Type</p>
              <p className="text-slate-800 font-medium capitalize mt-1">{target.details.assignmentType}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide">Assigned By</p>
              <p className="text-slate-800 font-medium mt-1">{target.details.assignedBy || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide">Created At</p>
              <p className="text-slate-800 font-medium mt-1">
                {new Date(target.details.createdAt).toLocaleDateString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide">Updated At</p>
              <p className="text-slate-800 font-medium mt-1">
                {new Date(target.details.updatedAt).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>
          {target.details.notes && (
            <div className="mt-4 p-3 bg-slate-50 rounded">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Notes</p>
              <p className="text-slate-800">{target.details.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SalesPersonalDashboard;