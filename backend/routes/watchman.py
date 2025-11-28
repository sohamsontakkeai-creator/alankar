"""
Watchman Routes Module
API endpoints for watchman operations (gate security)
"""
from flask import Blueprint, request, jsonify, current_app, send_from_directory
import os
from werkzeug.utils import secure_filename
from services.watchman_service import WatchmanService
from services.guest_list_service import GuestListService
from models import AuditAction, AuditModule, GatePass
from services.audit_service import AuditService
import traceback

watchman_bp = Blueprint('watchman', __name__)


@watchman_bp.route('/watchman/uploads/<path:filename>', methods=['GET'])
def serve_uploaded_file(filename):
    """Serve uploaded files (photos)"""
    try:
        upload_folder = os.path.join(os.getcwd(), 'backend', 'uploads')
        return send_from_directory(upload_folder, filename)
    except Exception as e:
        return jsonify({'error': 'File not found'}), 404


@watchman_bp.route('/watchman/test-endpoint', methods=['GET'])
def test_endpoint():
    """Test endpoint to verify watchman blueprint is working"""
    print("========== WATCHMAN TEST ENDPOINT CALLED ==========")
    return jsonify({'status': 'Watchman blueprint is working!', 'message': 'If you see this, the blueprint is registered correctly'}), 200

@watchman_bp.route('/watchman/pending-pickups', methods=['GET'])
def get_pending_pickups():
    """Get all pending customer pickups waiting for verification"""
    try:
        pickups = WatchmanService.get_pending_pickups()
        return jsonify(pickups), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/gate-passes', methods=['GET'])
def get_all_gate_passes():
    """Get all gate passes (completed and pending)"""
    try:
        passes = WatchmanService.get_all_gate_passes()
        return jsonify(passes), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/verify/<int:gate_pass_id>', methods=['POST'])
def verify_customer_pickup(gate_pass_id):
    """Verify customer identity and complete pickup or send in.

    Accepts JSON body or multipart/form-data with optional images:
      - sendInPhoto -> file when action == 'send_in'
      - afterLoadingPhoto -> file when action == 'release' (after loading)
    """
    try:
        # Support both JSON and multipart
        if request.content_type and request.content_type.startswith('multipart/form-data'):
            data = request.form.to_dict() or {}
        else:
            data = request.get_json() or {}

        action = data.get('action', 'release')

        # Handle file uploads
        upload_folder = os.path.join(os.getcwd(), 'backend', 'uploads')
        os.makedirs(upload_folder, exist_ok=True)

        # Get backend base URL from config
        backend_url = current_app.config.get('BACKEND_BASE_URL', 'http://localhost:5000')

        saved_files = {}
        # send in photo
        if 'sendInPhoto' in request.files:
            f = request.files['sendInPhoto']
            if f and f.filename:
                filename = secure_filename(f.filename)
                filepath = os.path.join(upload_folder, filename)
                f.save(filepath)
                # Store full URL for direct browser access
                saved_files['send_in_photo'] = f'{backend_url}/api/watchman/uploads/{filename}'

        # after loading photo
        if 'afterLoadingPhoto' in request.files:
            f = request.files['afterLoadingPhoto']
            if f and f.filename:
                filename = secure_filename(f.filename)
                filepath = os.path.join(upload_folder, filename)
                f.save(filepath)
                # Store full URL for direct browser access
                saved_files['after_loading_photo'] = f'{backend_url}/api/watchman/uploads/{filename}'

        # Merge files info into data passed to service
        data.update(saved_files)

        result = WatchmanService.verify_customer_identity(gate_pass_id, data, action)

        # Create audit log for verification attempt (before checking identity mismatch)
        try:
            # Fetch gate pass directly from database to ensure we get correct data
            gate_pass_obj = GatePass.query.get(gate_pass_id)
            
            if gate_pass_obj:
                user_name = data.get('verifiedBy') or request.headers.get('X-User-Email', 'Unknown User')
                customer_name = gate_pass_obj.party_name or 'Unknown'
                order_number = gate_pass_obj.order_number or 'N/A'
                vehicle = gate_pass_obj.vehicle_no or 'N/A'
                
                action_desc = {
                    'send_in': 'sent customer in for loading',
                    'release': 'released customer after loading',
                    'approve': 'verified customer identity'
                }.get(action, 'processed')
                
                description = f"{user_name} {action_desc} - Customer: {customer_name}, Order: {order_number}, Vehicle: {vehicle}"
                
                AuditService.log_activity(
                    action=AuditAction.APPROVE,
                    module=AuditModule.SECURITY,
                    resource_type='gate_pass',
                    resource_id=str(gate_pass_id),
                    description=description,
                    username=user_name,
                    new_values={
                        'action': action,
                        'customer_name': customer_name,
                        'order_number': order_number,
                        'vehicle': vehicle,
                        'status': result.get('status')
                    }
                )
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create security audit log: {audit_error}")
            import traceback
            traceback.print_exc()

        # Handle identity mismatch case AFTER audit log
        if result.get('status') == 'identity_mismatch':
            return jsonify(result), 409

        return jsonify(result), 200

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/reject/<int:gate_pass_id>', methods=['POST'])
def reject_customer_pickup(gate_pass_id):
    """Reject customer pickup for security reasons"""
    try:
        data = request.get_json() or {}
        rejection_reason = data.get('rejectionReason', 'No reason provided')
        
        result = WatchmanService.reject_pickup(gate_pass_id, rejection_reason)
        
        # Create audit log for rejection
        try:
            # Fetch gate pass directly from database to ensure we get correct data
            gate_pass_obj = GatePass.query.get(gate_pass_id)
            
            if gate_pass_obj:
                user_name = request.headers.get('X-User-Email', 'Unknown User')
                customer_name = gate_pass_obj.party_name or 'Unknown'
                order_number = gate_pass_obj.order_number or 'N/A'
                
                description = f"{user_name} rejected pickup - Customer: {customer_name}, Order: {order_number}, Reason: {rejection_reason}"
                
                AuditService.log_activity(
                    action=AuditAction.REJECT,
                    module=AuditModule.SECURITY,
                    resource_type='gate_pass',
                    resource_id=str(gate_pass_id),
                    description=description,
                    username=user_name,
                    new_values={
                        'rejection_reason': rejection_reason,
                        'customer_name': customer_name,
                        'order_number': order_number,
                        'status': 'rejected'
                    }
                )
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create security rejection audit log: {audit_error}")
            import traceback
            traceback.print_exc()
        
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/summary', methods=['GET'])
def get_daily_summary():
    """Get daily summary of watchman activities"""
    try:
        summary = WatchmanService.get_daily_summary()
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/search', methods=['GET'])
def search_gate_passes():
    """Search gate passes by customer name, order number, or vehicle number"""
    try:
        search_term = request.args.get('q', '').strip()
        if not search_term:
            return jsonify({'error': 'Search term is required'}), 400
        
        results = WatchmanService.search_gate_pass(search_term)
        
        # Create audit log for search
        try:
            user_name = request.headers.get('X-User-Email', 'Unknown User')
            description = f"{user_name} searched gate passes - Search term: '{search_term}', Results found: {len(results)}"
            
            AuditService.log_activity(
                action=AuditAction.VIEW,
                module=AuditModule.SECURITY,
                resource_type='gate_pass',
                description=description,
                username=user_name,
                new_values={
                    'search_term': search_term,
                    'results_count': len(results)
                }
            )
        except Exception as audit_error:
            print(f"Audit logging error: {audit_error}")
        
        return jsonify({
            'searchTerm': search_term,
            'results': results,
            'count': len(results)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Guest List Routes
@watchman_bp.route('/watchman/guests', methods=['GET'])
def get_all_guests():
    """Get all guest entries with optional filters"""
    try:
        filters = {
            'status': request.args.get('status'),
            'startDate': request.args.get('startDate'),
            'endDate': request.args.get('endDate'),
            'search': request.args.get('search')
        }
        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}
        
        guests = GuestListService.get_all_guests(filters if filters else None)
        return jsonify(guests), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/guests/today', methods=['GET'])
def get_todays_guests():
    """Get all guests scheduled for today"""
    try:
        guests = GuestListService.get_todays_guests()
        return jsonify(guests), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/guests/summary', methods=['GET'])
def get_guest_summary():
    """Get summary statistics for guest visits"""
    try:
        summary = GuestListService.get_guest_summary()
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/guests/<int:guest_id>', methods=['GET'])
def get_guest_by_id(guest_id):
    """Get a specific guest entry by ID"""
    try:
        guest = GuestListService.get_guest_by_id(guest_id)
        return jsonify(guest), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/guests', methods=['POST'])
def create_guest():
    """Create a new guest entry"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['guestName', 'meetingPerson', 'visitDate', 'purpose']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        created_by = request.headers.get('X-User-Email', 'Unknown User')
        guest = GuestListService.create_guest_entry(data, created_by)
        return jsonify(guest), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/guests/<int:guest_id>', methods=['PUT'])
def update_guest(guest_id):
    """Update guest entry details"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        guest = GuestListService.update_guest(guest_id, data)
        return jsonify(guest), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/guests/<int:guest_id>/check-in', methods=['POST'])
def check_in_guest(guest_id):
    """Check in a guest (mark arrival)"""
    try:
        data = request.get_json() or {}
        guest = GuestListService.check_in_guest(guest_id, data)
        return jsonify(guest), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/guests/<int:guest_id>/check-out', methods=['POST'])
def check_out_guest(guest_id):
    """Check out a guest (mark departure)"""
    try:
        data = request.get_json() or {}
        notes = data.get('notes')
        guest = GuestListService.check_out_guest(guest_id, notes)
        return jsonify(guest), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/guests/<int:guest_id>/cancel', methods=['POST'])
def cancel_guest(guest_id):
    """Cancel a guest visit"""
    try:
        data = request.get_json() or {}
        reason = data.get('reason')
        guest = GuestListService.cancel_guest(guest_id, reason)
        return jsonify(guest), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/guests/<int:guest_id>', methods=['DELETE'])
def delete_guest(guest_id):
    """Delete a guest entry"""
    try:
        result = GuestListService.delete_guest(guest_id)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# New endpoints: company vehicle returns listing and check-in
@watchman_bp.route('/watchman/company-vehicle-returns', methods=['GET'])
def get_company_vehicle_returns():
    """Return list of company vehicle return notifications for watchman"""
    try:
        # We reuse NotificationService in services.notification_service
        from services.notification_service import NotificationService
        notifs = NotificationService.get_notifications(department='watchman', unread_only=True, limit=50)
        # Filter only company vehicle return type
        returns = [n for n in notifs if n.get('type') == 'company_vehicle_return']
        return jsonify(returns), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@watchman_bp.route('/watchman/company-vehicle-returns/<int:vehicle_id>/check-in', methods=['POST'])
def checkin_company_vehicle(vehicle_id):
    """Watchman checks in the returning company vehicle, set vehicle available."""
    try:
        from services.transport_service import TransportService
        # Mark driver reached which will set vehicle available
        result = TransportService.mark_driver_reached(vehicle_id)

        # Also mark related notifications as read (best-effort)
        from services.notification_service import NotificationService
        # mark any matching notification read
        for n in NotificationService._notifications:
            data = n.get('data') or {}
            if n.get('type') == 'company_vehicle_return' and int(data.get('vehicleId') or 0) == int(vehicle_id):
                n['read'] = True

        # Create audit log for vehicle check-in
        try:
            user_name = request.headers.get('X-User-Email', 'Unknown User')
            
            # Extract data from the vehicle object in result
            vehicle_data = result.get('vehicle', {})
            vehicle_number = vehicle_data.get('vehicle_number', 'Unknown')
            driver_name = vehicle_data.get('driver_name', 'Unknown')
            
            description = f"{user_name} checked in company vehicle - Vehicle: {vehicle_number}, Driver: {driver_name}, Status: Available"
            
            AuditService.log_activity(
                action=AuditAction.UPDATE,
                module=AuditModule.SECURITY,
                resource_type='company_vehicle',
                resource_id=str(vehicle_id),
                description=description,
                username=user_name,
                new_values={
                    'vehicle_number': vehicle_number,
                    'driver_name': driver_name,
                    'status': 'available',
                    'action': 'checked_in'
                }
            )
        except Exception as audit_error:
            print(f"Audit logging error: {audit_error}")

        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Public Guest Addition Endpoint (accessible to all employees)
@watchman_bp.route('/guests/add', methods=['POST'])
def add_guest_public():
    """
    Create a new guest entry from any department.
    This endpoint allows all employees to add guests.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        required_fields = ['guestName', 'meetingPerson', 'visitDate', 'purpose']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Capture who added the guest from request header
        created_by = request.headers.get('X-User-Email', 'employee')
        guest = GuestListService.create_guest_entry(data, created_by)
        return jsonify(guest), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500
