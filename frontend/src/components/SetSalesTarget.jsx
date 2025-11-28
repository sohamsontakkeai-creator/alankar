import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { 
    TargetIcon, 
    Users,
    Plus,
    Edit,
    CheckCircle,
    AlertCircle,
    RefreshCw,
    Search as SearchIcon,
    Copy,
    TrendingUp
} from 'lucide-react';
import { API_BASE } from '@/lib/api';

const SetSalesTarget = () => {
    const { toast } = useToast();
    const [salesPersons, setSalesPersons] = useState([]);
    const [filteredSalesPersons, setFilteredSalesPersons] = useState([]);
    const [targets, setTargets] = useState([]);
    const [salesPersonTargets, setSalesPersonTargets] = useState({}); // Store targets by salesperson name
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('set-target');
    const [showDialog, setShowDialog] = useState(false);
    const [editingTarget, setEditingTarget] = useState(null);
    
    const [formData, setFormData] = useState({
        salesPerson: '',
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        targetAmount: '',
        assignedBy: 'admin',
        notes: ''
    });

    // Load sales persons on component mount
    useEffect(() => {
        loadSalesPersons();
        loadAllTargets();
    }, []);

    // Load targets for all salespersons when they change
    useEffect(() => {
        if (salesPersons.length > 0) {
            loadTargetsForAllSalesPersons();
        }
    }, [salesPersons, formData.year, formData.month]);

    // Filter sales persons based on search
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredSalesPersons(salesPersons);
        } else {
            const filtered = salesPersons.filter(person =>
                person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                person.email.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredSalesPersons(filtered);
        }
    }, [searchQuery, salesPersons]);

    const loadSalesPersons = async () => {
        try {
            // Fetch all users
            const response = await fetch(`${API_BASE}/auth/users`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Filter only users with 'sales' department
                const salespersons = (data.users || data || [])
                    .filter(user => user.department === 'sales')
                    .map(user => ({
                        id: user.id,
                        name: user.fullName || user.full_name || user.username,
                        email: user.email,
                        department: user.department,
                        username: user.username
                    }));
                setSalesPersons(salespersons);
                setFilteredSalesPersons(salespersons);
            }
        } catch (error) {
            console.error('Error loading sales persons:', error);
            toast({
                title: "Error",
                description: "Failed to load sales persons",
                variant: "destructive"
            });
        }
    };

    const loadAllTargets = async () => {
        try {
            setLoading(true);
            // This would require a new endpoint to get all targets
            // For now, we'll just set empty
            setTargets([]);
        } catch (error) {
            console.error('Error loading targets:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTargetsForAllSalesPersons = async () => {
        try {
            const targetsMap = {};
            
            // Fetch targets for each salesperson
            for (const person of salesPersons) {
                try {
                    const response = await fetch(
                        `${API_BASE}/sales/targets/all?salesPerson=${encodeURIComponent(person.name)}&year=${formData.year}`,
                        {
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            }
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        const targets = data.targets || [];
                        
                        // Find target for current month
                        const currentMonthTarget = targets.find(
                            t => t.month === formData.month && t.year === formData.year
                        );
                        
                        if (currentMonthTarget) {
                            targetsMap[person.name] = currentMonthTarget;
                        }
                    }
                } catch (error) {
                    console.error(`Error loading targets for ${person.name}:`, error);
                }
            }
            
            setSalesPersonTargets(targetsMap);
        } catch (error) {
            console.error('Error loading targets for salespersons:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'targetAmount' || name === 'year' || name === 'month' ? 
                (value ? Number(value) : '') : value
        }));
    };

    const handleSetTarget = async (e) => {
        e.preventDefault();

        if (!formData.salesPerson || !formData.targetAmount) {
            toast({
                title: "Validation Error",
                description: "Please select a salesperson and enter target amount",
                variant: "destructive"
            });
            return;
        }

        if (formData.targetAmount <= 0) {
            toast({
                title: "Validation Error",
                description: "Target amount must be greater than 0",
                variant: "destructive"
            });
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/sales/targets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    salesPerson: formData.salesPerson,
                    year: formData.year,
                    month: formData.month,
                    targetAmount: formData.targetAmount,
                    assignedBy: formData.assignedBy,
                    notes: formData.notes
                })
            });

            if (response.ok || response.status === 201) {
                const data = await response.json();
                const monthName = new Date(formData.year, formData.month - 1).toLocaleString('default', { month: 'long' });
                toast({
                    title: "Success",
                    description: editingTarget 
                        ? `Target updated successfully for ${formData.salesPerson} (${monthName} ${formData.year})`
                        : `Target set successfully for ${formData.salesPerson} (${monthName} ${formData.year})`,
                });
                
                // Reset form
                setFormData({
                    salesPerson: '',
                    year: new Date().getFullYear(),
                    month: new Date().getMonth() + 1,
                    targetAmount: '',
                    assignedBy: 'admin',
                    notes: ''
                });
                setShowDialog(false);
                setEditingTarget(null);
                loadAllTargets();
                loadTargetsForAllSalesPersons(); // Refresh target status
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to set target');
            }
        } catch (error) {
            console.error('Error setting target:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to set target",
                variant: "destructive"
            });
        }
    };

    const handleBulkSetTargets = async (targetAmount) => {
        if (!targetAmount || targetAmount <= 0) {
            toast({
                title: "Validation Error",
                description: "Please enter a valid target amount",
                variant: "destructive"
            });
            return;
        }

        try {
            let successCount = 0;
            let failureCount = 0;

            for (const person of filteredSalesPersons) {
                try {
                    const response = await fetch(`${API_BASE}/sales/targets`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({
                            salesPerson: person.name,
                            year: formData.year,
                            month: formData.month,
                            targetAmount: Number(targetAmount),
                            assignedBy: 'admin',
                            notes: 'Bulk assignment'
                        })
                    });

                    if (response.ok || response.status === 201) {
                        successCount++;
                    } else {
                        failureCount++;
                    }
                } catch (error) {
                    failureCount++;
                }
            }

            toast({
                title: "Bulk Assignment Complete",
                description: `${successCount} targets set, ${failureCount} failed`
            });

            loadAllTargets();
        } catch (error) {
            console.error('Error in bulk set targets:', error);
            toast({
                title: "Error",
                description: "Bulk assignment failed",
                variant: "destructive"
            });
        }
    };

    const handleOpenDialog = (target = null) => {
        if (target) {
            setEditingTarget(target);
            setFormData(target);
        } else {
            setEditingTarget(null);
            setFormData({
                salesPerson: '',
                year: new Date().getFullYear(),
                month: new Date().getMonth() + 1,
                targetAmount: '',
                assignedBy: 'admin',
                notes: ''
            });
        }
        setShowDialog(true);
    };

    const handleCloseDialog = () => {
        setShowDialog(false);
        setEditingTarget(null);
        setFormData({
            salesPerson: '',
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            targetAmount: '',
            assignedBy: 'admin',
            notes: ''
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0">
                <CardHeader className="text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <TargetIcon className="w-8 h-8" />
                            <div>
                                <CardTitle className="text-2xl text-white">Sales Target Management</CardTitle>
                                <CardDescription className="text-blue-100">Set and manage monthly sales targets for salespeople</CardDescription>
                            </div>
                        </div>
                        <TrendingUp className="w-16 h-16 opacity-30" />
                    </div>
                </CardHeader>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="set-target">Set Individual Target</TabsTrigger>
                    <TabsTrigger value="bulk-assign">Bulk Assign Targets</TabsTrigger>
                </TabsList>

                {/* Tab 1: Set Individual Target */}
                <TabsContent value="set-target" className="space-y-6">
                    <Card className="bg-white border-2 border-gray-200 shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <TargetIcon className="w-5 h-5" />
                                Set Target for Salesperson
                            </CardTitle>
                            <CardDescription className="text-blue-100">
                                Select a salesperson and set their monthly sales target
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            {/* Search Bar */}
                            <div className="mb-6 relative">
                                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search salespeople by name or email..."
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Salespeople Table */}
                            <div className="overflow-x-auto border border-gray-200 rounded-lg mb-6">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr className="border-b border-gray-200">
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Name</th>
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Email</th>
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Username</th>
                                            <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">Target Status</th>
                                            <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                        {filteredSalesPersons.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                                    <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                                                    <p className="font-medium">No salespeople found</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredSalesPersons.map((person) => {
                                                const existingTarget = salesPersonTargets[person.name];
                                                const monthName = new Date(formData.year, formData.month - 1).toLocaleString('default', { month: 'long' });
                                                
                                                return (
                                                <tr key={person.id} className="border-b border-gray-100 hover:bg-blue-50">
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{person.name}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-700">{person.email}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-700">{person.username}</td>
                                                    <td className="px-6 py-4 text-sm">
                                                        {existingTarget ? (
                                                            <div className="flex items-center gap-2">
                                                                <Badge className="bg-green-100 text-green-800 border-green-300">
                                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                                    Target Set for {monthName}
                                                                </Badge>
                                                                <span className="text-gray-600 font-medium">
                                                                    ₹{Number(existingTarget.targetAmount).toLocaleString()}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-gray-100 text-gray-600">
                                                                No Target Set
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <Dialog open={showDialog && formData.salesPerson === person.name} onOpenChange={setShowDialog}>
                                                            <DialogTrigger asChild>
                                                                <Button
                                                                    onClick={() => {
                                                                        const target = salesPersonTargets[person.name];
                                                                        setFormData(prev => ({
                                                                            ...prev,
                                                                            salesPerson: person.name,
                                                                            targetAmount: target ? target.targetAmount : '',
                                                                            notes: target ? target.notes || '' : ''
                                                                        }));
                                                                        setEditingTarget(target || null);
                                                                        setShowDialog(true);
                                                                    }}
                                                                    className={existingTarget ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
                                                                    size="sm"
                                                                >
                                                                    {existingTarget ? (
                                                                        <>
                                                                            <Edit className="w-4 h-4 mr-1" />
                                                                            Edit Target
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <TargetIcon className="w-4 h-4 mr-1" />
                                                                            Set Target
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent>
                                                                <DialogHeader>
                                                                    <DialogTitle>
                                                                        {existingTarget ? 'Edit' : 'Set'} Target for {person.name} ({person.username})
                                                                    </DialogTitle>
                                                                    <DialogDescription>
                                                                        {existingTarget 
                                                                            ? `Update the sales target for ${monthName} ${formData.year}`
                                                                            : 'Enter the monthly sales target for this salesperson'
                                                                        }
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <form onSubmit={handleSetTarget} className="space-y-4">
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="year">Year</Label>
                                                                        <Input
                                                                            id="year"
                                                                            name="year"
                                                                            type="number"
                                                                            min="2020"
                                                                            max="2099"
                                                                            value={formData.year}
                                                                            onChange={handleInputChange}
                                                                            required
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="month">Month</Label>
                                                                        <select
                                                                            id="month"
                                                                            name="month"
                                                                            value={formData.month}
                                                                            onChange={handleInputChange}
                                                                            className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                                                                            required
                                                                        >
                                                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                                                                <option key={month} value={month}>
                                                                                    {new Date(2024, month - 1).toLocaleString('default', { month: 'long' })}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="targetAmount">Target Amount (₹)</Label>
                                                                        <Input
                                                                            id="targetAmount"
                                                                            name="targetAmount"
                                                                            type="number"
                                                                            min="0"
                                                                            step="1000"
                                                                            placeholder="Enter target amount"
                                                                            value={formData.targetAmount}
                                                                            onChange={handleInputChange}
                                                                            required
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="notes">Notes (Optional)</Label>
                                                                        <Textarea
                                                                            id="notes"
                                                                            name="notes"
                                                                            placeholder="Add any notes..."
                                                                            value={formData.notes}
                                                                            onChange={handleInputChange}
                                                                            rows="3"
                                                                        />
                                                                    </div>
                                                                    <DialogFooter>
                                                                        <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                                                            Cancel
                                                                        </Button>
                                                                        <Button type="submit" className={existingTarget ? "bg-orange-600 hover:bg-orange-700" : "bg-blue-600 hover:bg-blue-700"}>
                                                                            {existingTarget ? 'Update Target' : 'Set Target'}
                                                                        </Button>
                                                                    </DialogFooter>
                                                                </form>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </td>
                                                </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 2: Bulk Assign Targets */}
                <TabsContent value="bulk-assign" className="space-y-6">
                    <Card className="bg-white border-2 border-gray-200 shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Copy className="w-5 h-5" />
                                Bulk Assign Targets
                            </CardTitle>
                            <CardDescription className="text-purple-100">
                                Assign the same target to multiple salespeople at once
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-6">
                                {/* Bulk Assignment Form */}
                                <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div className="font-bold text-gray-900">
                                            <Label htmlFor="bulk-year">Year</Label></div>
                                            <Input
                                                id="bulk-year"
                                                type="number"
                                                min="2020"
                                                max="2099"
                                                value={formData.year}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    year: Number(e.target.value)
                                                }))}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <div className="font-bold text-gray-900">
                                            <Label htmlFor="bulk-month">Month</Label></div>
                                            <select
                                                id="bulk-month"
                                                value={formData.month}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    month: Number(e.target.value)
                                                }))}
                                                className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"                                            >
                                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                                    <option key={month} value={month}>
                                                        {new Date(2024, month - 1).toLocaleString('default', { month: 'long' })}
                                                    </option>
                                                ))}
                                            </select>
                                           
                                        </div>
                                    </div>

                                    <div className="mt-6 space-y-2">
                                        <div className="font-bold text-gray-900">
                                        <Label htmlFor="bulk-target">Target Amount for All (₹)</Label> </div>
                                        <div className="flex gap-3">
                                            <Input
                                                id="bulk-target"
                                                type="number"
                                                min="0"
                                                step="1000"
                                                placeholder="Enter target amount"
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleBulkSetTargets(e.target.value);
                                                    }
                                                }}
                                            />
                                            <Button
                                                onClick={(e) => {
                                                    const input = document.getElementById('bulk-target');
                                                    handleBulkSetTargets(input.value);
                                                }}
                                                className="bg-purple-600 hover:bg-purple-700 text-white whitespace-nowrap"
                                            >
                                                Apply to All
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Affected Salespeople Preview */}
                                <div className="space-y-3">
                                    <h3 className="font-bold text-gray-900">Salespeople to be assigned ({filteredSalesPersons.length}):</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                                        {filteredSalesPersons.length === 0 ? (
                                            <div className="col-span-full text-center py-8 text-gray-500">
                                                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                                                No salespeople found
                                            </div>
                                        ) : (
                                            filteredSalesPersons.map((person) => (
                                                <div key={person.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:bg-purple-50">
                                                    <p className="font-medium text-gray-900">{person.name}</p>
                                                    <p className="text-sm text-gray-600">{person.email}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default SetSalesTarget;