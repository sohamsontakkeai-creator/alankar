from flask import Blueprint, jsonify, request
from services.transport_service import TransportService

transport_ext_bp = Blueprint('transport_ext', __name__)

@transport_ext_bp.route('/transport/partload', methods=['GET'])
def list_partload():
    try:
        return jsonify(TransportService.list_part_load_details()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@transport_ext_bp.route('/transport/partload', methods=['POST'])
def create_partload():
    try:
        data = request.get_json(force=True)
        return jsonify(TransportService.create_part_load_detail(data)), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

"""
Transport Routes Module
API endpoints for transport operations (company delivery)
"""
from flask import Blueprint, request, jsonify
from services.transport_service import TransportService
from services.audit_service import AuditService
from models import AuditAction, AuditModule, User, SalesOrder
from models.sales import TransportApprovalRequest
from utils.jwt_helpers import get_jwt_identity_safe

transport_bp = Blueprint('transport', __name__)


@transport_bp.route('/transport/approvals/pending', methods=['GET'])
def get_pending_transport_approvals():
    """Get all pending transport approval requests"""
    try:
        approvals = TransportService.get_pending_transport_approvals()
        return jsonify(approvals), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/approvals/rejected', methods=['GET'])
def get_rejected_transport_approvals():
    """Get all rejected transport approval requests for sales review"""
    try:
        approvals = TransportService.get_rejected_transport_approvals()
        return jsonify(approvals), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/approvals/<int:approval_id>/approve', methods=['POST'])
def approve_transport_request(approval_id):
    """Approve a transport approval request"""
    try:
        data = request.get_json() or {}
        
        # Get approval details before processing
        approval = TransportApprovalRequest.query.get(approval_id)
        sales_order = SalesOrder.query.get(approval.sales_order_id) if approval else None
        
        # Get user name from request data or use default
        user_name = data.get('approvedBy') or request.headers.get('X-User-Email', 'Unknown User')
        
        result = TransportService.approve_transport_request(approval_id, user_name)
        
        # Log transport approval
        if sales_order:
            description = f"{user_name} approved delivery for Order #{sales_order.id} - Customer: {sales_order.customer_name} - Delivery Type: {approval.delivery_type if approval else 'N/A'}"
        else:
            description = f"{user_name} approved transport request #{approval_id}"
        
        AuditService.log_activity(
            action=AuditAction.APPROVE,
            module=AuditModule.TRANSPORT,
            resource_type='TransportApproval',
            resource_id=str(approval_id),
            resource_name=f"Transport Request #{approval_id}",
            description=description,
            username=user_name
        )
        
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/approvals/<int:approval_id>/reject', methods=['POST'])
def reject_transport_request(approval_id):
    """Reject a transport approval request with demand amount"""
    try:
        data = request.get_json()
        
        # Validate JSON data exists
        if not data:
            return jsonify({'error': 'Request body must contain JSON data'}), 400
        
        # Validate required fields
        if 'demandAmount' not in data:
            return jsonify({'error': 'Demand amount is required'}), 400
        
        # Get approval details before processing
        approval = TransportApprovalRequest.query.get(approval_id)
        sales_order = SalesOrder.query.get(approval.sales_order_id) if approval else None
        
        # Get user name from request data
        user_name = data.get('rejectedBy') or request.headers.get('X-User-Email', 'Unknown User')
        
        result = TransportService.reject_transport_request(approval_id, data)
        
        # Log transport rejection - get amount safely
        try:
            demand_amount = float(data.get('demandAmount', 0))
        except (ValueError, TypeError):
            demand_amount = 0
        
        if sales_order:
            description = f"{user_name} rejected delivery for Order #{sales_order.id} - Customer: {sales_order.customer_name} - Demanded Amount: ₹{demand_amount:,.2f} - Reason: {data.get('reason', 'Not specified')}"
        else:
            description = f"{user_name} rejected transport request #{approval_id} - Demanded Amount: ₹{demand_amount:,.2f}"
        
        AuditService.log_activity(
            action=AuditAction.REJECT,
            module=AuditModule.TRANSPORT,
            resource_type='TransportApproval',
            resource_id=str(approval_id),
            resource_name=f"Transport Request #{approval_id}",
            description=description,
            username=user_name
        )
        
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500



def get_pending_transport_jobs():
    """Get all transport jobs pending assignment"""
    try:
        jobs = TransportService.get_pending_transport_jobs()
        return jsonify(jobs), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/all', methods=['GET'])
def get_all_transport_jobs():
    """Get all transport jobs with all statuses"""
    try:
        jobs = TransportService.get_all_transport_jobs()
        return jsonify(jobs), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/assign/<int:transport_job_id>', methods=['POST'])
def assign_transporter(transport_job_id):
    """Assign a transporter to a transport job"""
    try:
        data = request.get_json()
        
        # Validate JSON data exists
        if not data:
            return jsonify({'error': 'Request body must contain JSON data'}), 400
        
        # Validate required fields
        if not data.get('transporterName'):
            return jsonify({'error': 'Transporter name is required'}), 400
        
        result = TransportService.assign_transporter(transport_job_id, data)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/status/<int:transport_job_id>', methods=['PUT'])
def update_delivery_status(transport_job_id):
    """Update delivery status of transport job"""
    try:
        data = request.get_json()
        
        # Validate JSON data exists
        if not data:
            return jsonify({'error': 'Request body must contain JSON data'}), 400
        
        # Validate required fields
        if not data.get('status'):
            return jsonify({'error': 'Status is required'}), 400
        
        # Get transport job details before update for audit logging
        from models import TransportJob, DispatchRequest
        transport_job = TransportJob.query.get(transport_job_id)
        old_status = transport_job.status if transport_job else None
        
        result = TransportService.update_delivery_status(transport_job_id, data)
        
        # Create audit log for delivery status change, especially for 'delivered'
        try:
            new_status = data.get('status')
            
            # Only log if status actually changed and especially for delivered status
            if transport_job and new_status and old_status != new_status:
                user_name = data.get('updatedBy') or request.headers.get('X-User-Email', 'Unknown User')
                
                # Get dispatch and sales order details
                dispatch_request = DispatchRequest.query.get(transport_job.dispatch_request_id) if transport_job.dispatch_request_id else None
                sales_order = SalesOrder.query.get(dispatch_request.sales_order_id) if dispatch_request and dispatch_request.sales_order_id else None
                
                # Extract order information
                customer_name = sales_order.customer_name if sales_order else (dispatch_request.party_name if dispatch_request else 'Unknown')
                order_number = sales_order.order_number if sales_order else 'N/A'
                product_name = sales_order.product_name if sales_order else 'N/A'
                quantity = sales_order.quantity if sales_order else (dispatch_request.quantity if dispatch_request else 0)
                vehicle_no = transport_job.vehicle_no or data.get('vehicleNo', 'N/A')
                transporter = transport_job.transporter_name or data.get('transporterName', 'N/A')
                
                # Format amount safely
                try:
                    amount = sales_order.final_amount if sales_order else 0
                    amount_str = f"₹{float(amount):,.2f}" if amount else "N/A"
                except:
                    amount_str = "N/A"
                
                # Create detailed description based on status
                if new_status == 'delivered':
                    description = f"Transport marked order as DELIVERED - Customer: {customer_name}, Order: {order_number}, Product: {product_name}, Qty: {quantity}, Amount: {amount_str}, Vehicle: {vehicle_no}, Transporter: {transporter}"
                    action = AuditAction.UPDATE
                elif new_status == 'in_transit':
                    description = f"Transport marked order as IN TRANSIT - Customer: {customer_name}, Order: {order_number}, Product: {product_name}, Vehicle: {vehicle_no}, Transporter: {transporter}"
                    action = AuditAction.UPDATE
                elif new_status == 'cancelled':
                    description = f"Transport CANCELLED delivery - Customer: {customer_name}, Order: {order_number}, Product: {product_name}, Reason: {data.get('notes', 'Not specified')}"
                    action = AuditAction.CANCEL
                else:
                    description = f"Transport updated delivery status to {new_status.upper()} - Customer: {customer_name}, Order: {order_number}, Product: {product_name}"
                    action = AuditAction.UPDATE
                
                print(f"[AUDIT] Creating transport delivery status audit log: {description}")
                
                AuditService.log_activity(
                    action=action,
                    module=AuditModule.TRANSPORT,
                    resource_type='delivery_status',
                    resource_id=str(transport_job_id),
                    description=description,
                    username=user_name,
                    old_values={'status': old_status},
                    new_values={
                        'status': new_status,
                        'customer_name': customer_name,
                        'order_number': order_number,
                        'product_name': product_name,
                        'quantity': quantity,
                        'amount': amount_str,
                        'vehicle_no': vehicle_no,
                        'transporter': transporter,
                        'notes': data.get('notes', '')
                    }
                )
                print(f"[AUDIT] Transport delivery status audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create transport delivery status audit log: {audit_error}")
            import traceback
            traceback.print_exc()
        
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/in-transit', methods=['GET'])
def get_in_transit_deliveries():
    """Get all deliveries currently in transit"""
    try:
        deliveries = TransportService.get_in_transit_deliveries()
        return jsonify(deliveries), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/summary', methods=['GET'])
def get_transport_summary():
    """Get transport department summary statistics"""
    try:
        summary = TransportService.get_transport_summary()
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/performance', methods=['GET'])
def get_transporter_performance():
    """Get performance statistics for transporters"""
    try:
        performance = TransportService.get_transporter_performance()
        return jsonify(performance), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/search', methods=['GET'])
def search_transport_jobs():
    """Search transport jobs by order number, customer name, or transporter"""
    try:
        search_term = request.args.get('q', '').strip()
        if not search_term:
            return jsonify({'error': 'Search term is required'}), 400
        
        results = TransportService.search_transport_jobs(search_term)
        return jsonify({
            'searchTerm': search_term,
            'results': results,
            'count': len(results)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Fleet Management Endpoints
@transport_bp.route('/fleet', methods=['GET'])
def get_fleet_vehicles():
    """Get all fleet vehicles"""
    try:
        vehicles = TransportService.get_fleet_vehicles()
        return jsonify(vehicles), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/fleet/add', methods=['POST'])
def add_fleet_vehicle():
    """Add a new vehicle to the fleet"""
    try:
        data = request.get_json()
        
        # Validate JSON data exists
        if not data:
            return jsonify({'error': 'Request body must contain JSON data'}), 400
        
        result = TransportService.add_fleet_vehicle(data)
        return jsonify(result), 201
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/fleet/<int:vehicle_id>', methods=['PUT'])
def update_fleet_vehicle(vehicle_id):
    """Update a fleet vehicle"""
    try:
        data = request.get_json()
        
        # Validate JSON data exists
        if not data:
            return jsonify({'error': 'Request body must contain JSON data'}), 400
        
        result = TransportService.update_fleet_vehicle(vehicle_id, data)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/fleet/<int:vehicle_id>', methods=['DELETE'])
def delete_fleet_vehicle(vehicle_id):
    """Delete a vehicle from the fleet"""
    try:
        result = TransportService.delete_fleet_vehicle(vehicle_id)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/fleet/available', methods=['GET'])
def get_available_vehicles():
    """Get all available vehicles for transport assignment"""
    try:
        vehicles = TransportService.get_available_vehicles()
        return jsonify(vehicles), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/fleet/<int:vehicle_id>/reached', methods=['POST'])
def mark_driver_reached(vehicle_id):
    """Mark a driver as reached; set vehicle to available manually."""
    try:
        result = TransportService.mark_driver_reached(vehicle_id)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# New: Send intimation to watchman that a company vehicle is returning
@transport_bp.route('/fleet/<int:vehicle_id>/intimate-watchman', methods=['POST'])
def intimate_watchman(vehicle_id):
    """Send intimation to watchman that a company vehicle is returning to site"""
    try:
        data = request.get_json() or {}
        # optional fields from transport frontend
        note = data.get('note')
        result = TransportService.intimate_watchman_vehicle_return(vehicle_id, note)
        
        # Create audit log for intimation
        try:
            user_email = request.headers.get('X-User-Email', 'transport')
            
            # Extract data from the notification object in result
            notification_data = result.get('notification', {}).get('data', {})
            vehicle_number = notification_data.get('vehicleNumber', 'Unknown')
            driver_name = notification_data.get('driverName', 'Unknown')
            
            description = f"Transport intimated watchman about returning vehicle - Vehicle: {vehicle_number}, Driver: {driver_name}"
            if note:
                description += f", Note: {note}"
            
            print(f"[AUDIT] Creating transport audit log: {description}")
            print(f"[AUDIT] Data - Vehicle: {vehicle_number}, Driver: {driver_name}, Note: {note}")
            
            AuditService.log_activity(
                action=AuditAction.SUBMIT,
                module=AuditModule.TRANSPORT,
                resource_type='vehicle_intimation',
                resource_id=str(vehicle_id),
                description=description,
                username=user_email,
                new_values={
                    'vehicle_number': vehicle_number,
                    'driver_name': driver_name,
                    'note': note,
                    'intimated_to': 'watchman'
                }
            )
            print(f"[AUDIT] Transport audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create transport audit log: {audit_error}")
            import traceback
            traceback.print_exc()
        
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/active-orders', methods=['GET'])
def get_active_transport_orders():
    """Get active transport orders (not delivered) for dashboard"""
    try:
        orders = TransportService.get_active_transport_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/completed-orders', methods=['GET'])
def get_completed_transport_orders():
    """Get completed transport orders (delivered) for dashboard"""
    try:
        orders = TransportService.get_completed_transport_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/part-load/pending-driver-details', methods=['GET'])
def get_part_load_orders_needing_driver_details():
    """Get part load orders that need driver details to be filled"""
    try:
        orders = TransportService.get_part_load_orders_needing_driver_details()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/part-load/<int:transport_job_id>/fill-driver-details', methods=['POST'])
def fill_part_load_driver_details(transport_job_id):
    """Fill driver details for part load order and send to watchman"""
    try:
        data = request.get_json()
        
        # Validate JSON data exists
        if not data:
            return jsonify({'error': 'Request body must contain JSON data'}), 400
        
        # Validate required fields
        required_fields = ['driverName', 'driverNumber', 'vehicleNumber', 'companyName']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        result = TransportService.fill_part_load_driver_details(transport_job_id, data)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/part-load/completed', methods=['GET'])
def get_completed_part_load_orders():
    """Get completed and verified part load orders that need after-delivery details"""
    try:
        orders = TransportService.get_completed_part_load_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@transport_bp.route('/transport/part-load/<int:transport_job_id>/after-delivery', methods=['POST'])
def fill_part_load_after_delivery(transport_job_id):
    """Fill after-delivery details for completed part load order"""
    try:
        data = request.get_json()
        
        # Validate JSON data exists
        if not data:
            return jsonify({'error': 'Request body must contain JSON data'}), 400
        
        # Validate required fields
        required_fields = ['lrNumber', 'loadingDate', 'unloadingDate', 'deliveryDate']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        result = TransportService.fill_part_load_after_delivery(transport_job_id, data)
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
