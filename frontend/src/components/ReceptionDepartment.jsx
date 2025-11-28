import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
    Users,
    UserCheck,
    UserX,
    Plus,
    Edit,
    Search,
    Calendar,
    Building,
    Phone,
    Mail,
    Save,
    ArrowLeft,
    Clock,
    BarChart3,
    RefreshCw
} from 'lucide-react';

import { API_BASE } from '@/lib/api';
import LeaveRequestButton from '@/components/LeaveRequestButton';
import ManagerLeaveApprovalButton from '@/components/ManagerLeaveApprovalButton';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { AutoRefreshIndicator } from '@/components/AutoRefreshIndicator';

const ReceptionDepartment = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [activeTab, setActiveTab] = useState('dashboard');
    const [guests, setGuests] = useState([]);
    const [guestSummary, setGuestSummary] = useState({});
    const [loading, setLoading] = useState(true);
    const [showGuestDialog, setShowGuestDialog] = useState(false);
    const [guestDialogMode, setGuestDialogMode] = useState('add');
    const [selectedGuest, setSelectedGuest] = useState(null);
    const [guestSearchTerm, setGuestSearchTerm] = useState('');
    const [guestForm, setGuestForm] = useState({
        guestName: '',
        guestContact: '',
        guestEmail: '',
        guestCompany: '',
        meetingPerson: '',
        meetingPersonDepartment: '',
        meetingPersonContact: '',
        visitDate: '',
        visitTime: '',
        purpose: '',
        vehicleNumber: '',
        idProofType: '',
        idProofNumber: '',
        notes: ''
    });

    const fetchGuests = async () => {
        try {
            setLoading(true);
            const [guestsRes, summaryRes] = await Promise.all([
                fetch(`${API_BASE}/reception/guests`),
                fetch(`${API_BASE}/reception/guests/summary`)
            ]);

            if (guestsRes.ok) {
                const guestsData = await guestsRes.json();
                setGuests(guestsData);
            }

            if (summaryRes.ok) {
                const summaryData = await summaryRes.json();
                setGuestSummary(summaryData);
            }
        } catch (error) {
            console.error('Error fetching guests:', error);
            toast({
                title: "Error",
                description: "Failed to fetch guest list",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGuests();
    }, []);

    // Auto-refresh every 10 seconds
    const { isRefreshing: autoRefreshing, lastRefreshTime, isPaused } = useAutoRefresh(
        fetchGuests,
        10000,
        { enabled: true, pauseOnInput: true, pauseOnModal: true }
    );

    const openGuestDialog = (mode, guest = null) => {
        setGuestDialogMode(mode);
        setSelectedGuest(guest);
        if (guest && (mode === 'edit' || mode === 'view')) {
            setGuestForm({
                guestName: guest.guestName || '',
                guestContact: guest.guestContact || '',
                guestEmail: guest.guestEmail || '',
                guestCompany: guest.guestCompany || '',
                meetingPerson: guest.meetingPerson || '',
                meetingPersonDepartment: guest.meetingPersonDepartment || '',
                meetingPersonContact: guest.meetingPersonContact || '',
                visitDate: guest.visitDate || '',
                visitTime: guest.visitTime || '',
                purpose: guest.purpose || '',
                vehicleNumber: guest.vehicleNumber || '',
                idProofType: guest.idProofType || '',
                idProofNumber: guest.idProofNumber || '',
                notes: guest.notes || ''
            });
        } else {
            setGuestForm({
                guestName: '',
                guestContact: '',
                guestEmail: '',
                guestCompany: '',
                meetingPerson: '',
                meetingPersonDepartment: '',
                meetingPersonContact: '',
                visitDate: '',
                visitTime: '',
                purpose: '',
                vehicleNumber: '',
                idProofType: '',
                idProofNumber: '',
                notes: ''
            });
        }
        setShowGuestDialog(true);
    };

    const closeGuestDialog = () => {
        setShowGuestDialog(false);
        setGuestDialogMode('add');
        setSelectedGuest(null);
    };

    const handleGuestSubmit = async () => {
        try {
            if (!guestForm.guestName || !guestForm.meetingPerson || !guestForm.visitDate || !guestForm.purpose) {
                toast({
                    title: "Missing Information",
                    description: "Guest name, meeting person, visit date, and purpose are required.",
                    variant: "destructive"
                });
                return;
            }

            const url = guestDialogMode === 'add' 
                ? `${API_BASE}/reception/guests` 
                : `${API_BASE}/reception/guests/${selectedGuest.id}`;
            const method = guestDialogMode === 'add' ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(guestForm)
            });

            if (!response.ok) throw new Error('Failed to save guest');

            toast({
                title: "Success",
                description: `Guest ${guestDialogMode === 'add' ? 'added' : 'updated'} successfully`
            });

            closeGuestDialog();
            fetchGuests();
        } catch (error) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleCheckIn = async (guestId) => {
        try {
            const response = await fetch(`${API_BASE}/reception/guests/${guestId}/check-in`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to check in guest');
            }

            toast({
                title: "Success",
                description: "Guest checked in successfully"
            });

            fetchGuests();
        } catch (error) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleCheckOut = async (guestId) => {
        try {
            const response = await fetch(`${API_BASE}/reception/guests/${guestId}/check-out`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to check out guest');
            }

            toast({
                title: "Success",
                description: "Guest checked out successfully"
            });

            fetchGuests();
        } catch (error) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const getGuestStatusBadge = (status) => {
        const statusConfig = {
            'scheduled': {
                className: 'bg-blue-100 text-blue-800 border border-blue-300',
                text: 'Scheduled'
            },
            'checked_in': {
                className: 'bg-green-100 text-green-800 border border-green-300',
                text: 'Checked In'
            },
            'checked_out': {
                className: 'bg-gray-100 text-gray-800 border border-gray-300',
                text: 'Checked Out'
            },
            'cancelled': {
                className: 'bg-red-100 text-red-800 border border-red-300',
                text: 'Cancelled'
            }
        };
        const config = statusConfig[status] || {
            className: 'bg-gray-100 text-gray-800 border border-gray-300',
            text: status
        };
        return <Badge className={`${config.className} font-medium`}>{config.text}</Badge>;
    };

    const filteredGuests = guests.filter((guest) => {
        if (!guestSearchTerm.trim()) return true;
        const searchLower = guestSearchTerm.toLowerCase();
        return (
            guest.guestName?.toLowerCase().includes(searchLower) ||
            guest.meetingPerson?.toLowerCase().includes(searchLower) ||
            guest.guestCompany?.toLowerCase().includes(searchLower) ||
            guest.purpose?.toLowerCase().includes(searchLower)
        );
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
            {/* Header */}
            <div className="max-w-7xl mx-auto bg-white shadow-md border-b-4 border-blue-600 rounded-b-lg">
                <div className="px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/dashboard')}
                                className="flex items-center border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-medium"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                                    <Users className="h-8 w-8 mr-3 text-blue-600" />
                                    Reception 
                                </h1>
                                <p className="text-sm text-gray-600 mt-1">Visitor management and guest information</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {/* Leave Request Button */}
                            <LeaveRequestButton user={user} />

                            {/* Manager Leave Approval Button (only shows for managers) */}
                            <ManagerLeaveApprovalButton user={user} />

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchGuests}
                                className="border-blue-300 hover:bg-blue-50"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2 mb-6 bg-white shadow-sm">
                        <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Dashboard
                        </TabsTrigger>
                        <TabsTrigger value="guests" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900">
                            <Users className="h-4 w-4 mr-2" />
                            Guest List
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="dashboard">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                            <Card className="bg-white shadow-md hover:shadow-lg transition-shadow border-t-4 border-blue-500">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-gray-700 flex items-center">
                                        <Users className="h-4 w-4 mr-2 text-blue-600" />
                                        Total Guests
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-blue-600">
                                        {guestSummary.todayGuests || 0}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white shadow-md hover:shadow-lg transition-shadow border-t-4 border-green-500">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                                        <UserCheck className="h-4 w-4 mr-2 text-green-600" />
                                        Checked In
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-green-600">
                                        {guestSummary.checkedIn || 0}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white shadow-md hover:shadow-lg transition-shadow border-t-4 border-yellow-500">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                                        <Clock className="h-4 w-4 mr-2 text-yellow-600" />
                                        Scheduled
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-yellow-600">
                                        {guestSummary.scheduled || 0}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white shadow-md hover:shadow-lg transition-shadow border-t-4 border-gray-500">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                                        <UserX className="h-4 w-4 mr-2 text-gray-600" />
                                        Checked Out
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-gray-600">
                                        {guestSummary.checkedOut || 0}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="bg-white shadow-md">
                            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50">
                                <CardTitle className="flex items-center text-gray-900 font-bold">
                                    <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                                    Today's Visitors
                                </CardTitle>
                                <CardDescription className="text-gray-600">Guests scheduled or checked in today</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    {guests.filter(g => {
                                        const today = new Date().toISOString().split('T')[0];
                                        return g.visitDate === today && g.status !== 'checked_out';
                                    }).length === 0 ? (
                                        <div className="text-center py-12">
                                            <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                                            <p className="text-gray-500 font-medium">No visitors today</p>
                                        </div>
                                    ) : (
                                        guests.filter(g => {
                                            const today = new Date().toISOString().split('T')[0];
                                            return g.visitDate === today && g.status !== 'checked_out';
                                        }).map((guest) => (
                                            <div key={guest.id} className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all bg-gray-50">
                                                <div className="flex-1">
                                                    <div className="font-bold text-gray-900 text-lg">{guest.guestName}</div>
                                                    <div className="text-sm text-gray-700 mt-1">
                                                        <span className="font-semibold text-gray-800">Meeting:</span> {guest.meetingPerson} | {guest.purpose}
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    {getGuestStatusBadge(guest.status)}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="guests">
                        <Card className="bg-white shadow-md">
                            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50">
                                <CardTitle className="flex items-center text-gray-900 font-bold">
                                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                                    Guest List
                                </CardTitle>
                                <CardDescription className="text-gray-600">All visitor records</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="mb-6">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                                        <Input
                                            placeholder="Search guests by name, company, or meeting person..."
                                            value={guestSearchTerm}
                                            onChange={(e) => setGuestSearchTerm(e.target.value)}
                                            className="pl-10 border-2 border-gray-300 focus:border-blue-400 focus:ring-blue-400 text-gray-900"
                                        />
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-100 border-b-2 border-gray-300">
                                                <TableHead className="font-bold text-gray-900">Guest Name</TableHead>
                                                <TableHead className="font-bold text-gray-900">Company</TableHead>
                                                <TableHead className="font-bold text-gray-900">Meeting Person</TableHead>
                                                <TableHead className="font-bold text-gray-900">Visit Date</TableHead>
                                                <TableHead className="font-bold text-gray-900">Purpose</TableHead>
                                                <TableHead className="font-bold text-gray-900">Status</TableHead>
                                                <TableHead className="font-bold text-gray-900">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredGuests.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                                                        No guests found
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredGuests.map((guest) => (
                                                    <TableRow key={guest.id} className="hover:bg-blue-50">
                                                        <TableCell className="font-bold text-gray-900">{guest.guestName}</TableCell>
                                                        <TableCell className="text-gray-700">{guest.guestCompany || '-'}</TableCell>
                                                        <TableCell className="text-gray-700">{guest.meetingPerson}</TableCell>
                                                        <TableCell className="text-gray-700">{guest.visitDate}</TableCell>
                                                        <TableCell className="max-w-xs truncate text-gray-700">{guest.purpose}</TableCell>
                                                        <TableCell>{getGuestStatusBadge(guest.status)}</TableCell>
                                                        <TableCell>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => openGuestDialog('view', guest)}
                                                                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                                            >
                                                                View Details
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Guest Dialog */}
            <Dialog open={showGuestDialog} onOpenChange={closeGuestDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {guestDialogMode === 'add' ? 'Add New Guest' : guestDialogMode === 'edit' ? 'Edit Guest' : 'Guest Details'}
                        </DialogTitle>
                        <DialogDescription>
                            {guestDialogMode === 'view' ? 'View guest information' : 'Fill in the guest information'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="guestName">Guest Name *</Label>
                            <Input
                                id="guestName"
                                value={guestForm.guestName}
                                onChange={(e) => setGuestForm({ ...guestForm, guestName: e.target.value })}
                                disabled={guestDialogMode === 'view'}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="guestContact">Contact Number</Label>
                            <Input
                                id="guestContact"
                                value={guestForm.guestContact}
                                onChange={(e) => setGuestForm({ ...guestForm, guestContact: e.target.value })}
                                disabled={guestDialogMode === 'view'}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="guestEmail">Email</Label>
                            <Input
                                id="guestEmail"
                                type="email"
                                value={guestForm.guestEmail}
                                onChange={(e) => setGuestForm({ ...guestForm, guestEmail: e.target.value })}
                                disabled={guestDialogMode === 'view'}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="guestCompany">Company</Label>
                            <Input
                                id="guestCompany"
                                value={guestForm.guestCompany}
                                onChange={(e) => setGuestForm({ ...guestForm, guestCompany: e.target.value })}
                                disabled={guestDialogMode === 'view'}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="meetingPerson">Meeting Person *</Label>
                            <Input
                                id="meetingPerson"
                                value={guestForm.meetingPerson}
                                onChange={(e) => setGuestForm({ ...guestForm, meetingPerson: e.target.value })}
                                disabled={guestDialogMode === 'view'}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="meetingPersonDepartment">Department</Label>
                            <Input
                                id="meetingPersonDepartment"
                                value={guestForm.meetingPersonDepartment}
                                onChange={(e) => setGuestForm({ ...guestForm, meetingPersonDepartment: e.target.value })}
                                disabled={guestDialogMode === 'view'}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="visitDate">Visit Date *</Label>
                            <Input
                                id="visitDate"
                                type="date"
                                value={guestForm.visitDate}
                                onChange={(e) => setGuestForm({ ...guestForm, visitDate: e.target.value })}
                                disabled={guestDialogMode === 'view'}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="visitTime">Visit Time</Label>
                            <Input
                                id="visitTime"
                                type="time"
                                value={guestForm.visitTime}
                                onChange={(e) => setGuestForm({ ...guestForm, visitTime: e.target.value })}
                                disabled={guestDialogMode === 'view'}
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="purpose">Purpose *</Label>
                            <Textarea
                                id="purpose"
                                value={guestForm.purpose}
                                onChange={(e) => setGuestForm({ ...guestForm, purpose: e.target.value })}
                                disabled={guestDialogMode === 'view'}
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                            <Input
                                id="vehicleNumber"
                                value={guestForm.vehicleNumber}
                                onChange={(e) => setGuestForm({ ...guestForm, vehicleNumber: e.target.value })}
                                disabled={guestDialogMode === 'view'}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="idProofType">ID Proof Type</Label>
                            <Select
                                value={guestForm.idProofType}
                                onValueChange={(value) => setGuestForm({ ...guestForm, idProofType: value })}
                                disabled={guestDialogMode === 'view'}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select ID type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="aadhar">Aadhar Card</SelectItem>
                                    <SelectItem value="pan">PAN Card</SelectItem>
                                    <SelectItem value="driving_license">Driving License</SelectItem>
                                    <SelectItem value="passport">Passport</SelectItem>
                                    <SelectItem value="voter_id">Voter ID</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="idProofNumber">ID Proof Number</Label>
                            <Input
                                id="idProofNumber"
                                value={guestForm.idProofNumber}
                                onChange={(e) => setGuestForm({ ...guestForm, idProofNumber: e.target.value })}
                                disabled={guestDialogMode === 'view'}
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                value={guestForm.notes}
                                onChange={(e) => setGuestForm({ ...guestForm, notes: e.target.value })}
                                disabled={guestDialogMode === 'view'}
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={closeGuestDialog}>
                            {guestDialogMode === 'view' ? 'Close' : 'Cancel'}
                        </Button>
                        {guestDialogMode !== 'view' && (
                            <Button onClick={handleGuestSubmit}>
                                <Save className="h-4 w-4 mr-2" />
                                {guestDialogMode === 'add' ? 'Add Guest' : 'Update Guest'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ReceptionDepartment;
