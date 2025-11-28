"""
Sales Service Module
Handles business logic for sales operations
"""
from datetime import datetime, timedelta
from utils.timezone_helpers import get_ist_now
import uuid
from models import db, SalesOrder, Customer, SalesTransaction, ShowroomProduct, FinanceTransaction, DispatchRequest, AssemblyOrder, TransportJob , GatePass
from models.sales import TransportApprovalRequest, SalesTarget
from services.showroom_service import ShowroomService
from services.approval_service import ApprovalService
import calendar


class SalesService:
    """Service class for sales operations"""
    
    @staticmethod
    def get_available_showroom_products():
        """Get products for showroom display including rework information"""
        from models.production import MachineTestResult, ReworkOrder
        
        # Get showroom products with status 'available' - these are ready for sale
        all_products = ShowroomProduct.query.filter_by(showroom_status='available').order_by(ShowroomProduct.created_at.desc()).all()
        print(f"DEBUG: Found {len(all_products)} available showroom products")
        
        products = []
        for product in all_products:
            # Determine original quantity from assembly order by production_order_id
            original_qty = 1
            assembly_order = None
            if product.production_order_id:
                assembly_order = AssemblyOrder.query.filter_by(
                    production_order_id=product.production_order_id
                ).first()
                if assembly_order:
                    original_qty = assembly_order.quantity or 1

            # Calculate already sold quantity for this showroom product
            sold_qty = db.session.query(db.func.coalesce(db.func.sum(SalesOrder.quantity), 0)).\
                filter(SalesOrder.showroom_product_id == product.id).scalar() or 0

            # Calculate rework quantities if assembly order exists
            rework_qty = 0
            display_qty = original_qty
            pending_qty = 0
            failed_machines = []
            
            if assembly_order:
                # Get all machine test results
                all_machines = MachineTestResult.query.filter_by(
                    assembly_order_id=assembly_order.id
                ).all()
                
                passed_machines = [m for m in all_machines if m.test_result == 'passed']
                failed_machines = [m for m in all_machines if m.test_result == 'failed']
                pending_machines = [m for m in all_machines if m.test_result == 'pending']
                
                # Count machines currently in rework (failed machines with active rework orders)
                rework_machines = 0
                for failed_machine in failed_machines:
                    if failed_machine.rework_order_id:
                        rework_order = ReworkOrder.query.get(failed_machine.rework_order_id)
                        if rework_order and rework_order.status in ['pending', 'in_progress']:
                            rework_machines += 1
                
                rework_qty = rework_machines
                pending_qty = len(pending_machines)
                # Display quantity includes both passed machines AND pending machines (not yet tested/retested)
                display_qty = len(passed_machines) + pending_qty

            # Calculate remaining quantity available for sale
            # Use product.quantity (from showroom_product table) as the display quantity
            remaining_qty = max(int(product.quantity) - int(sold_qty), 0)

            # Simple logic: Show if status is 'available' and has remaining quantity
            should_show = product.showroom_status == 'available' and remaining_qty > 0
            
            print(f"DEBUG Product {product.id} ({product.name}): status={product.showroom_status}, qty={product.quantity}, sold={sold_qty}, remaining={remaining_qty}, should_show={should_show}")

            if should_show:
                products.append({
                    'id': product.id,
                    'name': product.name,
                    'category': product.category,
                    'quantity': remaining_qty,  # Current remaining quantity available for sale
                    'displayQuantity': display_qty,  # Machines currently on display (passed + pending)
                    'reworkQuantity': rework_qty,  # Machines currently in rework
                    'pendingQuantity': pending_qty,  # Machines pending testing/retesting
                    'originalQuantity': original_qty,  # Total original batch quantity
                    'soldQuantity': sold_qty,  # Already sold quantity
                    'salePrice': product.sale_price,
                    'costPrice': product.cost_price,
                    'displayedAt': product.created_at.isoformat(),
                    'productionOrderId': product.production_order_id,
                    'showroomStatus': product.showroom_status
                })
        
        return products
    
    @staticmethod
    def get_sales_orders(status=None, sales_person=None):
        """Get sales orders with optional filtering"""
        query = SalesOrder.query
        
        if status:
            query = query.filter_by(order_status=status)
        
        if sales_person:
            # Case-insensitive and trimmed comparison
            from sqlalchemy import func
            query = query.filter(func.lower(func.trim(SalesOrder.sales_person)) == func.lower(func.trim(sales_person)))
        
        orders = query.order_by(SalesOrder.created_at.desc()).all()
        
        # Enhance orders with after sales status
        enhanced_orders = []
        for order in orders:
            order_dict = order.to_dict()
            
            # Check if order has been sent to dispatch
            dispatch_request = DispatchRequest.query.filter_by(sales_order_id=order.id).first()
            if dispatch_request:
                order_dict['afterSalesStatus'] = 'sent_to_dispatch'
            else:
                order_dict['afterSalesStatus'] = None
                
            enhanced_orders.append(order_dict)
        
        return enhanced_orders
    
    @staticmethod
    def get_sales_order_by_id(order_id):
        """Get a specific sales order by ID"""
        from sqlalchemy import text
        
        # Force MySQL to fetch fresh data by closing and reopening the session
        db.session.close()
        
        # Execute a raw SQL query to bypass all caching
        result = db.session.execute(
            text("SELECT * FROM sales_order WHERE id = :order_id"),
            {"order_id": order_id}
        ).fetchone()
        
        if not result:
            raise ValueError('Sales order not found')
        
        # Now get the ORM object with fresh data
        order = db.session.query(SalesOrder).filter_by(id=order_id).first()
        return order.to_dict()
    
    @staticmethod
    def create_sales_order(data):
        """Create a new sales order"""
        # Validate showroom product
        showroom_product = ShowroomProduct.query.get(data['showroomProductId'])
        if not showroom_product:
            raise ValueError('Showroom product not found')
        
        if showroom_product.showroom_status != 'available':
            raise ValueError('Product is not available for sale')
        
        # Compute remaining quantity available for sale
        original_qty = 1
        if showroom_product.production_order_id:
            assembly_order = AssemblyOrder.query.filter_by(
                production_order_id=showroom_product.production_order_id
            ).first()
            if assembly_order:
                original_qty = assembly_order.quantity or 1
        sold_qty = db.session.query(db.func.coalesce(db.func.sum(SalesOrder.quantity), 0)).\
            filter(SalesOrder.showroom_product_id == showroom_product.id).scalar() or 0
        remaining_qty = max(int(original_qty) - int(sold_qty), 0)
        
        # Requested quantity must be within remaining
        quantity = int(data.get('quantity', 1))
        if quantity <= 0:
            raise ValueError('Quantity must be at least 1')
        if quantity > remaining_qty:
            raise ValueError('Requested quantity exceeds available quantity')
        
        # Generate readable order number: SO-<CustInit>-<ProdInit>-<YYYYMMDD>-<4HEX>
        cust_name = (data.get('customerName') or '').strip()
        cust_init = ''.join([part[0] for part in cust_name.split()[:2]]).upper() or 'CU'
        # Fetch product name for initials
        prod = ShowroomProduct.query.get(data['showroomProductId'])
        prod_name = (prod.name if prod else 'PROD').strip()
        prod_init = ''.join([part[0] for part in prod_name.split()[:2]]).upper() or 'PR'
        order_number = f"SO-{cust_init}-{prod_init}-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}"
        
        # Calculate amounts
        unit_price = float(data['unitPrice'])
        transport_cost = float(data.get('transportCost', 0.0))
        total_amount = (unit_price * quantity) + transport_cost
        discount_amount = float(data.get('discountAmount', 0.0))
        final_amount = total_amount - discount_amount
        
        # Get delivery type to determine workflow
        delivery_type = data.get('deliveryType', 'self delivery')
        
        # Determine initial order status based on delivery type
        if delivery_type in ['part load', 'company delivery']:
            # These require transport approval before confirmation
            initial_order_status = 'pending_transport_approval'
        elif delivery_type == 'free delivery':
            initial_order_status = 'pending_free_delivery_approval'
        else:
            # Self delivery can be confirmed immediately
            initial_order_status = 'confirmed'
        
        # Create sales order
        sales_order = SalesOrder(
            order_number=order_number,
            customer_name=data['customerName'],
            customer_contact=data.get('customerContact'),
            customer_email=data.get('customerEmail'),
            customer_address=data.get('customerAddress'),
            showroom_product_id=data['showroomProductId'],
            quantity=quantity,
            unit_price=unit_price,
            total_amount=total_amount,
            discount_amount=discount_amount,
            transport_cost=0.0 if data.get('deliveryType') == 'free delivery' else transport_cost,
            origin=data.get('origin'),
            destination=data.get('destination'),
            distance=data.get('distance'),
            vehicle_type=data.get('vehicleType'),
            final_amount=final_amount,
            payment_method=data.get('paymentMethod', ''),
            sales_person=data['salesPerson'],
            Delivery_type=delivery_type,
            notes=data.get('notes'),
            order_status=initial_order_status
        )
        
        db.session.add(sales_order)
        db.session.flush()  # Get the sales_order.id
        
        # Create transport approval request if needed
        if delivery_type in ['part load', 'company delivery']:
            transport_approval = TransportApprovalRequest(
                sales_order_id=sales_order.id,
                delivery_type=delivery_type,
                original_transport_cost=transport_cost,
                status='pending'
            )
            db.session.add(transport_approval)
        
        # Mark sold only if fully exhausted
        remaining_after = remaining_qty - quantity
        if remaining_after <= 0:
            showroom_product.showroom_status = 'sold'
            showroom_product.sold_date = get_ist_now()
        
        # NOTE: FinanceTransaction for revenue should be created when payment is RECEIVED and APPROVED
        # Not when order is created, as payment might be partial or pending
        # This will be handled in the finance approval process
        
        db.session.commit()
        
        return sales_order.to_dict()
    
    @staticmethod
    def update_sales_order(order_id, data):
        """Update an existing sales order"""
        sales_order = SalesOrder.query.get(order_id)
        if not sales_order:
            raise ValueError('Sales order not found')
        
        # Prevent editing orders with completed payments
        if sales_order.payment_status == 'completed':
            raise ValueError('Cannot edit order with completed payment')
        
        # Store old delivery type for comparison
        old_delivery_type = sales_order.Delivery_type
        
        # Update allowed fields
        if 'customerName' in data:
            sales_order.customer_name = data['customerName']
        if 'customerContact' in data:
            sales_order.customer_contact = data['customerContact']
        if 'customerEmail' in data:
            sales_order.customer_email = data['customerEmail']
        if 'customerAddress' in data:
            sales_order.customer_address = data['customerAddress']
        if 'orderStatus' in data:
            sales_order.order_status = data['orderStatus']
        if 'paymentStatus' in data:
            sales_order.payment_status = data['paymentStatus']
        if 'notes' in data:
            sales_order.notes = data['notes']
        
        # Update pricing fields and recalculate amounts FIRST (before delivery type changes)
        if 'unitPrice' in data or 'quantity' in data or 'transportCost' in data or 'discountAmount' in data:
            unit_price = float(data.get('unitPrice', sales_order.unit_price))
            quantity = int(data.get('quantity', sales_order.quantity))
            transport_cost = float(data.get('transportCost', sales_order.transport_cost or 0))
            discount_amount = float(data.get('discountAmount', sales_order.discount_amount or 0))
            
            # Recalculate amounts
            total_amount = (unit_price * quantity) + transport_cost
            final_amount = total_amount - discount_amount
            
            # Update all amount fields
            sales_order.unit_price = unit_price
            sales_order.quantity = quantity
            sales_order.transport_cost = transport_cost
            sales_order.total_amount = total_amount
            sales_order.discount_amount = discount_amount
            sales_order.final_amount = final_amount
        
        # Update transport details if provided (regardless of pricing changes)
        if 'origin' in data:
            sales_order.origin = data['origin']
        if 'destination' in data:
            sales_order.destination = data['destination']
        if 'distance' in data:
            sales_order.distance = data['distance']
        if 'vehicleType' in data:
            sales_order.vehicle_type = data['vehicleType']

        # Handle delivery type changes with special logic AFTER pricing updates
        new_delivery_type = data.get('deliveryType')
        if new_delivery_type and new_delivery_type != old_delivery_type:
            # Update delivery type
            sales_order.Delivery_type = new_delivery_type
            
            # Handle status changes based on delivery type transition
            if old_delivery_type == 'self delivery' and new_delivery_type in ['part load', 'company delivery']:
                # Self Delivery → Transport: Change status to pending_transport_approval
                sales_order.order_status = 'pending_transport_approval'
                
                # Create transport approval request with UPDATED transport cost
                existing_approval = TransportApprovalRequest.query.filter_by(
                    sales_order_id=sales_order.id
                ).first()
                
                if not existing_approval:
                    transport_approval = TransportApprovalRequest(
                        sales_order_id=sales_order.id,
                        delivery_type=new_delivery_type,
                        original_transport_cost=sales_order.transport_cost or 0.0,  # Now uses updated cost
                        status='pending'
                    )
                    db.session.add(transport_approval)
                
            elif old_delivery_type in ['part load', 'company delivery'] and new_delivery_type == 'self delivery':
                # Part Load/Company Delivery → Self Delivery: Delete pending transport approval requests
                pending_approvals = TransportApprovalRequest.query.filter_by(
                    sales_order_id=sales_order.id,
                    status='pending'
                ).all()
                
                for approval in pending_approvals:
                    db.session.delete(approval)
                
                # Change status back to confirmed if it was pending transport approval
                if sales_order.order_status == 'pending_transport_approval':
                    sales_order.order_status = 'confirmed'
                    
            elif old_delivery_type in ['part load', 'company delivery'] and new_delivery_type in ['part load', 'company delivery']:
                # Transport type to transport type: Update existing approval request if pending
                existing_approval = TransportApprovalRequest.query.filter_by(
                    sales_order_id=sales_order.id,
                    status='pending'
                ).first()
                
                if existing_approval:
                    existing_approval.delivery_type = new_delivery_type
                    existing_approval.updated_at = get_ist_now()
        
        sales_order.updated_at = get_ist_now()
        db.session.commit()
        
        return sales_order.to_dict()
    
    @staticmethod
    def change_delivery_type_after_payment(order_id, delivery_change_data):
        """
        Change delivery type for orders with completed payment.
        This handles the special case where customer wants to change from self delivery
        to company/part load delivery after payment is completed.
        """
        sales_order = SalesOrder.query.get(order_id)
        if not sales_order:
            raise ValueError('Sales order not found')
        
        # Only allow this for completed payment orders
        if sales_order.payment_status != 'completed':
            raise ValueError('This function is only for orders with completed payment')
        
        # Get the requested delivery type, transport cost, and payment type
        new_delivery_type = delivery_change_data.get('deliveryType')
        additional_transport_cost = float(delivery_change_data.get('transportCost', 0))
        payment_type = delivery_change_data.get('paymentType', 'paid')  # Default to 'paid'
        
        if not new_delivery_type:
            raise ValueError('New delivery type is required')
        
        # Validate delivery type change
        old_delivery_type = sales_order.Delivery_type
        if old_delivery_type == new_delivery_type:
            raise ValueError('New delivery type must be different from current delivery type')
        
        # Only allow changes from self delivery to transport-based delivery
        if old_delivery_type != 'self delivery':
            raise ValueError('Can only change delivery type from self delivery to company/part load delivery')
        
        if new_delivery_type not in ['company delivery', 'part load']:
            raise ValueError('Can only change to company delivery or part load delivery')
        
        # Validate transport cost based on delivery type and payment type
        if new_delivery_type == 'part load' and payment_type == 'to_pay':
            # For "to_pay" part load, no transport cost should be added to our order
            additional_transport_cost = 0
        elif additional_transport_cost <= 0:
            # For company delivery or "paid" part load, transport cost is required
            raise ValueError('Transport cost must be greater than 0 for company delivery or paid part load delivery')
        
        # Store original amounts for audit
        original_total = sales_order.total_amount
        original_final = sales_order.final_amount
        original_transport_cost = sales_order.transport_cost or 0
        
        # Update delivery type
        sales_order.Delivery_type = new_delivery_type
        
        # Add transport cost to existing amounts
        sales_order.transport_cost = original_transport_cost + additional_transport_cost
        sales_order.total_amount = original_total + additional_transport_cost
        sales_order.final_amount = original_final + additional_transport_cost
        
        # Change payment status to partial (since additional amount is due)
        sales_order.payment_status = 'partial'
        
        # Change order status to pending transport approval
        sales_order.order_status = 'pending_transport_approval'
        
        # Create transport approval request for the additional cost
        transport_approval = TransportApprovalRequest(
            sales_order_id=sales_order.id,
            delivery_type=new_delivery_type,
            original_transport_cost=additional_transport_cost,  # Only the additional cost needs approval
            status='pending',
            transport_notes=f'Post-payment delivery type change from {old_delivery_type} to {new_delivery_type}. Payment type: {payment_type}. Additional cost: ₹{additional_transport_cost}'
        )
        db.session.add(transport_approval)
        
        # Create finance transaction for the additional amount due
        additional_transaction = FinanceTransaction(
            transaction_type='pending_revenue',
            amount=additional_transport_cost,
            description=f'Additional transport cost for delivery type change - Order {sales_order.order_number}',
            reference_id=sales_order.id,
            reference_type='delivery_type_change'
        )
        db.session.add(additional_transaction)
        
        sales_order.updated_at = get_ist_now()
        db.session.commit()
        
        return {
            'status': 'delivery_type_changed',
            'message': f'Delivery type changed from {old_delivery_type} to {new_delivery_type}',
            'salesOrder': sales_order.to_dict(),
            'additionalAmountDue': additional_transport_cost,
            'newTotalAmount': sales_order.total_amount,
            'newFinalAmount': sales_order.final_amount,
            'paymentStatus': 'partial',
            'orderStatus': 'pending_transport_approval',
            'transportApprovalRequired': True
        }
    
    @staticmethod
    def process_payment(order_id, payment_data):
        """Process payment for a sales order.
        Does not finalize; flags order for finance approval.
        """
        import json
        
        sales_order = SalesOrder.query.get(order_id)
        if not sales_order:
            raise ValueError('Sales order not found')
        
        amount = float(payment_data['amount'])
        payment_method = payment_data['paymentMethod']
        
        # Prepare payment details based on payment method
        utr_number = None
        cash_denominations = None
        split_payment_details = None
        
        # For online/bank transfer payments, UTR number is required
        if payment_method in ['online', 'bank_transfer', 'upi']:
            utr_number = payment_data.get('utrNumber')
            if not utr_number:
                raise ValueError(f'UTR number is required for {payment_method} payments')
        
        # For cash payments, cash denominations should be provided
        if payment_method == 'cash':
            # Accept both 'cashDenominations' and 'denoms' field names
            cash_denom = payment_data.get('cashDenominations') or payment_data.get('denoms')
            print(f"[SALES] Cash payment - denoms received: {cash_denom}")
            if cash_denom:
                # Store as JSON string
                cash_denominations = json.dumps(cash_denom)
                print(f"[SALES] Cash denominations JSON: {cash_denominations}")
        
        # For split payments, store split details
        # Accept both field name formats
        split_details = payment_data.get('splitPaymentDetails')
        if not split_details and payment_method == 'split':
            # Build split details from splitCashAmount and splitOnlineAmount
            split_cash = payment_data.get('splitCashAmount')
            split_online = payment_data.get('splitOnlineAmount')
            print(f"[SALES] Split payment - cash: {split_cash}, online: {split_online}")
            
            if split_cash or split_online:
                split_details = []
                if split_cash and float(split_cash) > 0:
                    cash_part = {
                        'method': 'cash',
                        'amount': float(split_cash)
                    }
                    # Include denominations if provided
                    denoms = payment_data.get('denoms')
                    if denoms:
                        cash_part['denominations'] = denoms
                    split_details.append(cash_part)
                    
                if split_online and float(split_online) > 0:
                    online_part = {
                        'method': 'online',
                        'amount': float(split_online)
                    }
                    # Include UTR number if provided
                    utr = payment_data.get('utrNumber')
                    if utr:
                        online_part['reference'] = utr
                    split_details.append(online_part)
                
                print(f"[SALES] Built split details: {split_details}")
            
            # Also store cash denominations separately for split payments with cash component
            if split_cash and float(split_cash) > 0:
                cash_denom = payment_data.get('denoms')
                if cash_denom:
                    cash_denominations = json.dumps(cash_denom)
                    print(f"[SALES] Split payment cash denominations: {cash_denominations}")
        
        if split_details:
            split_payment_details = json.dumps(split_details)
            print(f"[SALES] Split payment details JSON: {split_payment_details}")
        
        # Create sales transaction with payment details
        transaction = SalesTransaction(
            sales_order_id=order_id,
            transaction_type='payment',
            amount=amount,
            payment_method=payment_method,
            reference_number=payment_data.get('referenceNumber'),
            utr_number=utr_number,
            cash_denominations=cash_denominations,
            split_payment_details=split_payment_details,
            notes=payment_data.get('notes')
        )
        db.session.add(transaction)
        
        # Set status to require finance approval
        sales_order.payment_status = 'pending_finance_approval'
        
        db.session.commit()
        
        return transaction.to_dict()

    @staticmethod
    def apply_coupon(order_id, data):
        """Apply a coupon code to an order and optionally bypass finance if partial or pending payment exists.
        Rules:
        - Requires a non-empty couponCode.
        - If payment_status is 'partial' or 'pending', set finance_bypass True and record reason/time.
        - Does NOT change payment_status; payments can complete later.
        - Always recalculates discount and final_amount if a discount value is provided.
        """
        sales_order = SalesOrder.query.get(order_id)
        if not sales_order:
            raise ValueError('Sales order not found')

        coupon_code = (data.get('couponCode') or '').strip()
        if not coupon_code:
            raise ValueError('couponCode is required')

        # Allow for both partial and pending
        if sales_order.payment_status not in ['partial', 'pending']:
            raise ValueError('Coupon apply failed: unsupported payment status')

        # Optional numeric discount amount to apply via coupon
        discount_value = data.get('discountAmount')
        if discount_value is not None:
            try:
                discount_value = float(discount_value)
                if discount_value < 0:
                    raise ValueError
            except Exception:
                raise ValueError('discountAmount must be a non-negative number')
        
        # Get payment due date (required for bypass)
        payment_due_date = data.get('paymentDueDate')
        if not payment_due_date:
            raise ValueError('paymentDueDate is required for coupon bypass')
        
        # Validate and parse the date
        try:
            from datetime import datetime as dt
            payment_due_date_obj = dt.fromisoformat(payment_due_date.replace('Z', ''))
            sales_order.payment_due_date = payment_due_date_obj.date()
        except Exception:
            raise ValueError('Invalid paymentDueDate format. Use ISO format (YYYY-MM-DD)')
        
        sales_order.coupon_code = coupon_code

        # Apply discount if provided
        if discount_value is not None:
            sales_order.discount_amount = float(discount_value)
            sales_order.final_amount = float(sales_order.total_amount or 0) - float(sales_order.discount_amount or 0)

        # Store coupon info but don't enable bypass yet - need approval
        sales_order.updated_at = get_ist_now()
        db.session.commit()

        # Create approval request instead of directly bypassing
        try:
            approval_result = ApprovalService.create_coupon_approval_request(
                sales_order_id=order_id,
                requested_by=data.get('requestedBy', 'Sales User'),
                coupon_code=coupon_code,
                discount_amount=discount_value or 0,
                request_details=data.get('reason') or f"Coupon bypass request for order {sales_order.order_number}. Coupon: {coupon_code}"
            )
            
            return {
                'status': 'approval_requested',
                'message': 'Coupon applied. Approval request sent to Management.',
                'salesOrder': sales_order.to_dict(),
                'approvalRequest': approval_result.get('approvalRequest')
            }
        except Exception as e:
            # If approval creation fails, still return success for coupon application
            return {
                'status': 'coupon_applied_no_approval',
                'message': f'Coupon applied but approval request failed: {str(e)}',
                'salesOrder': sales_order.to_dict()
            }

    @staticmethod
    def create_dispatch_request(order_id, delivery_type, party_contact=None, party_address=None):
        """Create a dispatch request for a sales order"""
        if delivery_type not in ['self delivery', 'company delivery']:
            raise ValueError('Invalid delivery type')

        sales_order = SalesOrder.query.get(order_id)
        if not sales_order:
            raise ValueError('Sales order not found')

        showroom_product = ShowroomProduct.query.get(sales_order.showroom_product_id)
        if not showroom_product:
            raise ValueError('Related showroom product not found')

        # If a dispatch request already exists for this order, return it instead of creating a duplicate
        existing_dispatch = DispatchRequest.query.filter_by(sales_order_id=sales_order.id).first()
        if existing_dispatch:
            return existing_dispatch.to_dict()

        # Map UI label to storage value correctly
        delivery_type_value = 'self' if delivery_type == 'self delivery' else 'transport'

        dispatch = DispatchRequest(
            sales_order_id=sales_order.id,
            showroom_product_id=showroom_product.id,
            party_name=sales_order.customer_name or 'Customer',
            party_contact=party_contact or sales_order.customer_contact,
            party_address=party_address or sales_order.customer_address,
            party_email=sales_order.customer_email,
            quantity=sales_order.quantity,
            delivery_type=delivery_type_value,
            status='pending'
        )

        db.session.add(dispatch)
        db.session.commit()

        return dispatch.to_dict()
    
    @staticmethod
    def get_customers():
        """Get all customers"""
        customers = Customer.query.filter_by(is_active=True).order_by(Customer.name).all()
        return [customer.to_dict() for customer in customers]
    
    @staticmethod
    def create_customer(data):
        """Create a new customer"""
        customer = Customer(
            name=data['name'],
            contact=data.get('contact'),
            email=data.get('email'),
            address=data.get('address'),
            customer_type=data.get('customerType', 'retail'),
            credit_limit=float(data.get('creditLimit', 0.0))
        )
        
        db.session.add(customer)
        db.session.commit()
        
        return customer.to_dict()
    
    @staticmethod
    def get_sales_summary():
        """Get sales summary statistics"""
        total_orders = SalesOrder.query.count()
        # Only count revenue from delivered orders
        total_revenue = db.session.query(db.func.sum(SalesOrder.final_amount)).filter(
            SalesOrder.order_status == 'delivered'
        ).scalar() or 0
        pending_orders = SalesOrder.query.filter_by(order_status='pending').count()
        completed_orders = SalesOrder.query.filter_by(order_status='delivered').count()
        
        # Today's sales - count all orders created today but revenue only from delivered
        today = datetime.now().date()
        today_orders = SalesOrder.query.filter(
            db.func.date(SalesOrder.created_at) == today
        ).count()
        # Only count revenue from delivered orders created today
        today_revenue = db.session.query(db.func.sum(SalesOrder.final_amount)).filter(
            db.func.date(SalesOrder.created_at) == today,
            SalesOrder.order_status == 'delivered'
        ).scalar() or 0
        
        return {
            'totalOrders': total_orders,
            'totalRevenue': total_revenue,
            'pendingOrders': pending_orders,
            'completedOrders': completed_orders,
            'todayOrders': today_orders,
            'todayRevenue': today_revenue
        }
    
    @staticmethod
    def send_order_to_dispatch(order_id, delivery_type, driver_details=None):
        """Send a confirmed sales order to dispatch department"""
        try:
            # Get sales order
            sales_order = SalesOrder.query.get(order_id)
            if not sales_order:
                raise ValueError('Sales order not found')

            # Check if already sent to dispatch first
            existing_dispatch = DispatchRequest.query.filter_by(
                sales_order_id=order_id
            ).first()
            if existing_dispatch:
                return {
                    'status': 'already_dispatched',
                    'message': 'Order has already been sent to dispatch',
                    'dispatchRequestId': existing_dispatch.id,
                    'dispatchRequest': existing_dispatch.to_dict()
                }

            if sales_order.order_status != 'confirmed':
                raise ValueError('Only confirmed orders can be sent to dispatch')

            # Validate delivery type (supports new types)
            allowed_delivery_types = ['self delivery', 'company delivery', 'free delivery', 'part load']
            if delivery_type not in allowed_delivery_types:
                raise ValueError('Invalid delivery type. Must be "self delivery", "company delivery", "free delivery" or "part load"')

            # Normalize for DispatchRequest storage (only 'self' or 'transport')
            normalized_delivery_type = 'self' if delivery_type == 'self delivery' else 'transport'

            # Get showroom product
            showroom_product = ShowroomProduct.query.get(sales_order.showroom_product_id)
            if not showroom_product:
                raise ValueError('Related showroom product not found')

            # Create dispatch request
            dispatch_request = DispatchRequest(
                sales_order_id=sales_order.id,
                showroom_product_id=sales_order.showroom_product_id,
                party_name=sales_order.customer_name,
                party_contact=sales_order.customer_contact,
                party_address=sales_order.customer_address,
                party_email=sales_order.customer_email,
                quantity=sales_order.quantity,
                delivery_type=normalized_delivery_type,
                status='pending',
                dispatch_notes=f'Order from sales - {delivery_type} delivery requested',
                original_delivery_type=delivery_type  # Store the original delivery type
            )

            db.session.add(dispatch_request)
            # Flush to get the dispatch_request.id
            db.session.flush()

            # If self delivery, create gate pass with driver details
            if normalized_delivery_type == 'self':
                gate_pass = GatePass(
                    dispatch_request_id=dispatch_request.id,
                    party_name=sales_order.customer_name,
                    vehicle_no=driver_details.get('vehicleNumber') if driver_details else None,
                    driver_name=driver_details.get('driverName') if driver_details else None,
                    driver_contact=driver_details.get('driverNumber') if driver_details else None,
                    status='pending'
                )
                db.session.add(gate_pass)

            # If transport-like delivery (company/free/part load), create a transport job
            if normalized_delivery_type == 'transport':
                transport_job = TransportJob(
                    dispatch_request_id=dispatch_request.id,
                    status='pending'
                )
                db.session.add(transport_job)

            # Update sales order status to indicate it's in dispatch
            sales_order.order_status = 'in_dispatch'
            sales_order.updated_at = get_ist_now()

            db.session.commit()

            result = {
                'status': 'sent_to_dispatch',
                'message': f'Order successfully sent to dispatch for {delivery_type} delivery',
                'dispatchRequestId': dispatch_request.id,
                'dispatchRequest': dispatch_request.to_dict(),
                'salesOrder': sales_order.to_dict()
            }
            if delivery_type == 'transport':
                # Include minimal transport job info for frontend if needed
                result['transportJob'] = transport_job.to_dict()
            elif normalized_delivery_type == 'self':
                result['gatePass'] = gate_pass.to_dict()
            return result

        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error sending order to dispatch: {str(e)}")
    
    @staticmethod
    def confirm_transport_demand(approval_id, confirm_data):
        """Confirm or modify order after transport rejection with demand amount"""
        try:
            approval_request = TransportApprovalRequest.query.get(approval_id)
            if not approval_request:
                raise ValueError('Transport approval request not found')
            
            if approval_request.status != 'rejected':
                raise ValueError('Can only confirm demands for rejected transport requests')
            
            sales_order = SalesOrder.query.get(approval_request.sales_order_id)
            if not sales_order:
                raise ValueError('Related sales order not found')
            
            action = confirm_data.get('action')  # 'accept_demand' or 'modify_order'
            
            if action == 'accept_demand':
                # Accept transport's demand amount and update order
                new_transport_cost = approval_request.demand_amount
                
                # Update sales order with new transport cost
                sales_order.transport_cost = new_transport_cost
                sales_order.total_amount = (sales_order.unit_price * sales_order.quantity) + new_transport_cost
                sales_order.final_amount = sales_order.total_amount - (sales_order.discount_amount or 0)
                sales_order.order_status = 'confirmed'
                sales_order.updated_at = get_ist_now()
                
                # Update approval request
                approval_request.status = 'approved'
                approval_request.requested_transport_cost = new_transport_cost
                approval_request.updated_at = get_ist_now()
                
            elif action == 'modify_order':
                # Customer agreed to modified terms, update order accordingly
                new_transport_cost = float(confirm_data.get('agreedTransportCost', approval_request.demand_amount))
                
                # Update sales order
                sales_order.transport_cost = new_transport_cost
                sales_order.total_amount = (sales_order.unit_price * sales_order.quantity) + new_transport_cost
                sales_order.final_amount = sales_order.total_amount - (sales_order.discount_amount or 0)
                sales_order.order_status = 'confirmed'
                sales_order.updated_at = get_ist_now()
                
                # Update approval request
                approval_request.status = 'approved'
                approval_request.requested_transport_cost = new_transport_cost
                approval_request.updated_at = get_ist_now()
            
            else:
                raise ValueError('Invalid action. Must be "accept_demand" or "modify_order"')
            
            db.session.commit()
            
            return {
                'status': 'success',
                'message': f'Transport demand {action.replace("_", " ")} successfully',
                'salesOrder': sales_order.to_dict(),
                'approvalRequest': approval_request.to_dict()
            }
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error confirming transport demand: {str(e)}")
    
    @staticmethod
    def renegotiate_transport_cost(approval_id, renegotiation_data):
        """Send negotiated amount back to transport for verification"""
        try:
            approval_request = TransportApprovalRequest.query.get(approval_id)
            if not approval_request:
                raise ValueError('Transport approval request not found')
            
            if approval_request.status != 'rejected':
                raise ValueError('Can only renegotiate rejected transport requests')
            
            sales_order = SalesOrder.query.get(approval_request.sales_order_id)
            if not sales_order:
                raise ValueError('Related sales order not found')
            
            negotiated_amount = renegotiation_data.get('negotiatedAmount')
            customer_notes = renegotiation_data.get('customerNotes', '')
            sales_person = renegotiation_data.get('salesPerson', 'Sales Department')
            
            # Validate negotiated amount
            if not negotiated_amount or negotiated_amount <= 0:
                raise ValueError('Negotiated amount must be greater than 0')
            
            # Update approval request with negotiated amount and reset to pending
            # The negotiated amount becomes the new "original" amount for transport to review
            approval_request.original_transport_cost = float(negotiated_amount)  # Update this as the new baseline
            approval_request.requested_transport_cost = float(negotiated_amount)
            approval_request.transport_notes = f"Customer negotiation: {customer_notes} (Sales: {sales_person})"
            approval_request.status = 'pending'  # Send back to transport for review
            approval_request.approved_by = None  # Clear previous approval/rejection
            approval_request.demand_amount = None  # Clear previous demand amount
            approval_request.updated_at = get_ist_now()
            
            # Keep sales order in pending_transport_approval status
            # Update sales order transport cost to the negotiated amount
            sales_order.transport_cost = float(negotiated_amount)
            sales_order.total_amount = (sales_order.unit_price * sales_order.quantity) + float(negotiated_amount)
            sales_order.final_amount = sales_order.total_amount - (sales_order.discount_amount or 0)
            sales_order.order_status = 'pending_transport_approval'
            sales_order.updated_at = get_ist_now()
            
            db.session.commit()
            
            return {
                'status': 'success',
                'message': f'Negotiated amount ₹{negotiated_amount} sent to transport for verification',
                'approvalRequest': approval_request.to_dict(),
                'salesOrder': sales_order.to_dict()
            }
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error renegotiating transport cost: {str(e)}")
    
    # ==================== SALES TARGET MANAGEMENT ====================
    
    @staticmethod
    def set_sales_target(sales_person, year, month, target_amount, assigned_by, notes=None):
        """Set or update a sales target for a specific month"""
        try:
            if month < 1 or month > 12:
                raise ValueError("Month must be between 1 and 12")
            
            if target_amount <= 0:
                raise ValueError("Target amount must be greater than 0")
            
            # Try to get existing target
            existing_target = SalesTarget.query.filter_by(
                sales_person=sales_person,
                year=year,
                month=month
            ).first()
            
            if existing_target:
                # Update existing target
                existing_target.target_amount = target_amount
                existing_target.assigned_by = assigned_by
                existing_target.notes = notes
                existing_target.updated_at = get_ist_now()
                db.session.commit()
                return existing_target.to_dict()
            else:
                # Create new target
                new_target = SalesTarget(
                    sales_person=sales_person,
                    year=year,
                    month=month,
                    target_amount=target_amount,
                    assignment_type='manual',
                    assigned_by=assigned_by,
                    notes=notes
                )
                db.session.add(new_target)
                db.session.commit()
                return new_target.to_dict()
        
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error setting sales target: {str(e)}")
    
    @staticmethod
    def get_sales_target(sales_person, year=None, month=None):
        """Get sales target for a specific salesperson and month"""
        try:
            # If year/month not provided, use current month
            if year is None or month is None:
                now = get_ist_now()
                year = year or now.year
                month = month or now.month
            
            target = SalesTarget.query.filter_by(
                sales_person=sales_person,
                year=year,
                month=month
            ).first()
            
            return target.to_dict() if target else None
        
        except Exception as e:
            raise Exception(f"Error retrieving sales target: {str(e)}")
    
    @staticmethod
    def get_achieved_sales(sales_person, year, month):
        """Calculate total achieved sales for a specific month (excluding transport costs) - only for delivered orders"""
        try:
            # Get first and last day of the month
            first_day = datetime(year, month, 1)
            last_day = datetime(year, month, calendar.monthrange(year, month)[1], 23, 59, 59)
            
            print(f"[ACHIEVED SALES] Calculating for: '{sales_person}', {year}-{month}")
            print(f"[ACHIEVED SALES] Date range: {first_day} to {last_day}")
            
            # First, let's see how many delivered orders exist for this sales person
            delivered_orders = SalesOrder.query.filter(
                SalesOrder.sales_person == sales_person,
                SalesOrder.created_at >= first_day,
                SalesOrder.created_at <= last_day,
                SalesOrder.order_status == 'delivered'
            ).all()
            
            print(f"[ACHIEVED SALES] Found {len(delivered_orders)} delivered orders")
            for order in delivered_orders:
                net = (order.total_amount or 0) - (order.transport_cost or 0) - (order.discount_amount or 0)
                print(f"[ACHIEVED SALES]   Order {order.order_number}: ₹{net}")
            
            # Sum only product sales (total_amount - transport_cost - discount_amount)
            # This excludes transport costs from the sales target calculation
            # Only count orders that are actually delivered
            achieved = db.session.query(
                db.func.coalesce(
                    db.func.sum(
                        SalesOrder.total_amount - SalesOrder.transport_cost - SalesOrder.discount_amount
                    ), 
                    0
                )
            ).filter(
                SalesOrder.sales_person == sales_person,
                SalesOrder.created_at >= first_day,
                SalesOrder.created_at <= last_day,
                SalesOrder.order_status == 'delivered'  # Only count delivered orders
            ).scalar()
            
            print(f"[ACHIEVED SALES] Total achieved: ₹{achieved}")
            
            return float(achieved or 0)
        
        except Exception as e:
            raise Exception(f"Error calculating achieved sales: {str(e)}")
    
    @staticmethod
    def get_salesperson_dashboard(sales_person, year=None, month=None):
        """Get comprehensive sales dashboard for a salesperson with target tracking"""
        try:
            # Use current month if not specified
            if year is None or month is None:
                now = get_ist_now()
                year = year or now.year
                month = month or now.month
            
            # Get the target
            target = SalesService.get_sales_target(sales_person, year, month)
            
            # Get achieved sales
            achieved = SalesService.get_achieved_sales(sales_person, year, month)
            
            # Calculate metrics
            target_amount = float(target['targetAmount']) if target else 0
            remaining_amount = max(target_amount - achieved, 0) if target else 0
            progress_percentage = (achieved / target_amount * 100) if target and target_amount > 0 else 0
            exceeded_amount = max(achieved - target_amount, 0) if target else 0
            
            # Calculate days metrics
            now = get_ist_now()
            first_day = datetime(year, month, 1)
            last_day = datetime(year, month, calendar.monthrange(year, month)[1])
            days_in_month = calendar.monthrange(year, month)[1]
            
            if now.year == year and now.month == month:
                # Current month
                current_day = now.day
                days_elapsed = current_day
                days_remaining = max(days_in_month - current_day, 0)
                is_current_month = True
            else:
                # Past or future month
                if now < first_day:
                    days_elapsed = 0
                    days_remaining = days_in_month
                else:
                    days_elapsed = days_in_month
                    days_remaining = 0
                is_current_month = False
            
            # Calculate daily average needed
            daily_avg_needed = 0
            daily_avg_achieved = 0
            
            if days_remaining > 0 and target_amount > 0:
                daily_avg_needed = remaining_amount / days_remaining if days_remaining > 0 else 0
            
            if days_elapsed > 0:
                daily_avg_achieved = achieved / days_elapsed if days_elapsed > 0 else 0
            
            return {
                'salesPerson': sales_person,
                'year': year,
                'month': month,
                'monthName': calendar.month_name[month],
                'target': {
                    'amount': target_amount,
                    'details': target
                },
                'achieved': {
                    'amount': round(achieved, 2),
                    'percentage': round(progress_percentage, 2)
                },
                'remaining': {
                    'amount': round(remaining_amount, 2),
                    'percentage': round(max(100 - progress_percentage, 0), 2)
                },
                'exceeded': round(exceeded_amount, 2) if exceeded_amount > 0 else 0,
                'daysMetrics': {
                    'daysInMonth': days_in_month,
                    'daysElapsed': days_elapsed,
                    'daysRemaining': days_remaining,
                    'isCurrentMonth': is_current_month
                },
                'dailyAverage': {
                    'needed': round(daily_avg_needed, 2),
                    'achieved': round(daily_avg_achieved, 2),
                    'onTrack': daily_avg_achieved >= daily_avg_needed if daily_avg_needed > 0 else None
                },
                'status': 'on_track' if progress_percentage >= 100 else ('at_risk' if progress_percentage < 50 else 'progressing')
            }
        
        except Exception as e:
            raise Exception(f"Error generating sales dashboard: {str(e)}")
    
    @staticmethod
    def get_all_targets_for_salesperson(sales_person, year=None):
        """Get all targets for a salesperson in a specific year"""
        try:
            if year is None:
                year = get_ist_now().year
            
            targets = SalesTarget.query.filter_by(
                sales_person=sales_person,
                year=year
            ).order_by(SalesTarget.month).all()
            
            return [target.to_dict() for target in targets]
        
        except Exception as e:
            raise Exception(f"Error retrieving targets: {str(e)}")


    @staticmethod
    def get_payment_reminders(sales_person=None):
        """Get orders with payment due dates that need reminders"""
        from datetime import date, timedelta
        
        today = date.today()
        tomorrow = today + timedelta(days=1)
        
        # Get orders where payment is due today or overdue
        query = SalesOrder.query.filter(
            SalesOrder.payment_due_date.isnot(None),
            SalesOrder.payment_due_date <= tomorrow,  # Due today or overdue
            SalesOrder.payment_status.in_(['pending', 'partial', 'pending_finance_approval']),  # Still need payment or awaiting finance approval
            SalesOrder.finance_bypass == True  # Only bypassed orders
        )
        
        # Filter by sales person if provided (case-insensitive and trimmed)
        if sales_person:
            print(f"[PAYMENT REMINDERS DEBUG] Filtering by sales_person: '{sales_person}'")
            from sqlalchemy import func
            # Use TRIM and LOWER for both sides to handle spaces and case
            query = query.filter(func.trim(func.lower(SalesOrder.sales_person)) == func.trim(func.lower(sales_person)))
        else:
            print(f"[PAYMENT REMINDERS DEBUG] No sales_person filter - showing all reminders")
        
        orders = query.order_by(SalesOrder.payment_due_date.asc()).all()
        
        # Debug: Show all sales_person values in orders with payment_due_date
        all_orders_with_due_date = SalesOrder.query.filter(
            SalesOrder.payment_due_date.isnot(None),
            SalesOrder.finance_bypass == True
        ).all()
        
        print(f"[PAYMENT REMINDERS DEBUG] All orders with due dates:")
        for order in all_orders_with_due_date:
            print(f"  - Order {order.order_number}: sales_person='{order.sales_person}', due_date={order.payment_due_date}")
        
        print(f"[PAYMENT REMINDERS DEBUG] Found {len(orders)} matching orders for sales_person='{sales_person}'")
        
        reminders = []
        for order in orders:
            days_overdue = (today - order.payment_due_date).days if order.payment_due_date < today else 0
            
            reminder = {
                'orderId': order.id,
                'orderNumber': order.order_number,
                'customerName': order.customer_name,
                'finalAmount': order.final_amount,
                'paymentDueDate': order.payment_due_date.isoformat(),
                'daysOverdue': days_overdue,
                'status': 'overdue' if days_overdue > 0 else 'due_today',
                'salesPerson': order.sales_person,
                'paymentStatus': order.payment_status
            }
            reminders.append(reminder)
        
        return reminders