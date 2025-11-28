"""
Production order API routes
"""
from flask import Blueprint, request, jsonify
from services import ProductionService
from services.audit_service import AuditService
from models import AuditAction, AuditModule
from utils.audit_middleware import audit_route

production_bp = Blueprint('production', __name__)

@production_bp.route('/production-orders', methods=['GET'])
def get_production_orders():
    """Get all production orders"""
    try:
        orders = ProductionService.get_all_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@production_bp.route('/production-orders', methods=['POST'])
def create_production_order():
    """Create a new production order"""
    try:
        data = request.get_json()
        result = ProductionService.create_production_order(data)
        
        # Get user name and details
        user_name = data.get('createdBy') or request.headers.get('X-User-Email', 'Unknown User')
        
        # Get quantity safely
        try:
            quantity = int(data.get('quantity', 0))
        except (ValueError, TypeError):
            quantity = 0
        
        # Extract production order details from result
        production_order = result.get('productionOrder', {})
        order_id = production_order.get('id', 'N/A')
        
        # Get product name from the data
        product_name = data.get('productName', 'Product')
        category = data.get('category', '')
        
        # Create a readable product description
        product_desc = f"{product_name} ({category})" if category else product_name
        
        AuditService.log_activity(
            action=AuditAction.CREATE,
            module=AuditModule.PRODUCTION,
            resource_type='ProductionOrder',
            resource_id=str(order_id),
            resource_name=f'Production Order #{order_id}',
            description=f'{user_name} created Production Order #{order_id} for {quantity} units of {product_desc}',
            username=user_name
        )
        
        return jsonify(result), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@production_bp.route('/production-orders/<int:order_id>', methods=['GET'])
def get_production_order(order_id):
    """Get a specific production order"""
    try:
        order = ProductionService.get_order_by_id(order_id)
        return jsonify(order), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@production_bp.route('/production-orders/<int:order_id>', methods=['PUT'])
def update_production_order(order_id):
    """Update a production order"""
    try:
        data = request.get_json()
        order = ProductionService.update_production_order(order_id, data)
        
        # Get user name
        user_name = data.get('updatedBy') or request.headers.get('X-User-Email', 'Unknown User')
        
        # Check if status changed to completed
        if data.get('status') == 'completed':
            try:
                quantity = int(data.get('quantity', 0))
            except (ValueError, TypeError):
                quantity = 0
            
            AuditService.log_activity(
                action=AuditAction.UPDATE,
                module=AuditModule.PRODUCTION,
                resource_type='ProductionOrder',
                resource_id=str(order_id),
                resource_name=f'Production Order #{order_id}',
                description=f'{user_name} completed Production Order #{order_id} - {quantity} units produced',
                username=user_name
            )
        else:
            AuditService.log_activity(
                action=AuditAction.UPDATE,
                module=AuditModule.PRODUCTION,
                resource_type='ProductionOrder',
                resource_id=str(order_id),
                resource_name=f'Production Order #{order_id}',
                description=f'{user_name} updated Production Order #{order_id} - Status: {data.get("status", "N/A")}',
                username=user_name
            )
        
        return jsonify(order), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@production_bp.route('/production-orders/<int:order_id>', methods=['DELETE'])
def delete_production_order(order_id):
    """Delete a production order"""
    try:
        result = ProductionService.delete_production_order(order_id)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500