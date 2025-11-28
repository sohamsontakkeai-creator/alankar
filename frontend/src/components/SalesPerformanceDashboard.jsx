import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    TrendingUp, 
    TrendingDown, 
    Calendar, 
    Target,
    CheckCircle,
    AlertCircle,
    RefreshCw,
    ArrowRight,
    IndianRupee,
    Zap,
    Award,
    Users
} from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { motion } from 'framer-motion';

// Add global styles for select options visibility
const selectOptionStyles = `
    select option {
        background-color: white;
        color: #1f2937;
        padding: 4px 8px;
    }
    select option:hover {
        background-color: #e0e7ff;
        color: #1f2937;
    }
    select option:checked {
        background-color: #6366f1;
        color: white;
    }
`;

const SalesPerformanceDashboard = ({ salesPerson = null, isAdmin = false }) => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [allTargets, setAllTargets] = useState([]);
    const [salesUsers, setSalesUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUserName, setSelectedUserName] = useState(null);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // For admin mode, don't use localStorage. For regular users, use provided salesPerson or get from session
    const getDefaultUser = () => {
        if (isAdmin) return null;
        if (salesPerson) {
            // Always trim the salesPerson to remove any spaces
            return salesPerson.trim();
        }
        
        // Try to get from sessionStorage first (erpUser object)
        const savedUser = sessionStorage.getItem('erpUser');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                const name = user.fullName || user.username;
                return name ? name.trim() : name;
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
        
        // Fallback to localStorage
        const name = localStorage.getItem('fullName') || localStorage.getItem('username');
        return name ? name.trim() : name;
    };
    
    const [currentSalesPerson, setCurrentSalesPerson] = useState(getDefaultUser());

    // Load sales users for admin selection
    useEffect(() => {
        if (isAdmin) {
            loadSalesUsers();
        }
    }, [isAdmin]);

    const loadSalesUsers = async () => {
        try {
            setLoadingUsers(true);
            const response = await fetch(`${API_BASE}/auth/users-by-department?department=sales`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setSalesUsers(data.users || []);
            }
        } catch (err) {
            console.error('Error loading sales users:', err);
        } finally {
            setLoadingUsers(false);
        }
    };

    // Sync selectedUserName whenever currentSalesPerson or salesUsers changes
    useEffect(() => {
        if (currentSalesPerson && salesUsers.length > 0) {
            // Try to find by fullName first, then by username
            const selected = salesUsers.find(u => u.fullName === currentSalesPerson) || 
                           salesUsers.find(u => u.username === currentSalesPerson);
            setSelectedUserName(selected ? selected.fullName : currentSalesPerson);
        }
    }, [currentSalesPerson, salesUsers]);

    useEffect(() => {
        loadDashboard();
        loadAllTargets();
    }, [selectedYear, selectedMonth, currentSalesPerson]);

    const loadDashboard = async () => {
        if (!currentSalesPerson) {
            setError('No salesperson specified');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                `${API_BASE}/sales/dashboard?salesPerson=${encodeURIComponent(currentSalesPerson)}&year=${selectedYear}&month=${selectedMonth}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to load dashboard');
            }

            const data = await response.json();
            setDashboardData(data);
        } catch (err) {
            console.error('Error loading dashboard:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadAllTargets = async () => {
        if (!currentSalesPerson) return;

        try {
            const response = await fetch(
                `${API_BASE}/sales/targets/all?salesPerson=${encodeURIComponent(currentSalesPerson)}&year=${selectedYear}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setAllTargets(data.targets || []);
            }
        } catch (err) {
            console.error('Error loading all targets:', err);
        }
    };

    const handleRetry = () => {
        loadDashboard();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'on_track':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'progressing':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'at_risk':
                return 'bg-red-100 text-red-800 border-red-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'on_track':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'progressing':
                return <TrendingUp className="w-5 h-5 text-blue-600" />;
            case 'at_risk':
                return <AlertCircle className="w-5 h-5 text-red-600" />;
            default:
                return <Target className="w-5 h-5 text-gray-600" />;
        }
    };

    const getProgressBarColor = (percentage) => {
        if (percentage >= 100) return 'bg-gradient-to-r from-green-400 to-green-600';
        if (percentage >= 75) return 'bg-gradient-to-r from-blue-400 to-blue-600';
        if (percentage >= 50) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
        return 'bg-gradient-to-r from-red-400 to-red-600';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-gray-800 text-lg font-medium">Loading performance data...</p>
                </div>
            </div>
        );
    }

    if (!currentSalesPerson && isAdmin && !loadingUsers) {
        return (
            <div className="space-y-6">
                <Card className="bg-purple-50 border-purple-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-900">
                            <Users className="w-5 h-5" />
                            Select Salesperson
                        </CardTitle>
                        <CardDescription className="text-purple-700">
                            Choose a salesperson to view their performance dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Salesperson</label>
                                <select
                                    value={currentSalesPerson || ''}
                                    onChange={(e) => {
    const fullName = e.target.value;
    // Clear old data immediately
    setDashboardData(null);
    setAllTargets([]);
    setLoading(true);
    // Set new user
    setCurrentSalesPerson(fullName);
    setSelectedUser(fullName);
    setSelectedUserName(fullName);
                                    }}
                                    disabled={loadingUsers}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                                >
                                    <option value="">-- Select a salesperson --</option>
                                    {salesUsers.map(user => (
                                        <option key={user.id} value={user.fullName}>
                                            {user.fullName} ({user.username})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-300 border-2">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <AlertCircle className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <h3 className="text-blue-900 font-semibold mb-2">No Salesperson Selected</h3>
                                <p className="text-blue-800 text-sm">Please select a salesperson from the dropdown above to view their performance dashboard.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                {isAdmin && (
                    <Card className="bg-purple-50 border-purple-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-purple-900">
                                <Users className="w-5 h-5" />
                                Select Salesperson
                            </CardTitle>
                            <CardDescription className="text-purple-700">
                                Choose a salesperson to view their performance dashboard
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Salesperson</label>
                                    <select
                                        value={currentSalesPerson || ''}
                                        onChange={(e) => {
    const fullName = e.target.value;
    setCurrentSalesPerson(fullName);
    setSelectedUser(fullName);
    setSelectedUserName(fullName);
                                        }}
                                        disabled={loadingUsers}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                                    >
                                        <option value="">-- Select a salesperson --</option>
                                        {salesUsers.map(user => (
                                            <option key={user.id} value={user.fullName}>
                                                {user.fullName} ({user.username})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
                <Card className="bg-red-50 border-red-300 border-2 mb-6">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <h3 className="text-red-900 font-semibold mb-2">Error Loading Dashboard</h3>
                                <p className="text-red-800 text-sm mb-4">{error}</p>
                                <Button onClick={handleRetry} className="bg-red-600 hover:bg-red-700" size="sm">
                                    Retry
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="space-y-6">
                {isAdmin && (
                    <Card className="bg-purple-50 border-purple-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-purple-900">
                                <Users className="w-5 h-5" />
                                Select Salesperson
                            </CardTitle>
                            <CardDescription className="text-purple-700">
                                Choose a salesperson to view their performance dashboard
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Salesperson</label>
                                    <select
                                        value={currentSalesPerson || ''}
                                        onChange={(e) => {
    const fullName = e.target.value;
    setCurrentSalesPerson(fullName);
    setSelectedUser(fullName);
    setSelectedUserName(fullName);
                                        }}
                                        disabled={loadingUsers}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                                    >
                                        <option value="">-- Select a salesperson --</option>
                                        {salesUsers.map(user => (
                                            <option key={user.id} value={user.fullName}>
                                                {user.fullName} ({user.username})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
                <Card className="bg-blue-50 border-blue-300 border-2 mb-6">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <AlertCircle className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <h3 className="text-blue-900 font-semibold mb-2">No Data Available</h3>
                                <p className="text-blue-800 text-sm">No performance data found for this period. Please check your targets and orders.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { 
        target, 
        achieved, 
        remaining, 
        exceeded,
        daysMetrics, 
        dailyAverage, 
        status,
        monthName 
    } = dashboardData;

    const progressPercentage = Math.min((achieved.percentage || 0), 100);

    return (
        <div className="space-y-6">
            <style>{selectOptionStyles}</style>
            {/* Admin User Selector */}
            {isAdmin && (
                <Card className="bg-purple-50 border-purple-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-900">
                            <Users className="w-5 h-5" />
                            Select Salesperson
                        </CardTitle>
                        <CardDescription className="text-purple-700">
                            Choose a salesperson to view their performance dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Salesperson</label>
                                <select
                                    value={currentSalesPerson || ''}
                                   onChange={(e) => {
    const fullName = e.target.value;
    setCurrentSalesPerson(fullName);
    setSelectedUser(fullName);
    setSelectedUserName(fullName);
                                    }}
                                    disabled={loadingUsers}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                                >
                                    <option value="">-- Select a salesperson --</option>
                                    {salesUsers.map(user => (
                                        <option key={user.id} value={user.fullName}>
                                            {user.fullName} ({user.username})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Header Section */}
            <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0 shadow-lg">
                <CardHeader className="text-white">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-3xl text-white mb-2">{selectedUserName || currentSalesPerson}</CardTitle>
                            <CardDescription className="text-blue-100 text-lg">
                                {monthName} {selectedYear} Sales Performance
                            </CardDescription>
                        </div>
                        <div className={`px-4 py-3 rounded-lg border-2 ${getStatusColor(status)}`}>
                            <div className="flex items-center gap-2">
                                {getStatusIcon(status)}
                                <span className="font-bold capitalize text-center">{status.replace('_', ' ')}</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Month/Year Selector */}
            <Card className="shadow-md">
                <CardHeader className="bg-gray-50 border-b border-gray-200">
                    <CardTitle className="text-gray-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        Select Period
                    </CardTitle>
                </CardHeader>
                <CardContent className="bg-white pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Year</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 bg-white"
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Month</label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 bg-white"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                    <option key={month} value={month}>
                                        {new Date(2024, month - 1).toLocaleString('default', { month: 'long' })}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Target Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="bg-white border-l-4 border-blue-600 hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3 bg-blue-50">
                            <CardTitle className="flex items-center gap-2 text-blue-900 text-base font-semibold">
                                <Target className="w-5 h-5 text-blue-600" />
                                <span>Monthly Target</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-3xl font-bold text-blue-600">
                                ₹{(target.amount || 0).toLocaleString('en-IN')}
                            </div>
                            <p className="text-xs text-gray-700 mt-1 font-medium">Set target amount</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Achieved Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="bg-white border-l-4 border-green-600 hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3 bg-green-50">
                            <CardTitle className="flex items-center gap-2 text-green-900 text-base font-semibold">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span>Achieved</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-3xl font-bold text-green-600">
                                ₹{(achieved.amount || 0).toLocaleString('en-IN')}
                            </div>
                            <p className="text-xs text-green-700 font-medium mt-1">{achieved.percentage.toFixed(1)}% of target</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Remaining Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card className="bg-white border-l-4 border-orange-600 hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3 bg-orange-50">
                            <CardTitle className="flex items-center gap-2 text-orange-900 text-base font-semibold">
                                <ArrowRight className="w-5 h-5 text-orange-600" />
                                <span>Remaining</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-3xl font-bold text-orange-600">
                                ₹{(remaining.amount || 0).toLocaleString('en-IN')}
                            </div>
                            <p className="text-xs text-orange-700 font-medium mt-1">{remaining.percentage.toFixed(1)}% left</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Days Remaining Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card className="bg-white border-l-4 border-purple-600 hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3 bg-purple-50">
                            <CardTitle className="flex items-center gap-2 text-purple-900 text-base font-semibold">
                                <Zap className="w-5 h-5 text-purple-600" />
                                <span>Days Left</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="text-3xl font-bold text-purple-600">
                                {daysMetrics.daysRemaining}
                            </div>
                            <p className="text-xs text-purple-700 font-medium mt-1">
                                {daysMetrics.daysElapsed} days elapsed
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Progress Bar */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
            >
                <Card className="bg-white shadow-md">
                    <CardHeader className="bg-yellow-50 border-b border-yellow-200">
                        <CardTitle className="text-yellow-900 flex items-center gap-2">
                            <Award className="w-5 h-5 text-yellow-600" />
                            Progress Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Sales Achievement</span>
                                    <span className="text-sm font-bold text-gray-900">{progressPercentage.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPercentage}%` }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                        className={`h-full ${getProgressBarColor(progressPercentage)} rounded-full shadow-md`}
                                    />
                                </div>
                            </div>
                            {achieved.percentage >= 100 && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <p className="text-sm font-medium text-green-800">
                                        🎉 Exceeded target! <span className="font-bold">₹{(exceeded || 0).toLocaleString('en-IN')}</span> above target
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Daily Performance */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
            >
                <Card className="bg-white shadow-md">
                    <CardHeader className="bg-cyan-50 border-b border-cyan-200">
                        <CardTitle className="text-cyan-900 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-cyan-600" />
                            Daily Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Daily Average Needed */}
                            <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
                                <p className="text-sm text-blue-900 font-semibold mb-2">Daily Average Needed</p>
                                <p className="text-3xl font-bold text-blue-700">₹{(dailyAverage.needed || 0).toLocaleString('en-IN')}</p>
                                <p className="text-xs text-blue-700 font-medium mt-2">To hit your target</p>
                            </div>

                            {/* Daily Average Achieved */}
                            <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
                                <p className="text-sm text-green-900 font-semibold mb-2">Daily Average Achieved</p>
                                <p className="text-3xl font-bold text-green-700">₹{(dailyAverage.achieved || 0).toLocaleString('en-IN')}</p>
                                <p className="text-xs text-green-700 font-medium mt-2">Average so far</p>
                            </div>
                        </div>

                        {/* On Track Indicator */}
                        <div className="mt-4">
                            {dailyAverage.onTrack && (
                                <div className="bg-green-100 border-2 border-green-400 rounded-lg p-3">
                                    <p className="text-sm font-medium text-green-800 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5" />
                                        ✓ You are ON TRACK to meet your target!
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Target Details */}
            {target.details && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                >
                    <Card className="bg-white shadow-md">
                        <CardHeader className="bg-indigo-50 border-b border-indigo-200">
                            <CardTitle className="text-indigo-900 flex items-center gap-2">
                                <IndianRupee className="w-5 h-5 text-indigo-600" />
                                Target Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-xs text-gray-600 font-medium">Assignment Type</p>
                                    <p className="text-sm font-bold text-gray-900 mt-1 capitalize">
                                        {target.details.assignmentType || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600 font-medium">Assigned By</p>
                                    <p className="text-sm font-bold text-gray-900 mt-1">
                                        {target.details.assignedBy || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600 font-medium">Created At</p>
                                    <p className="text-sm font-bold text-gray-900 mt-1">
                                        {new Date(target.details.createdAt).toLocaleDateString('en-IN')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600 font-medium">Status</p>
                                    <Badge className="mt-1 capitalize">{status}</Badge>
                                </div>
                            </div>
                            {target.details.notes && (
                                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-xs text-gray-600 font-medium">Notes</p>
                                    <p className="text-sm text-gray-900 mt-1">{target.details.notes}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* All Targets for Year */}
            {allTargets.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                >
                    <Card className="bg-white shadow-md">
                        <CardHeader className="bg-teal-50 border-b border-teal-200">
                            <CardTitle className="text-teal-900">All Targets for {selectedYear}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {allTargets.map((t, idx) => (
                                    <div key={idx} className="p-3 border-2 border-teal-200 rounded-lg hover:bg-teal-50 cursor-pointer transition-colors">
                                        <p className="text-sm font-bold text-teal-900">
                                            {new Date(2024, t.month - 1).toLocaleString('default', { month: 'short' })} {t.year}
                                        </p>
                                        <p className="text-lg font-bold text-teal-700">₹{t.targetAmount.toLocaleString('en-IN')}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </div>
    );
};

export default SalesPerformanceDashboard;
