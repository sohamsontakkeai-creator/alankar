"""
Dispatch Routes Module
API endpoints for dispatch operations
"""
from flask import Blueprint, request, jsonify
from services.dispatch_service import DispatchService
from services.audit_service import AuditService
from models import AuditAction, AuditModule
from models.showroom import DispatchRequest, GatePass, TransportJob

dispatch_bp = Blueprint('dispatch', __name__)


@dispatch_bp.route('/dispatch/pending', methods=['GET'])
def get_pending_dispatch_orders():
    """Get all orders pending dispatch processing"""
    try:
        orders = DispatchService.get_pending_dispatch_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/all', methods=['GET'])
def get_all_dispatch_orders():
    """Get all dispatch orders"""
    try:
        orders = DispatchService.get_all_dispatch_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/process/<int:dispatch_id>', methods=['POST'])
def process_dispatch_order(dispatch_id):
    """Process dispatch order based on delivery type"""
    try:
        data = request.get_json()
        
        # Get dispatch request details
        dispatch_req = DispatchRequest.query.get(dispatch_id)
        
        result = DispatchService.process_dispatch_order(dispatch_id, data)
        
        # Log dispatch processing
        user_name = data.get('processedBy') or request.headers.get('X-User-Email', 'Unknown User')
        if dispatch_req:
            delivery_type = dispatch_req.delivery_type
            AuditService.log_activity(
                action=AuditAction.UPDATE,
                module=AuditModule.TRANSPORT,
                resource_type='DispatchRequest',
                resource_id=str(dispatch_id),
                resource_name=f'Dispatch #{dispatch_id}',
                description=f'{user_name} processed dispatch request #{dispatch_id} for customer \'{dispatch_req.party_name}\' - Delivery Type: {delivery_type} - Quantity: {dispatch_req.quantity} units',
                username=user_name
            )
        
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/customer-details/<int:dispatch_id>', methods=['PUT'])
def update_customer_details(dispatch_id):
    """Update customer details for dispatch request"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('partyName'):
            return jsonify({'error': 'Customer name is required'}), 400
        
        result = DispatchService.update_customer_details(dispatch_id, data)
        
        # Create audit log for customer details update
        try:
            user_name = data.get('updatedBy') or request.headers.get('X-User-Email', 'Unknown User')
            customer_name = data.get('partyName', 'Unknown')
            contact = data.get('partyContact', 'N/A')
            address = data.get('partyAddress', 'N/A')
            
            description = f"{user_name} updated customer details for dispatch #{dispatch_id} - Customer: {customer_name}, Contact: {contact}"
            
            print(f"[AUDIT] Creating dispatch customer details audit log: {description}")
            
            AuditService.log_activity(
                action=AuditAction.UPDATE,
                module=AuditModule.TRANSPORT,
                resource_type='DispatchRequest',
                resource_id=str(dispatch_id),
                description=description,
                username=user_name,
                new_values={
                    'customer_name': customer_name,
                    'contact': contact,
                    'address': address,
                    'dispatch_id': dispatch_id
                }
            )
            print(f"[AUDIT] Dispatch customer details audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create dispatch customer details audit log: {audit_error}")
            import traceback
            traceback.print_exc()
        
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/watchman/orders', methods=['GET'])
def get_watchman_orders():
    """Get orders assigned to watchman (self pickup)"""
    try:
        orders = DispatchService.get_watchman_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/transport/orders', methods=['GET'])
def get_transport_orders():
    """Get orders assigned to transport (company delivery)"""
    try:
        orders = DispatchService.get_transport_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/watchman/verify/<int:gate_pass_id>', methods=['PUT'])
def verify_customer_pickup(gate_pass_id):
    """Verify customer pickup at gate (watchman action)"""
    try:
        data = request.get_json()
        
        # Get gate pass details
        gate_pass = GatePass.query.get(gate_pass_id)
        
        result = DispatchService.verify_customer_pickup(gate_pass_id, data)
        
        # Log gate pass verification
        user_name = data.get('verifiedBy') or request.headers.get('X-User-Email', 'Unknown User')
        if gate_pass:
            AuditService.log_activity(
                action=AuditAction.APPROVE,
                module=AuditModule.GATE_ENTRY,
                resource_type='GatePass',
                resource_id=str(gate_pass_id),
                resource_name=f'Gate Pass #{gate_pass_id}',
                description=f'{user_name} verified gate pass #{gate_pass_id} for customer \'{gate_pass.party_name}\' - Vehicle: {gate_pass.vehicle_no or "N/A"} - Driver: {gate_pass.driver_name or "N/A"}',
                username=user_name
            )
        
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/transport/update/<int:transport_job_id>', methods=['PUT'])
def update_transport_status(transport_job_id):
    """Update transport job status"""
    try:
        data = request.get_json()
        
        # Validate status is provided
        if not data.get('status'):
            return jsonify({'error': 'Status is required'}), 400
        
        # Get transport job details
        transport_job = TransportJob.query.get(transport_job_id)
        
        result = DispatchService.update_transport_status(transport_job_id, data)
        
        # Log transport status update
        user_name = data.get('updatedBy') or request.headers.get('X-User-Email', 'Unknown User')
        status = data.get('status')
        
        if transport_job:
            if status == 'delivered':
                AuditService.log_activity(
                    action=AuditAction.UPDATE,
                    module=AuditModule.TRANSPORT,
                    resource_type='TransportJob',
                    resource_id=str(transport_job_id),
                    resource_name=f'Transport Job #{transport_job_id}',
                    description=f'{user_name} marked transport job #{transport_job_id} as delivered - Vehicle: {transport_job.vehicle_no or "N/A"} - Transporter: {transport_job.transporter_name or "N/A"}',
                    username=user_name
                )
            else:
                AuditService.log_activity(
                    action=AuditAction.UPDATE,
                    module=AuditModule.TRANSPORT,
                    resource_type='TransportJob',
                    resource_id=str(transport_job_id),
                    resource_name=f'Transport Job #{transport_job_id}',
                    description=f'{user_name} updated transport job #{transport_job_id} status to {status} - Vehicle: {transport_job.vehicle_no or "N/A"}',
                    username=user_name
                )
        
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/summary', methods=['GET'])
def get_dispatch_summary():
    """Get dispatch department summary statistics"""
    try:
        summary = DispatchService.get_dispatch_summary()
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/self/loaded/<int:dispatch_id>', methods=['POST'])
def mark_loaded(dispatch_id):
    """Mark loading completed for self delivery; dispatch step before release."""
    try:
        data = request.get_json() or {}
        
        # Get dispatch request details
        dispatch_req = DispatchRequest.query.get(dispatch_id)
        
        result = DispatchService.complete_loading(dispatch_id, data.get('notes'))
        
        # Log loading completion
        user_name = data.get('loadedBy') or request.headers.get('X-User-Email', 'Unknown User')
        if dispatch_req:
            AuditService.log_activity(
                action=AuditAction.UPDATE,
                module=AuditModule.TRANSPORT,
                resource_type='DispatchRequest',
                resource_id=str(dispatch_id),
                resource_name=f'Dispatch #{dispatch_id}',
                description=f'{user_name} completed loading for dispatch #{dispatch_id} - Customer: {dispatch_req.party_name} - Quantity: {dispatch_req.quantity} units - Ready for release',
                username=user_name
            )
        
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/part-load/loaded/<int:dispatch_id>', methods=['POST'])
def mark_part_load_loaded(dispatch_id):
    """Mark loading completed for part load delivery; dispatch step before release."""
    try:
        data = request.get_json() or {}
        result = DispatchService.complete_part_load_loading(dispatch_id, data.get('notes'))
        
        # Create audit log for part-load loading completion
        try:
            from models import DispatchRequest, SalesOrder
            
            dispatch_req = DispatchRequest.query.get(dispatch_id)
            if dispatch_req:
                sales_order = SalesOrder.query.get(dispatch_req.sales_order_id) if dispatch_req.sales_order_id else None
                
                user_name = data.get('loadedBy') or request.headers.get('X-User-Email', 'Unknown User')
                customer_name = dispatch_req.party_name or 'Unknown'
                quantity = dispatch_req.quantity or 0
                
                description = f"{user_name} completed loading for part-load dispatch #{dispatch_id} - Customer: {customer_name} - Quantity: {quantity} units - Ready for release"
                
                print(f"[AUDIT] Creating dispatch part-load audit log: {description}")
                
                AuditService.log_activity(
                    action=AuditAction.UPDATE,
                    module=AuditModule.TRANSPORT,
                    resource_type='DispatchRequest',
                    resource_id=str(dispatch_id),
                    description=description,
                    username=user_name,
                    new_values={
                        'customer_name': customer_name,
                        'dispatch_id': dispatch_id,
                        'quantity': quantity,
                        'delivery_type': 'part_load',
                        'status': 'loaded'
                    }
                )
                print(f"[AUDIT] Dispatch part-load audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create dispatch part-load audit log: {audit_error}")
            import traceback
            traceback.print_exc()
        
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/company/loaded/<int:dispatch_id>', methods=['POST'])
def mark_company_vehicle_loaded(dispatch_id):
    """Mark loading completed for company/free delivery; dispatch step before transport delivery."""
    try:
        data = request.get_json() or {}
        result = DispatchService.complete_company_vehicle_loading(dispatch_id, data.get('notes'))
        
        # Create audit log for company vehicle loading completion
        try:
            from models import DispatchRequest, SalesOrder, TransportJob
            
            dispatch_req = DispatchRequest.query.get(dispatch_id)
            if dispatch_req:
                sales_order = SalesOrder.query.get(dispatch_req.sales_order_id) if dispatch_req.sales_order_id else None
                transport_job = TransportJob.query.filter_by(dispatch_request_id=dispatch_id).first()
                
                user_name = data.get('loadedBy') or request.headers.get('X-User-Email', 'Unknown User')
                customer_name = dispatch_req.party_name or 'Unknown'
                quantity = dispatch_req.quantity or 0
                vehicle_no = transport_job.vehicle_no if transport_job else 'N/A'
                transporter = transport_job.transporter_name if transport_job else 'N/A'
                
                description = f"{user_name} completed loading for company vehicle dispatch #{dispatch_id} - Customer: {customer_name} - Quantity: {quantity} units - Vehicle: {vehicle_no} - Transporter: {transporter} - Ready for delivery"
                
                print(f"[AUDIT] Creating dispatch company vehicle audit log: {description}")
                
                AuditService.log_activity(
                    action=AuditAction.UPDATE,
                    module=AuditModule.TRANSPORT,
                    resource_type='DispatchRequest',
                    resource_id=str(dispatch_id),
                    description=description,
                    username=user_name,
                    new_values={
                        'customer_name': customer_name,
                        'dispatch_id': dispatch_id,
                        'quantity': quantity,
                        'delivery_type': 'company',
                        'status': 'loaded',
                        'vehicle_no': vehicle_no,
                        'transporter': transporter
                    }
                )
                print(f"[AUDIT] Dispatch company vehicle audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create dispatch company vehicle audit log: {audit_error}")
            import traceback
            traceback.print_exc()
        
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@dispatch_bp.route('/dispatch/notifications', methods=['GET'])
def get_dispatch_notifications():
    """Get notifications for dispatch department about vehicles sent in for loading"""
    try:
        notifications = DispatchService.get_dispatch_notifications()
        return jsonify(notifications), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500