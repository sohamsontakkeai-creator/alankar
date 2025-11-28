"""
Reception Routes Module
API endpoints for reception department operations
"""
from flask import Blueprint, request, jsonify
from services.guest_list_service import GuestListService
from models import AuditAction, AuditModule
from services.audit_service import AuditService

reception_bp = Blueprint('reception', __name__)


@reception_bp.route('/reception/guests', methods=['GET'])
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


@reception_bp.route('/reception/guests/today', methods=['GET'])
def get_todays_guests():
    """Get all guests scheduled for today"""
    try:
        guests = GuestListService.get_todays_guests()
        return jsonify(guests), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reception_bp.route('/reception/guests/summary', methods=['GET'])
def get_guest_summary():
    """Get summary statistics for guest visits"""
    try:
        summary = GuestListService.get_guest_summary()
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@reception_bp.route('/reception/guests/<int:guest_id>', methods=['GET'])
def get_guest_by_id(guest_id):
    """Get a specific guest entry by ID"""
    try:
        guest = GuestListService.get_guest_by_id(guest_id)
        return jsonify(guest), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Reception department has VIEW-ONLY access
# Guest creation, updates, check-in, and check-out are handled by Security/Watchman department only
