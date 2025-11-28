"""
Sales Routes Module
API endpoints for sales operations
"""
from flask import Blueprint, request, jsonify
from services.sales_service import SalesService
from services.gst_verification_service import GSTVerificationService
from services.audit_service import AuditService
from models import AuditAction, AuditModule, User, SalesOrder

sales_bp = Blueprint('sales', __name__)


@sales_bp.route('/showroom/available', methods=['GET'])
def get_available_showroom_products():
    """Get all available products in showroom for sale"""
    try:
        products = SalesService.get_available_showroom_products()
        return jsonify(products), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/orders', methods=['GET'])
def get_sales_orders():
    """Get sales orders with optional filtering and role-based access control"""
    try:
        status = request.args.get('status')
        sales_person = request.args.get('sales_person')
        
        # Get user info from custom headers (sent by frontend)
        user_name = request.headers.get('X-User-Name')
        user_email = request.headers.get('X-User-Email')
        user_department = request.headers.get('X-User-Department')
        
        print(f"\n[SALES FILTER DEBUG] ===== GET ORDERS =====")
        print(f"[SALES FILTER DEBUG] Headers - Name: {user_name}, Email: {user_email}, Department: {user_department}")
        print(f"[SALES FILTER DEBUG] Query params - status: {status}, sales_person: {sales_person}")
        
        # If user is from sales department, filter by their full name
        if user_name and user_department and user_department.lower() == 'sales':
            # Override sales_person filter with current user's full name
            sales_person = user_name
            print(f"[SALES FILTER] ✓ Filtering for sales person: {user_name}")
        else:
            print(f"[SALES FILTER] No filtering applied (admin or other department)")
        
        print(f"[SALES FILTER DEBUG] Final sales_person filter: '{sales_person}'")
        
        orders = SalesService.get_sales_orders(status=status, sales_person=sales_person)
        
        print(f"[SALES FILTER DEBUG] Found {len(orders)} orders")
        if orders and len(orders) > 0:
            print(f"[SALES FILTER DEBUG] Sample order sales_person values: {[repr(o.get('salesPerson')) for o in orders[:3]]}")
        
        # Also show ALL sales_person values in database for debugging
        from models import SalesOrder
        all_sales_persons = SalesOrder.query.with_entities(SalesOrder.sales_person).distinct().all()
        print(f"[SALES FILTER DEBUG] All unique sales_person values in DB: {[repr(sp[0]) for sp in all_sales_persons]}")
        print(f"[SALES FILTER DEBUG] ===== END =====\n")
        
        return jsonify(orders), 200
    except Exception as e:
        print(f"[SALES FILTER ERROR] {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/orders/<int:order_id>', methods=['GET'])
def get_sales_order(order_id):
    """Get a specific sales order by ID"""
    try:
        order = SalesService.get_sales_order_by_id(order_id)
        return jsonify(order), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/orders', methods=['POST'])
def create_sales_order():
    """Create a new sales order"""
    try:
        data = request.get_json()
        
        # Validate required fields (paymentMethod no longer required at order creation)
        required_fields = ['customerName', 'showroomProductId', 'unitPrice', 'salesPerson']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        order = SalesService.create_sales_order(data)
        
        # Get user name from request data (salesPerson field)
        user_name = data.get('salesPerson') or request.headers.get('X-User-Email', 'Unknown User')
        
        # Calculate total amount - ensure it's a number
        try:
            quantity = float(data.get('quantity', 1))
            unit_price = float(data.get('unitPrice', 0))
            total_amount = quantity * unit_price
        except (ValueError, TypeError):
            total_amount = 0
        
        # Get product name from showroom product if available
        product_name = data.get('productName', 'Product')
        customer_name = data.get('customerName', 'Customer')
        
        # Log detailed audit trail
        AuditService.log_activity(
            action=AuditAction.CREATE,
            module=AuditModule.SALES,
            resource_type='SalesOrder',
            resource_id=str(order.get('id')),
            resource_name=f"Order #{order.get('id')}",
            description=f"{user_name} created Sales Order #{order.get('id')} for customer '{customer_name}' - Amount: ₹{total_amount:,.2f} - Product: {product_name} (Qty: {int(quantity)})",
            username=user_name
        )
        
        return jsonify(order), 201
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/orders/<int:order_id>', methods=['PUT'])
def update_sales_order(order_id):
    """Update an existing sales order"""
    try:
        data = request.get_json()
        order = SalesService.update_sales_order(order_id, data)
        return jsonify(order), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/orders/<int:order_id>/change-delivery-type', methods=['POST'])
def change_delivery_type_after_payment(order_id):
    """Change delivery type for orders with completed payment"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data:
            return jsonify({'error': 'Request body must contain JSON data'}), 400
        
        required_fields = ['deliveryType', 'transportCost']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate transport cost is a positive number
        try:
            transport_cost = float(data['transportCost'])
            if transport_cost <= 0:
                return jsonify({'error': 'Transport cost must be greater than 0'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Transport cost must be a valid number'}), 400
        
        result = SalesService.change_delivery_type_after_payment(order_id, data)
        
        # Get sales order for audit logging
        sales_order = SalesOrder.query.get(order_id)
        user_name = request.headers.get('X-User-Email', 'Unknown User')
        
        # Log delivery type change
        if sales_order:
            description = f"{user_name} changed delivery type for completed order {sales_order.order_number} from self delivery to {data['deliveryType']} - Additional cost: ₹{transport_cost:,.2f} - Payment status changed to partial"
        else:
            description = f"{user_name} changed delivery type for order #{order_id} - Additional cost: ₹{transport_cost:,.2f}"
        
        AuditService.log_activity(
            action=AuditAction.UPDATE,
            module=AuditModule.SALES,
            resource_type='DeliveryTypeChange',
            resource_id=str(order_id),
            resource_name=f"Order #{order_id} Delivery Type Change",
            description=description,
            username=user_name,
            old_values={
                'delivery_type': 'self delivery',
                'payment_status': 'completed'
            },
            new_values={
                'delivery_type': data['deliveryType'],
                'payment_status': 'partial',
                'additional_transport_cost': transport_cost,
                'order_status': 'pending_transport_approval'
            }
        )
        
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/orders/<int:order_id>/payment', methods=['POST'])
def process_payment(order_id):
    """Process payment for a sales order"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['amount', 'paymentMethod']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        transaction = SalesService.process_payment(order_id, data)
        
        # Get sales order to get sales person name
        sales_order = SalesOrder.query.get(order_id)
        user_name = sales_order.sales_person if sales_order and hasattr(sales_order, 'sales_person') else 'Sales Team'
        
        # Get amount safely
        try:
            amount = float(data.get('amount', 0))
        except (ValueError, TypeError):
            amount = 0
        
        # Log payment processing
        AuditService.log_activity(
            action=AuditAction.CREATE,
            module=AuditModule.SALES,
            resource_type='Payment',
            resource_id=str(transaction.get('id')),
            resource_name=f"Payment for Order #{order_id}",
            description=f"{user_name} processed payment of ₹{amount:,.2f} for Order #{order_id} via {data.get('paymentMethod')} - Sending to Finance for approval",
            username=user_name
        )
        
        return jsonify(transaction), 201
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/orders/<int:order_id>/coupon', methods=['POST'])
def apply_coupon(order_id):
    """Apply a coupon and optionally bypass finance gate if partial payment."""
    try:
        data = request.get_json() or {}
        result = SalesService.apply_coupon(order_id, data)
        
        # Create audit log for coupon application
        try:
            from models import SalesOrder
            
            # Fetch the sales order directly from database to get accurate data
            sales_order_obj = SalesOrder.query.get(order_id)
            
            if sales_order_obj:
                user_email = request.headers.get('X-User-Email', data.get('requestedBy', 'sales'))
                customer_name = sales_order_obj.customer_name or 'Unknown Customer'
                order_number = sales_order_obj.order_number or f'Order-{order_id}'
                coupon_code = data.get('couponCode', 'N/A')
                discount_amount = data.get('discountAmount', 0)
                
                # Format discount amount safely
                try:
                    discount_str = f"₹{float(discount_amount):,.2f}" if discount_amount else "N/A"
                except:
                    discount_str = "N/A"
                
                # Get sales person name from user email or use full name
                sales_person = user_email.split('@')[0] if user_email and '@' in user_email else user_email
                
                description = f"Sales person {sales_person} applied coupon bypass - Customer: {customer_name}, Order: {order_number}, Coupon: {coupon_code}, Discount: {discount_str}"
                
                print(f"[AUDIT] Creating sales coupon audit log: {description}")
                print(f"[AUDIT] Data - Customer: {customer_name}, Order: {order_number}, Coupon: {coupon_code}, Sales Person: {sales_person}")
                
                AuditService.log_activity(
                    action=AuditAction.SUBMIT,
                    module=AuditModule.SALES,
                    resource_type='coupon_bypass',
                    resource_id=str(order_id),
                    description=description,
                    username=user_email,
                    new_values={
                        'sales_person': sales_person,
                        'customer_name': customer_name,
                        'order_number': order_number,
                        'coupon_code': coupon_code,
                        'discount_amount': discount_amount,
                        'status': result.get('status'),
                        'approval_requested': result.get('status') == 'approval_requested'
                    }
                )
                print(f"[AUDIT] Sales coupon audit log created successfully")
            else:
                print(f"[AUDIT WARNING] Sales order {order_id} not found for audit logging")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create sales coupon audit log: {audit_error}")
            import traceback
            traceback.print_exc()
        
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/customers', methods=['GET'])
def get_customers():
    """Get all customers"""
    try:
        customers = SalesService.get_customers()
        return jsonify(customers), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/customers', methods=['POST'])
def create_customer():
    """Create a new customer"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'name' not in data:
            return jsonify({'error': 'Customer name is required'}), 400
        
        customer = SalesService.create_customer(data)
        return jsonify(customer), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/summary', methods=['GET'])
def get_sales_summary():
    """Get sales summary statistics"""
    try:
        summary = SalesService.get_sales_summary()
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/orders/<int:order_id>/dispatch', methods=['POST'])
def send_order_to_dispatch(order_id):
    """Send a sales order to dispatch department"""
    try:
        data = request.get_json() or {}
        delivery_type = data.get('deliveryType')  # 'self' or 'transport'
        if not delivery_type:
            return jsonify({'error': 'deliveryType is required'}), 400

        # Get driver details if provided
        driver_details = data.get('driverDetails')

        # Normalize delivery type - no changes needed as backend now accepts the full values
        # delivery_type should be 'self delivery' or 'company delivery'

        result = SalesService.send_order_to_dispatch(order_id, delivery_type, driver_details)

        # Get sales order to get sales person and customer name
        sales_order = SalesOrder.query.get(order_id)
        user_name = sales_order.sales_person if sales_order and hasattr(sales_order, 'sales_person') else 'Sales Team'
        customer_name = sales_order.customer_name if sales_order else 'Customer'
        
        # Log dispatch action
        if result.get('status') != 'already_dispatched':
            delivery_info = f"Delivery Type: {delivery_type}"
            if driver_details:
                delivery_info += f" - Driver: {driver_details.get('name', 'N/A')}"
            
            AuditService.log_activity(
                action=AuditAction.SUBMIT,
                module=AuditModule.SALES,
                resource_type='DispatchRequest',
                resource_id=str(order_id),
                resource_name=f"Order #{order_id}",
                description=f"{user_name} sent Order #{order_id} to Dispatch department for customer '{customer_name}' - {delivery_info}",
                username=user_name
            )

        # Return appropriate status code based on result
        if result.get('status') == 'already_dispatched':
            return jsonify(result), 200  # OK - informational response
        else:
            return jsonify(result), 201  # Created - new dispatch request
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Removed the driver details update route as part of revert
@sales_bp.route('/transport/approvals/<int:approval_id>/confirm', methods=['POST'])
def confirm_transport_demand(approval_id):
    """Confirm or modify order after transport rejection with demand amount"""
    try:
        data = request.get_json()
        
        # Validate JSON data exists
        if not data:
            return jsonify({'error': 'Request body must contain JSON data'}), 400
        
        # Validate required fields
        if 'action' not in data:
            return jsonify({'error': 'Action is required (accept_demand or modify_order)'}), 400
        
        result = SalesService.confirm_transport_demand(approval_id, data)
        
        # Create audit log for transport demand confirmation
        try:
            from models.sales import TransportApprovalRequest
            
            approval_req = TransportApprovalRequest.query.get(approval_id)
            if approval_req:
                sales_order = result.get('salesOrder', {})
                customer_name = sales_order.get('customer_name', 'Unknown')
                order_number = sales_order.get('order_number', 'N/A')
                product_name = sales_order.get('product_name', 'N/A')
                
                action = data.get('action')
                user_email = request.headers.get('X-User-Email', 'sales')
                
                # Get transport cost details
                transport_cost = sales_order.get('transport_cost', 0)
                demand_amount = approval_req.demand_amount or 0
                
                # Format amounts
                try:
                    transport_cost_str = f"₹{float(transport_cost):,.2f}"
                    demand_amount_str = f"₹{float(demand_amount):,.2f}"
                except:
                    transport_cost_str = str(transport_cost)
                    demand_amount_str = str(demand_amount)
                
                if action == 'accept_demand':
                    description = f"Sales accepted transport demand - Customer: {customer_name}, Order: {order_number}, Product: {product_name}, Demanded Amount: {demand_amount_str}, New Transport Cost: {transport_cost_str}"
                elif action == 'modify_order':
                    agreed_cost = data.get('agreedTransportCost', transport_cost)
                    try:
                        agreed_cost_str = f"₹{float(agreed_cost):,.2f}"
                    except:
                        agreed_cost_str = str(agreed_cost)
                    description = f"Sales modified order after transport review - Customer: {customer_name}, Order: {order_number}, Product: {product_name}, Agreed Transport Cost: {agreed_cost_str}"
                else:
                    description = f"Sales confirmed transport demand - Customer: {customer_name}, Order: {order_number}, Action: {action}"
                
                print(f"[AUDIT] Creating sales transport review audit log: {description}")
                
                AuditService.log_activity(
                    action=AuditAction.APPROVE,
                    module=AuditModule.SALES,
                    resource_type='transport_review',
                    resource_id=str(approval_id),
                    description=description,
                    username=user_email,
                    new_values={
                        'action': action,
                        'customer_name': customer_name,
                        'order_number': order_number,
                        'product_name': product_name,
                        'transport_cost': transport_cost_str,
                        'demand_amount': demand_amount_str
                    }
                )
                print(f"[AUDIT] Sales transport review audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create sales transport review audit log: {audit_error}")
            import traceback
            traceback.print_exc()
        
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sales_bp.route('/transport/approvals/<int:approval_id>/renegotiate', methods=['POST'])
def renegotiate_transport_cost(approval_id):
    """Send negotiated amount back to transport for verification"""
    try:
        data = request.get_json()
        
        # Validate JSON data exists
        if not data:
            return jsonify({'error': 'Request body must contain JSON data'}), 400
        
        # Validate required fields
        required_fields = ['negotiatedAmount', 'customerNotes']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        result = SalesService.renegotiate_transport_cost(approval_id, data)
        
        # Create audit log for transport cost renegotiation
        try:
            from models.sales import TransportApprovalRequest
            
            approval_req = TransportApprovalRequest.query.get(approval_id)
            if approval_req:
                sales_order = SalesOrder.query.get(approval_req.sales_order_id)
                
                if sales_order:
                    user_email = request.headers.get('X-User-Email', data.get('salesPerson', 'sales'))
                    customer_name = sales_order.customer_name or 'Unknown'
                    order_number = sales_order.order_number or 'N/A'
                    product_name = sales_order.product_name or 'N/A'
                    
                    negotiated_amount = data.get('negotiatedAmount', 0)
                    customer_notes = data.get('customerNotes', '')
                    original_demand = approval_req.demand_amount or 0
                    
                    # Format amounts
                    try:
                        negotiated_str = f"₹{float(negotiated_amount):,.2f}"
                        original_str = f"₹{float(original_demand):,.2f}"
                    except:
                        negotiated_str = str(negotiated_amount)
                        original_str = str(original_demand)
                    
                    description = f"Sales renegotiated transport cost - Customer: {customer_name}, Order: {order_number}, Product: {product_name}, Original Demand: {original_str}, Negotiated: {negotiated_str}, Notes: {customer_notes}"
                    
                    print(f"[AUDIT] Creating sales transport renegotiation audit log: {description}")
                    
                    AuditService.log_activity(
                        action=AuditAction.UPDATE,
                        module=AuditModule.SALES,
                        resource_type='transport_renegotiation',
                        resource_id=str(approval_id),
                        description=description,
                        username=user_email,
                        old_values={'demand_amount': original_str},
                        new_values={
                            'customer_name': customer_name,
                            'order_number': order_number,
                            'product_name': product_name,
                            'negotiated_amount': negotiated_str,
                            'customer_notes': customer_notes,
                            'status': 'sent_back_to_transport'
                        }
                    )
                    print(f"[AUDIT] Sales transport renegotiation audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create sales transport renegotiation audit log: {audit_error}")
            import traceback
            traceback.print_exc()
        
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@sales_bp.route('/verify-gst', methods=['POST'])
def verify_gst_number():
    """Verify GST number using government portal"""
    try:
        data = request.get_json()
        gst_number = data.get('gstNumber')

        if not gst_number:
            return jsonify({'error': 'GST number is required'}), 400

        # Verify GST number using real government portal
        result = GSTVerificationService.verify_gst_number(gst_number)

        return jsonify(result), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'verified': False,
            'message': f'Verification failed: {str(e)}',
            'details': None
        }), 500


# ==================== SALES TARGET & DASHBOARD ENDPOINTS ====================

@sales_bp.route('/dashboard', methods=['GET'])
def get_salesperson_dashboard():
    """Get sales dashboard for the current salesperson with target tracking"""
    try:
        # Get salesperson name from query params
        sales_person = request.args.get('salesPerson')
        year = request.args.get('year', type=int)
        month = request.args.get('month', type=int)
        
        if not sales_person:
            return jsonify({'error': 'salesPerson parameter is required'}), 400
        
        print(f"[SALES DASHBOARD] Getting dashboard for: {sales_person}, {year}-{month}")
        
        dashboard = SalesService.get_salesperson_dashboard(sales_person, year, month)
        return jsonify(dashboard), 200
    
    except Exception as e:
        print(f"[SALES DASHBOARD ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/targets', methods=['POST'])
def set_sales_target():
    """Set or update sales target for a salesperson (Admin only)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['salesPerson', 'year', 'month', 'targetAmount', 'assignedBy']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        result = SalesService.set_sales_target(
            sales_person=data['salesPerson'],
            year=int(data['year']),
            month=int(data['month']),
            target_amount=float(data['targetAmount']),
            assigned_by=data['assignedBy'],
            notes=data.get('notes')
        )
        
        # Create audit log for sales target setting
        try:
            sales_person = data['salesPerson']
            year = int(data['year'])
            month = int(data['month'])
            target_amount = float(data['targetAmount'])
            assigned_by = data['assignedBy']
            notes = data.get('notes', '')
            
            # Get month name
            month_names = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December']
            month_name = month_names[month] if 1 <= month <= 12 else str(month)
            
            # Detect if this is part of a bulk operation
            is_bulk = notes and 'bulk' in notes.lower()
            
            if is_bulk:
                description = f"Admin {assigned_by} set sales target (BULK) for {sales_person} - Month: {month_name} {year}, Target: ₹{target_amount:,.2f}"
            else:
                description = f"Admin {assigned_by} set sales target for {sales_person} - Month: {month_name} {year}, Target: ₹{target_amount:,.2f}"
            
            if notes and not is_bulk:
                description += f", Notes: {notes}"
            
            print(f"[AUDIT] Creating sales target audit log: {description}")
            
            AuditService.log_activity(
                action=AuditAction.CREATE,
                module=AuditModule.SALES,
                resource_type='sales_target',
                resource_id=f"{sales_person}_{year}_{month}",
                description=description,
                username=assigned_by,
                new_values={
                    'sales_person': sales_person,
                    'year': year,
                    'month': month,
                    'month_name': month_name,
                    'target_amount': target_amount,
                    'assigned_by': assigned_by,
                    'notes': notes,
                    'is_bulk': is_bulk
                }
            )
            print(f"[AUDIT] Sales target audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create sales target audit log: {audit_error}")
            import traceback
            traceback.print_exc()
        
        return jsonify(result), 201
    
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/targets/current', methods=['GET'])
def get_current_sales_target():
    """Get current month's sales target for a salesperson"""
    try:
        sales_person = request.args.get('salesPerson')
        
        # Get user info from custom headers (sent by frontend)
        user_name = request.headers.get('X-User-Name')
        user_department = request.headers.get('X-User-Department')
        
        # If user is from sales department, they can only see their own target
        if user_name and user_department and user_department.lower() == 'sales':
            sales_person = user_name
            print(f"[SALES TARGET] Sales person {user_name} viewing their own target")
        
        if not sales_person:
            return jsonify({'error': 'salesPerson parameter is required'}), 400
        
        target = SalesService.get_sales_target(sales_person)
        
        if not target:
            return jsonify({'message': 'No target set for current month', 'target': None}), 200
        
        return jsonify(target), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/targets/all', methods=['GET'])
def get_all_targets():
    """Get all sales targets for a salesperson in a specific year"""
    try:
        sales_person = request.args.get('salesPerson')
        year = request.args.get('year', type=int)
        
        # Get user info from custom headers (sent by frontend)
        user_name = request.headers.get('X-User-Name')
        user_department = request.headers.get('X-User-Department')
        
        # If user is from sales department, they can only see their own targets
        if user_name and user_department and user_department.lower() == 'sales':
            sales_person = user_name
            print(f"[SALES TARGETS] Sales person {user_name} viewing their own targets")
        
        if not sales_person:
            return jsonify({'error': 'salesPerson parameter is required'}), 400
        
        targets = SalesService.get_all_targets_for_salesperson(sales_person, year)
        return jsonify({'targets': targets, 'count': len(targets)}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/performance', methods=['GET'])
def get_salesperson_performance():
    """Get performance metrics for a salesperson for a specific month"""
    try:
        sales_person = request.args.get('salesPerson')
        year = request.args.get('year', type=int)
        month = request.args.get('month', type=int)
        
        # Get user info from custom headers (sent by frontend)
        user_name = request.headers.get('X-User-Name')
        user_department = request.headers.get('X-User-Department')
        
        # If user is from sales department, they can only see their own performance
        if user_name and user_department and user_department.lower() == 'sales':
            sales_person = user_name
            print(f"[SALES PERFORMANCE] Sales person {user_name} viewing their own performance")
        
        if not sales_person:
            return jsonify({'error': 'salesPerson parameter is required'}), 400
        
        # Get achieved sales
        achieved = SalesService.get_achieved_sales(sales_person, year, month)
        
        # Get target
        target = SalesService.get_sales_target(sales_person, year, month)
        
        performance = {
            'salesPerson': sales_person,
            'year': year,
            'month': month,
            'achievedSales': round(achieved, 2),
            'target': target,
            'achievedPercentage': round((achieved / float(target['targetAmount']) * 100), 2) if target else 0
        }
        
        return jsonify(performance), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@sales_bp.route('/payment-reminders', methods=['GET'])
def get_payment_reminders():
    """Get payment reminders for orders with due dates"""
    try:
        # Get user info from custom headers (sent by frontend)
        user_name = request.headers.get('X-User-Name')
        user_department = request.headers.get('X-User-Department')
        
        print(f"[PAYMENT REMINDERS DEBUG] Received headers:")
        print(f"  X-User-Name: '{user_name}'")
        print(f"  X-User-Department: '{user_department}'")
        
        sales_person = None
        # If user is from sales department (not admin), filter by their name
        if user_name and user_department and user_department.lower() == 'sales':
            sales_person = user_name
            print(f"[PAYMENT REMINDERS] Filtering for sales person: '{user_name}'")
        else:
            print(f"[PAYMENT REMINDERS] Admin or no filter - showing all reminders")
            print(f"  Reason: user_name='{user_name}', user_department='{user_department}'")
        
        reminders = SalesService.get_payment_reminders(sales_person=sales_person)
        
        return jsonify({
            'reminders': reminders,
            'count': len(reminders)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sales_bp.route('/orders/<int:order_id>/invoice', methods=['GET', 'POST'])
def download_proforma_invoice(order_id):
    """Generate and display proforma invoice HTML for a sales order"""
    try:
        from utils.invoice_generator import generate_proforma_invoice
        from models import SalesOrder, db
        
        # Get the sales order from database
        order = db.session.query(SalesOrder).filter_by(id=order_id).first()
        if not order:
            return jsonify({'error': 'Sales order not found'}), 404
        
        # Convert to dict
        order_dict = order.to_dict()
        
        # Log original values
        print(f"=== PROFORMA INVOICE GENERATION FOR ORDER {order_id} ===")
        print(f"DB Values - unitPrice: {order_dict.get('unitPrice')}, finalAmount: {order_dict.get('finalAmount')}, transportCost: {order_dict.get('transportCost')}")
        
        # If POST request with updated data, override the values from frontend
        if request.method == 'POST':
            frontend_data = request.get_json() or {}
            print(f"Frontend Data Received: {frontend_data}")
            
            # Override with frontend values if provided and not None/empty
            quantity = int(frontend_data.get('quantity', order_dict.get('quantity', 1)))
            
            if frontend_data.get('quantity'):
                order_dict['quantity'] = quantity
            if frontend_data.get('transportCost') is not None:
                order_dict['transportCost'] = float(frontend_data['transportCost'])
            if frontend_data.get('discountAmount') is not None:
                order_dict['discountAmount'] = float(frontend_data['discountAmount'])
            if frontend_data.get('deliveryType'):
                order_dict['Delivery_type'] = frontend_data['deliveryType']
            
            # Handle finalAmount - divide by quantity to get per-unit price
            if frontend_data.get('finalAmount'):
                final_amount = float(frontend_data['finalAmount'])
                order_dict['unitPrice'] = final_amount / quantity  # Per-unit price with GST
            elif frontend_data.get('unitPrice'):
                order_dict['unitPrice'] = float(frontend_data['unitPrice'])
            
            if frontend_data.get('totalAmount'):
                order_dict['totalAmount'] = float(frontend_data['totalAmount'])
            
            print(f"After Override - unitPrice: {order_dict.get('unitPrice')}, finalAmount: {order_dict.get('finalAmount')}, transportCost: {order_dict.get('transportCost')}")
        
        # Generate HTML
        html_content = generate_proforma_invoice(order_dict)
        
        # Return HTML directly - browser can print it
        from flask import Response
        return Response(html_content, mimetype='text/html')
        
    except Exception as e:
        print(f"Error generating invoice: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
