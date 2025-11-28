"""
Assembly order API routes
"""
from flask import Blueprint, request, jsonify
from services import AssemblyService
from services.audit_service import AuditService
from models import AuditAction, AuditModule

assembly_bp = Blueprint('assembly', __name__)

@assembly_bp.route('/assembly-orders', methods=['GET'])
def get_assembly_orders():
    """Get assembly orders ready for processing"""
    try:
        orders = AssemblyService.get_ready_assembly_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assembly_bp.route('/assembly-orders/all', methods=['GET'])
def get_all_assembly_orders():
    """Get all assembly orders"""
    try:
        orders = AssemblyService.get_all_assembly_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assembly_bp.route('/assembly-orders/<int:order_id>', methods=['GET'])
def get_assembly_order(order_id):
    """Get a specific assembly order"""
    try:
        order = AssemblyService.get_assembly_order_by_id(order_id)
        return jsonify(order), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assembly_bp.route('/assembly-orders/<int:order_id>', methods=['PUT'])
def update_assembly_order(order_id):
    """Update assembly order (comprehensive update)"""
    try:
        data = request.get_json()
        order = AssemblyService.update_assembly_order(order_id, data)
        
        # Log assembly update
        user_name = data.get('updatedBy') or request.headers.get('X-User-Email', 'Unknown User')
        status = data.get('status', 'updated')
        
        if status == 'completed':
            AuditService.log_activity(
                action=AuditAction.UPDATE,
                module=AuditModule.PRODUCTION,
                resource_type='AssemblyOrder',
                resource_id=str(order_id),
                resource_name=f'Assembly Order #{order_id}',
                description=f'{user_name} completed Assembly Order #{order_id} - Quality: {data.get("quality_status", "N/A")}',
                username=user_name
            )
        else:
            AuditService.log_activity(
                action=AuditAction.UPDATE,
                module=AuditModule.PRODUCTION,
                resource_type='AssemblyOrder',
                resource_id=str(order_id),
                resource_name=f'Assembly Order #{order_id}',
                description=f'{user_name} updated Assembly Order #{order_id} - Status: {status}',
                username=user_name
            )
        
        return jsonify(order), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assembly_bp.route('/assembly-orders/<int:order_id>/status', methods=['PUT'])
def update_assembly_order_status(order_id):
    """Update assembly order status only"""
    try:
        data = request.get_json()
        if 'status' not in data:
            return jsonify({'error': 'Status is required'}), 400
            
        order = AssemblyService.update_assembly_status(order_id, data['status'])
        return jsonify(order), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assembly_bp.route('/assembly-orders/<int:order_id>/progress', methods=['PUT'])
def update_assembly_progress(order_id):
    """Update assembly progress only"""
    try:
        data = request.get_json()
        if 'progress' not in data:
            return jsonify({'error': 'Progress value required'}), 400
            
        order = AssemblyService.update_assembly_progress(order_id, data['progress'])
        return jsonify(order), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assembly_bp.route('/assembly/completed', methods=['GET'])
def get_completed_assembly_products():
    """Get completed assembly products ready for showroom"""
    try:
        products = AssemblyService.get_completed_products()
        return jsonify(products), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assembly_bp.route('/assembly/rework-orders', methods=['GET'])
def get_rework_orders():
    """Get rework orders for failed machines"""
    try:
        rework_orders = AssemblyService.get_rework_orders()
        return jsonify(rework_orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assembly_bp.route('/assembly/rework-orders/<int:rework_order_id>', methods=['PUT'])
def update_rework_order(rework_order_id):
    """Update rework order status"""
    try:
        data = request.get_json()
        rework_order = AssemblyService.update_rework_order(rework_order_id, data)
        
        # Log rework update
        user_name = data.get('updatedBy') or request.headers.get('X-User-Email', 'Unknown User')
        status = data.get('status', 'updated')
        
        AuditService.log_activity(
            action=AuditAction.UPDATE,
            module=AuditModule.PRODUCTION,
            resource_type='ReworkOrder',
            resource_id=str(rework_order_id),
            resource_name=f'Rework Order #{rework_order_id}',
            description=f'{user_name} updated Rework Order #{rework_order_id} - Status: {status}',
            username=user_name
        )
        
        return jsonify(rework_order), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assembly_bp.route('/assembly/rework-orders/<int:rework_order_id>/complete', methods=['POST'])
def complete_rework_order(rework_order_id):
    """Complete rework order and send machines back to testing"""
    try:
        data = request.get_json()
        result = AssemblyService.complete_rework_order(rework_order_id, data)
        
        # Log rework completion
        user_name = data.get('completedBy') or request.headers.get('X-User-Email', 'Unknown User')
        
        AuditService.log_activity(
            action=AuditAction.UPDATE,
            module=AuditModule.PRODUCTION,
            resource_type='ReworkOrder',
            resource_id=str(rework_order_id),
            resource_name=f'Rework Order #{rework_order_id}',
            description=f'{user_name} completed Rework Order #{rework_order_id} - Machines returned to testing',
            username=user_name
        )
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
