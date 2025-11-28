"""
Finance Routes Module
API endpoints for finance operations
"""
from flask import Blueprint, request, jsonify
from services.finance_service import FinanceService
from services.audit_service import AuditService
from models import AuditAction, AuditModule, User, SalesOrder, PurchaseOrder
from utils.jwt_helpers import get_jwt_identity_safe
from datetime import datetime

finance_bp = Blueprint('finance', __name__)


@finance_bp.route('/api/health/finance', methods=['GET'])
def finance_health_check():
    """Health check endpoint for finance module"""
    return jsonify({
        'status': 'Finance module is running',
        'timestamp': datetime.now().isoformat()
    }), 200


@finance_bp.route('/finance/purchase-orders', methods=['GET'])
def get_finance_purchase_orders():
    """Get purchase orders that need finance approval"""
    try:
        orders = FinanceService.get_purchase_orders_for_approval()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/finance/purchase-orders/<int:order_id>/approve', methods=['PUT'])
def finance_approve_purchase_order(order_id):
    """Approve or reject a purchase order from finance perspective"""
    try:
        data = request.get_json()
        approved = data.get('approved', False)
        
        # Get purchase order details before approval
        purchase_order = PurchaseOrder.query.get(order_id)
        
        result = FinanceService.approve_purchase_order(order_id, approved)
        
        # Get user name from request data
        user_name = data.get('approvedBy') or request.headers.get('X-User-Email', 'Unknown User')
        
        # Log approval/rejection
        action = AuditAction.APPROVE if approved else AuditAction.REJECT
        action_text = "approved" if approved else "rejected"
        
        if purchase_order:
            # Get quantity safely
            try:
                quantity = int(purchase_order.quantity) if purchase_order.quantity else 0
            except (ValueError, TypeError):
                quantity = 0
            
            description = f"{user_name} {action_text} Purchase Order #{order_id} for {quantity} units of {purchase_order.product_name}"
        else:
            description = f"{user_name} {action_text} Purchase Order #{order_id}"
        
        AuditService.log_activity(
            action=action,
            module=AuditModule.FINANCE,
            resource_type='PurchaseOrder',
            resource_id=str(order_id),
            resource_name=f"PO #{order_id}",
            description=description,
            username=user_name
        )
        
        return jsonify(result), 200
        
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/finance/dashboard', methods=['GET'])
def get_finance_dashboard():
    """Get financial summary for dashboard"""
    try:
        dashboard_data = FinanceService.get_dashboard_data()
        return jsonify(dashboard_data), 200
    except Exception as e:
        return jsonify({
            'error': str(e),
            'totalRevenue': 0.0,
            'totalExpenses': 0.0,
            'netProfit': 0.0,
            'recentTransactions': [],
            'pendingApprovals': 0
        }), 200  # Return 200 with default values to prevent frontend crashes


@finance_bp.route('/finance/transactions', methods=['GET'])
def get_finance_transactions():
    """Get all financial transactions with filtering"""
    try:
        transaction_type = request.args.get('type')  # 'revenue' or 'expense'
        limit = int(request.args.get('limit', 50))
        
        transactions = FinanceService.get_transactions(transaction_type, limit)
        return jsonify(transactions), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/finance/sales-payments/pending', methods=['GET'])
def get_sales_payments_pending():
    try:
        orders = FinanceService.get_sales_payments_pending_approval()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/finance/sales-payments/<int:order_id>/approve', methods=['PUT'])
def approve_sales_payment(order_id):
    try:
        data = request.get_json() or {}
        approved = data.get('approved', True)
        
        # Get sales order details before approval
        sales_order = SalesOrder.query.get(order_id)
        
        result = FinanceService.approve_sales_payment(order_id, approved)
        
        # Get user name from request data
        user_name = data.get('approvedBy') or request.headers.get('X-User-Email', 'Unknown User')
        
        # Log approval/rejection
        action = AuditAction.APPROVE if approved else AuditAction.REJECT
        action_text = "approved payment" if approved else "rejected payment"
        
        if sales_order:
            # Get amount safely
            try:
                amount = float(sales_order.total_amount) if sales_order.total_amount else 0
            except (ValueError, TypeError):
                amount = 0
            
            product_info = f" - Product: {sales_order.product_name}" if hasattr(sales_order, 'product_name') and sales_order.product_name else ""
            description = f"{user_name} {action_text} for Sales Order #{order_id} - Customer: {sales_order.customer_name} - Amount: ₹{amount:,.2f}{product_info}"
        else:
            description = f"{user_name} {action_text} for Sales Order #{order_id}"
        
        AuditService.log_activity(
            action=action,
            module=AuditModule.FINANCE,
            resource_type='SalesPayment',
            resource_id=str(order_id),
            resource_name=f"Payment for Order #{order_id}",
            description=description,
            username=user_name
        )
        
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/finance/transactions/expense', methods=['POST'])
def create_expense_transaction():
    """Create an expense transaction"""
    try:
        data = request.get_json()
        
        required_fields = ['amount', 'description']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        transaction = FinanceService.create_expense_transaction(
            amount=data['amount'],
            description=data['description'],
            reference_id=data.get('reference_id'),
            reference_type=data.get('reference_type')
        )
        
        return jsonify(transaction), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/finance/transactions/revenue', methods=['POST'])
def create_revenue_transaction():
    """Create a revenue transaction"""
    try:
        data = request.get_json()
        
        required_fields = ['amount', 'description']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        transaction = FinanceService.create_revenue_transaction(
            amount=data['amount'],
            description=data['description'],
            reference_id=data.get('reference_id'),
            reference_type=data.get('reference_type')
        )
        
        return jsonify(transaction), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/finance/purchase-bills', methods=['GET'])
def get_approved_purchase_bills():
    """Get all approved/processed purchase orders"""
    try:
        orders = FinanceService.get_approved_purchase_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/finance/bypassed-sales', methods=['GET'])
def get_bypassed_sales_orders():
    """Get sales orders that bypassed finance approval"""
    try:
        orders = FinanceService.get_bypassed_sales_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@finance_bp.route('/finance/sales-bills', methods=['GET'])
def get_approved_sales_bills():
    """Get all completed sales orders"""
    try:
        orders = FinanceService.get_approved_sales_orders()
        return jsonify(orders), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@finance_bp.route('/finance/orders/<int:order_id>/invoice', methods=['GET', 'POST'])
def download_finance_invoice(order_id):
    """Generate and display final invoice HTML for a sales order (Finance Department)"""
    try:
        from utils.invoice_generator import generate_final_invoice
        from models import SalesOrder, db
        
        # Get the sales order from database
        order = db.session.query(SalesOrder).filter_by(id=order_id).first()
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        # Convert to dict
        order_dict = order.to_dict()
        
        # Log original values
        print(f"=== INVOICE GENERATION FOR ORDER {order_id} ===")
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
        html_content = generate_final_invoice(order_dict)
        
        # Return HTML directly - browser can print it
        return html_content, 200, {'Content-Type': 'text/html'}
        
    except Exception as e:
        print(f"Error generating invoice: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
