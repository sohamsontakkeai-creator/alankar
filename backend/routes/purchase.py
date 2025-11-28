"""
Purchase order API routes
"""
from flask import Blueprint, request, jsonify
from services.purchase_service import PurchaseService
from services.audit_service import AuditService
from models import AuditAction, AuditModule, PurchaseOrder

purchase_bp = Blueprint('purchase', __name__)

@purchase_bp.route('/purchase-orders', methods=['GET'])
def get_purchase_orders():
    """Get all purchase orders"""
    try:
        orders = PurchaseService.get_all_purchase_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@purchase_bp.route('/purchase-orders/<int:purchase_order_id>', methods=['GET'])
def get_purchase_order(purchase_order_id):
    """Get a specific purchase order"""
    try:
        order = PurchaseService.get_purchase_order_by_id(purchase_order_id)
        return jsonify(order), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@purchase_bp.route('/purchase-orders/<int:purchase_order_id>/approve', methods=['PUT'])
def approve_purchase_order(purchase_order_id):
    """Approve a purchase order"""
    try:
        data = request.get_json() or {}
        # Get PO details before approval
        po = PurchaseOrder.query.get(purchase_order_id)
        
        result = PurchaseService.approve_purchase_order(purchase_order_id)
        
        # Log approval
        user_name = data.get('approvedBy', 'Purchase Manager')
        if po:
            try:
                quantity = int(po.quantity) if po.quantity else 0
            except (ValueError, TypeError):
                quantity = 0
            
            AuditService.log_activity(
                action=AuditAction.APPROVE,
                module=AuditModule.PURCHASE,
                resource_type='PurchaseOrder',
                resource_id=str(purchase_order_id),
                resource_name=f'PO #{purchase_order_id}',
                description=f'{user_name} approved Purchase Order #{purchase_order_id} for {quantity} units of {po.product_name}',
                username=user_name
            )
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@purchase_bp.route('/purchase-orders/<int:purchase_order_id>', methods=['PUT'])
def update_purchase_order(purchase_order_id):
    """Update purchase order materials and quantities"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        result = PurchaseService.update_purchase_order(purchase_order_id, data)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@purchase_bp.route('/purchase-orders/<int:purchase_order_id>/request-store-check', methods=['PUT'])
def request_store_check(purchase_order_id):
    """Request store check for purchase order"""
    try:
        result = PurchaseService.request_store_check(purchase_order_id)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@purchase_bp.route('/purchase-orders/<int:purchase_order_id>/request-finance-approval', methods=['PUT'])
def request_finance_approval(purchase_order_id):
    """Request finance approval for purchase order"""
    try:
        data = request.get_json() or {}
        # Get PO details
        po = PurchaseOrder.query.get(purchase_order_id)
        
        result = PurchaseService.request_finance_approval(purchase_order_id)
        
        # Log finance approval request
        user_name = data.get('requestedBy') or request.headers.get('X-User-Email', 'Unknown User')
        if po:
            try:
                quantity = int(po.quantity) if po.quantity else 0
            except (ValueError, TypeError):
                quantity = 0
            
            AuditService.log_activity(
                action=AuditAction.SUBMIT,
                module=AuditModule.PURCHASE,
                resource_type='PurchaseOrder',
                resource_id=str(purchase_order_id),
                resource_name=f'PO #{purchase_order_id}',
                description=f'{user_name} sent Purchase Order #{purchase_order_id} to Finance for approval - Product: {po.product_name} - Quantity: {quantity} units',
                username=user_name
            )
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500