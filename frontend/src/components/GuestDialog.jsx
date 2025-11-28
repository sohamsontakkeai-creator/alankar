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
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from './ui/select';
import { useToast } from './ui/use-toast';
import { UserCheck, User, Users, Calendar, FileText, Save } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export const GuestDialog = ({ open, onOpenChange, onSuccess = null }) => {
    const { toast } = useToast();
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
    const [loading, setLoading] = useState(false);

    const resetForm = () => {
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
    };

    const handleClose = () => {
        resetForm();
        onOpenChange(false);
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

            setLoading(true);

            // Use the public endpoint that accepts guests from any department
            const response = await fetch(`${API_BASE}/guests/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(guestForm)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add guest');
            }

            toast({
                title: "Success",
                description: "Guest added successfully"
            });

            resetForm();
            onOpenChange(false);
            
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('Error adding guest:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to add guest",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-green-600" />
                        Add New Guest
                    </DialogTitle>
                    <DialogDescription>
                        Register a new visitor to your department
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Guest Information */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Guest Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="guestName">Guest Name *</Label>
                                <Input
                                    id="guestName"
                                    value={guestForm.guestName}
                                    onChange={(e) => setGuestForm(prev => ({ ...prev, guestName: e.target.value }))}
                                    placeholder="Enter guest name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="guestContact">Contact Number</Label>
                                <Input
                                    id="guestContact"
                                    value={guestForm.guestContact}
                                    onChange={(e) => setGuestForm(prev => ({ ...prev, guestContact: e.target.value }))}
                                    placeholder="Enter contact number"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="guestEmail">Email</Label>
                                <Input
                                    id="guestEmail"
                                    type="email"
                                    value={guestForm.guestEmail}
                                    onChange={(e) => setGuestForm(prev => ({ ...prev, guestEmail: e.target.value }))}
                                    placeholder="Enter email address"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="guestCompany">Company</Label>
                                <Input
                                    id="guestCompany"
                                    value={guestForm.guestCompany}
                                    onChange={(e) => setGuestForm(prev => ({ ...prev, guestCompany: e.target.value }))}
                                    placeholder="Enter company name"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Meeting Information */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Meeting Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="meetingPerson">Meeting Person *</Label>
                                <Input
                                    id="meetingPerson"
                                    value={guestForm.meetingPerson}
                                    onChange={(e) => setGuestForm(prev => ({ ...prev, meetingPerson: e.target.value }))}
                                    placeholder="Person to meet"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="meetingPersonDepartment">Department</Label>
                                <Input
                                    id="meetingPersonDepartment"
                                    value={guestForm.meetingPersonDepartment}
                                    onChange={(e) => setGuestForm(prev => ({ ...prev, meetingPersonDepartment: e.target.value }))}
                                    placeholder="Department"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="meetingPersonContact">Contact Number</Label>
                                <Input
                                    id="meetingPersonContact"
                                    value={guestForm.meetingPersonContact}
                                    onChange={(e) => setGuestForm(prev => ({ ...prev, meetingPersonContact: e.target.value }))}
                                    placeholder="Contact number"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Visit Details */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Visit Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="visitDate">Visit Date *</Label>
                                <Input
                                    id="visitDate"
                                    type="date"
                                    value={guestForm.visitDate}
                                    onChange={(e) => setGuestForm(prev => ({ ...prev, visitDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="visitTime">Visit Time</Label>
                                <Input
                                    id="visitTime"
                                    type="time"
                                    value={guestForm.visitTime}
                                    onChange={(e) => setGuestForm(prev => ({ ...prev, visitTime: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="purpose">Purpose of Visit *</Label>
                                <Textarea
                                    id="purpose"
                                    value={guestForm.purpose}
                                    onChange={(e) => setGuestForm(prev => ({ ...prev, purpose: e.target.value }))}
                                    placeholder="Enter purpose of visit"
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Additional Information */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Additional Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                                <Input
                                    id="vehicleNumber"
                                    value={guestForm.vehicleNumber}
                                    onChange={(e) => setGuestForm(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                                    placeholder="Enter vehicle number"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="idProofType">ID Proof Type</Label>
                                <Select
                                    value={guestForm.idProofType}
                                    onValueChange={(value) => setGuestForm(prev => ({ ...prev, idProofType: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select ID type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Aadhar Card">Aadhar Card</SelectItem>
                                        <SelectItem value="PAN Card">PAN Card</SelectItem>
                                        <SelectItem value="Driving License">Driving License</SelectItem>
                                        <SelectItem value="Passport">Passport</SelectItem>
                                        <SelectItem value="Voter ID">Voter ID</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="idProofNumber">ID Proof Number</Label>
                                <Input
                                    id="idProofNumber"
                                    value={guestForm.idProofNumber}
                                    onChange={(e) => setGuestForm(prev => ({ ...prev, idProofNumber: e.target.value }))}
                                    placeholder="Enter ID proof number"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={guestForm.notes}
                                    onChange={(e) => setGuestForm(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Additional notes"
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleGuestSubmit}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={loading}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Adding...' : 'Add Guest'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};