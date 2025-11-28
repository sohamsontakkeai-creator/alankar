"""
Approval Routes
API endpoints for approval management
"""
from flask import Blueprint, request, jsonify
from services.approval_service import ApprovalService
from models import AuditAction, AuditModule
from services.audit_service import AuditService

approval_bp = Blueprint('approval', __name__)

@approval_bp.route('/pending', methods=['GET'])
def get_pending_approvals():
    """Get all pending approval requests"""
    try:
        approvals = ApprovalService.get_pending_approvals()
        return jsonify(approvals), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@approval_bp.route('/all', methods=['GET'])
def get_all_approvals():
    """Get all approval requests"""
    try:
        approvals = ApprovalService.get_all_approvals()
        return jsonify(approvals), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@approval_bp.route('/create', methods=['POST'])
def create_approval_request():
    """Create a new approval request"""
    try:
        data = request.get_json()
        
        if data.get('requestType') == 'free_delivery':
            required_fields = ['salesOrderId', 'requestedBy', 'requestDetails']
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400
            
            result = ApprovalService.create_free_delivery_approval_request(
                sales_order_id=data['salesOrderId'],
                requested_by=data['requestedBy'],
                request_details=data['requestDetails']
            )
        else:
            # Default to coupon approval request
            required_fields = ['salesOrderId', 'requestedBy', 'couponCode', 'discountAmount', 'requestDetails']
            for field in required_fields:
                if field not in data:
                    return jsonify({'error': f'Missing required field: {field}'}), 400
            
            result = ApprovalService.create_coupon_approval_request(
                sales_order_id=data['salesOrderId'],
                requested_by=data['requestedBy'],
                coupon_code=data['couponCode'],
                discount_amount=data['discountAmount'],
                request_details=data['requestDetails']
            )
        
        if result['status'] == 'error':
            return jsonify({'error': result['message']}), 400
        
        return jsonify(result), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@approval_bp.route('/approve/<int:approval_id>', methods=['POST'])
def approve_request(approval_id):
    """Approve an approval request - Admin and Management can approve"""
    try:
        # Check if user has permission to approve (admin or management)
        from utils.jwt_helpers import decode_token
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            user_data = decode_token(token)
            if user_data:
                user_department = user_data.get('department', '').lower()
                if user_department not in ['admin', 'management']:
                    return jsonify({'error': 'Only Admin and Management can approve requests'}), 403
        
        data = request.get_json()
        
        if 'approvedBy' not in data:
            return jsonify({'error': 'Missing required field: approvedBy'}), 400
        
        result = ApprovalService.approve_request(
            approval_id=approval_id,
            approved_by=data['approvedBy'],
            approval_notes=data.get('approvalNotes')
        )
        
        if result['status'] == 'error':
            return jsonify({'error': result['message']}), 400
        
        # Create audit log for approval
        try:
            from models import ApprovalRequest, SalesOrder
            
            approval_req = ApprovalRequest.query.get(approval_id)
            if approval_req:
                sales_order = SalesOrder.query.get(approval_req.sales_order_id) if approval_req.sales_order_id else None
                
                approved_by = data['approvedBy']
                request_type = approval_req.request_type or 'Unknown'
                customer_name = sales_order.customer_name if sales_order else 'Unknown'
                order_number = sales_order.order_number if sales_order else 'N/A'
                
                # Format description based on request type
                if request_type == 'coupon_bypass':
                    coupon_code = approval_req.coupon_code or 'N/A'
                    discount = approval_req.discount_amount or 0
                    description = f"{approved_by} approved coupon bypass - Customer: {customer_name}, Order: {order_number}, Coupon: {coupon_code}, Discount: ₹{discount:,.2f}"
                elif request_type == 'free_delivery':
                    description = f"{approved_by} approved free delivery - Customer: {customer_name}, Order: {order_number}"
                else:
                    description = f"{approved_by} approved {request_type} request - Customer: {customer_name}, Order: {order_number}"
                
                print(f"[AUDIT] Creating admin approval audit log: {description}")
                
                AuditService.log_activity(
                    action=AuditAction.APPROVE,
                    module=AuditModule.APPROVAL,
                    resource_type='approval_request',
                    resource_id=str(approval_id),
                    description=description,
                    username=approved_by,
                    new_values={
                        'request_type': request_type,
                        'customer_name': customer_name,
                        'order_number': order_number,
                        'approved_by': approved_by,
                        'approval_notes': data.get('approvalNotes')
                    }
                )
                print(f"[AUDIT] Admin approval audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create admin approval audit log: {audit_error}")
            import traceback
            traceback.print_exc()
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@approval_bp.route('/reject/<int:approval_id>', methods=['POST'])
def reject_request(approval_id):
    """Reject an approval request - Admin and Management can reject"""
    try:
        # Check if user has permission to reject (admin or management)
        from utils.jwt_helpers import decode_token
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            user_data = decode_token(token)
            if user_data:
                user_department = user_data.get('department', '').lower()
                if user_department not in ['admin', 'management']:
                    return jsonify({'error': 'Only Admin and Management can reject requests'}), 403
        
        data = request.get_json()
        
        required_fields = ['approvedBy', 'approvalNotes']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        result = ApprovalService.reject_request(
            approval_id=approval_id,
            approved_by=data['approvedBy'],
            approval_notes=data['approvalNotes']
        )
        
        if result['status'] == 'error':
            return jsonify({'error': result['message']}), 400
        
        # Create audit log for rejection
        try:
            from models import ApprovalRequest, SalesOrder
            
            approval_req = ApprovalRequest.query.get(approval_id)
            if approval_req:
                sales_order = SalesOrder.query.get(approval_req.sales_order_id) if approval_req.sales_order_id else None
                
                rejected_by = data['approvedBy']
                request_type = approval_req.request_type or 'Unknown'
                customer_name = sales_order.customer_name if sales_order else 'Unknown'
                order_number = sales_order.order_number if sales_order else 'N/A'
                rejection_reason = data.get('approvalNotes', 'No reason provided')
                
                # Format description based on request type
                if request_type == 'coupon_bypass':
                    coupon_code = approval_req.coupon_code or 'N/A'
                    description = f"{rejected_by} rejected coupon bypass - Customer: {customer_name}, Order: {order_number}, Coupon: {coupon_code}, Reason: {rejection_reason}"
                elif request_type == 'free_delivery':
                    description = f"{rejected_by} rejected free delivery - Customer: {customer_name}, Order: {order_number}, Reason: {rejection_reason}"
                else:
                    description = f"{rejected_by} rejected {request_type} request - Customer: {customer_name}, Order: {order_number}, Reason: {rejection_reason}"
                
                print(f"[AUDIT] Creating admin rejection audit log: {description}")
                
                AuditService.log_activity(
                    action=AuditAction.REJECT,
                    module=AuditModule.APPROVAL,
                    resource_type='approval_request',
                    resource_id=str(approval_id),
                    description=description,
                    username=rejected_by,
                    new_values={
                        'request_type': request_type,
                        'customer_name': customer_name,
                        'order_number': order_number,
                        'rejected_by': rejected_by,
                        'rejection_reason': rejection_reason
                    }
                )
                print(f"[AUDIT] Admin rejection audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create admin rejection audit log: {audit_error}")
            import traceback
            traceback.print_exc()
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
