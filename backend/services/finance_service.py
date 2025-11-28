"""
Finance Service Module
Handles business logic for finance operations
"""
from datetime import datetime
from models import db, PurchaseOrder, ProductionOrder, FinanceTransaction, ShowroomProduct, SalesOrder, SalesTransaction
import json
import traceback


class FinanceService:
    """Service class for finance operations"""
    
    @staticmethod
    def get_purchase_orders_for_approval():
        """Get purchase orders that need finance approval"""
        orders = PurchaseOrder.query.filter_by(
            status='pending_finance_approval'
        ).order_by(PurchaseOrder.created_at.desc()).all()
        return [order.to_dict() for order in orders]
    
    @staticmethod
    def get_approved_purchase_orders():
        """Get all approved/processed purchase orders - only those that went through finance approval"""
        orders = PurchaseOrder.query.filter(
            PurchaseOrder.status.in_(['finance_approved', 'completed'])
        ).order_by(PurchaseOrder.created_at.desc()).all()
        return [order.to_dict() for order in orders]
    
    @staticmethod
    def get_bypassed_sales_orders():
        """Get sales orders that bypassed finance approval (full payment upfront)"""
        orders = SalesOrder.query.filter(
            SalesOrder.finance_bypass == True  # Bypassed finance
        ).order_by(SalesOrder.created_at.desc()).all()
        return [order.to_dict() for order in orders]
    
    @staticmethod
    def get_approved_sales_orders():
        """Get all completed sales orders"""
        orders = SalesOrder.query.filter(
            SalesOrder.payment_status.in_(['completed', 'partial'])
        ).order_by(SalesOrder.created_at.desc()).all()
        return [order.to_dict() for order in orders]
    
    @staticmethod
    def approve_purchase_order(order_id, approved=True):
        """Approve or reject a purchase order from finance perspective"""
        order = PurchaseOrder.query.get(order_id)
        if not order:
            raise ValueError('Purchase order not found')
        
        if approved:
            print(f"[FINANCE] Approving purchase order #{order_id}")
            order.status = 'finance_approved'
            
            # Calculate total cost from materials (shortage/required items)
            materials = json.loads(order.materials) if order.materials else []
            materials_cost = sum(
                float(material.get('quantity', 0)) * float(material.get('unit_cost', 0))
                for material in materials
            )
            
            # Calculate total cost from extra materials
            extra_materials = json.loads(order.extra_materials) if order.extra_materials else []
            extra_cost = sum(
                float(material.get('quantity', 0)) * float(material.get('unit_cost', 0))
                for material in extra_materials
            )
            
            total_cost = materials_cost + extra_cost
            
            print(f"[FINANCE] Materials cost: ₹{materials_cost}")
            print(f"[FINANCE] Extra materials cost: ₹{extra_cost}")
            print(f"[FINANCE] Total cost: ₹{total_cost}")
            
            # Create expense transaction
            expense_transaction = FinanceTransaction(
                transaction_type='expense',
                amount=total_cost,
                description=f'Purchase order #{order.id} - {order.product_name}',
                reference_id=order.id,
                reference_type='purchase_order'
            )
            db.session.add(expense_transaction)
            db.session.flush()  # Ensure transaction is added before commit
            
            print(f"[FINANCE] Purchase order status set to: {order.status}")
            
            # Update production order status
            production_order = ProductionOrder.query.get(order.production_order_id)
            if production_order:
                production_order.status = 'materials_approved'
                print(f"[FINANCE] Production order #{production_order.id} status set to: materials_approved")
        else:
            order.status = 'finance_rejected'
            
            # Update production order status
            production_order = ProductionOrder.query.get(order.production_order_id)
            if production_order:
                production_order.status = 'finance_rejected'
        
        db.session.commit()
        print(f"[FINANCE] Changes committed to database")
        
        # Verify the status was saved
        db.session.refresh(order)
        print(f"[FINANCE] Verified purchase order #{order.id} status after commit: {order.status}")
        
        return {
            'message': f'Purchase order {"approved" if approved else "rejected"}',
            'purchaseOrder': order.to_dict()
        }
    
    @staticmethod
    def get_dashboard_data():
        """Get financial summary for dashboard"""
        try:
            print("[DASHBOARD] Calculating finance dashboard data...")
            
            # Calculate total revenue from SalesTransaction table (actual customer payments)
            # Only include payments from orders with completed payment status (approved by finance)
            sales_transactions = db.session.query(SalesTransaction).join(
                SalesOrder, SalesTransaction.sales_order_id == SalesOrder.id
            ).filter(
                SalesTransaction.transaction_type == 'payment',
                SalesOrder.payment_status == 'completed'
            ).all()
            total_revenue = sum(float(txn.amount or 0) for txn in sales_transactions)
            print(f"[DASHBOARD] Total Revenue: ₹{total_revenue} from {len(sales_transactions)} approved payment transactions")

            # Calculate total expenses from FinanceTransaction table (expense type)
            expense_transactions = FinanceTransaction.query.filter_by(transaction_type='expense').all()
            total_expenses = sum(float(txn.amount or 0) for txn in expense_transactions)
            print(f"[DASHBOARD] Total Expenses: ₹{total_expenses} from {len(expense_transactions)} expense transactions")
            
            for txn in expense_transactions:
                print(f"[DASHBOARD] Expense: ₹{txn.amount} - {txn.description}")

            # Calculate revenue breakdown by payment method from approved SalesTransactions only
            payment_method_breakdown = {}
            
            for txn in sales_transactions:
                method = txn.payment_method or 'Unknown'
                amount = float(txn.amount or 0)
                if method in payment_method_breakdown:
                    payment_method_breakdown[method] += amount
                else:
                    payment_method_breakdown[method] = amount
            
            print(f"[DASHBOARD] Payment Method Breakdown (approved only): {payment_method_breakdown}")
            
            # Verify total revenue matches breakdown sum
            breakdown_total = sum(payment_method_breakdown.values())
            print(f"[DASHBOARD] Breakdown Total: ₹{breakdown_total} (should match Total Revenue: ₹{total_revenue})")

            # Net profit = Revenue - Expenses
            net_profit = total_revenue - total_expenses
            print(f"[DASHBOARD] Net Profit: ₹{net_profit}")

            # Get recent transactions
            recent_transactions = FinanceTransaction.query.order_by(
                FinanceTransaction.created_at.desc()
            ).limit(10).all()

            # Get pending approvals count
            pending_count = PurchaseOrder.query.filter_by(status='pending_finance_approval').count()

            result = {
                'totalRevenue': float(total_revenue),
                'totalExpenses': float(total_expenses),
                'netProfit': float(net_profit),
                'recentTransactions': [txn.to_dict() for txn in recent_transactions],
                'pendingApprovals': pending_count,
                'paymentMethodBreakdown': payment_method_breakdown
            }

            return result

        except Exception as e:
            # Return default values instead of raising
            return {
                'totalRevenue': 0.0,
                'totalExpenses': 0.0,
                'netProfit': 0.0,
                'recentTransactions': [],
                'pendingApprovals': 0,
                'paymentMethodBreakdown': {},
                'error': str(e)
            }
    
    @staticmethod
    def get_transactions(transaction_type=None, limit=50):
        """Get all financial transactions with filtering"""
        query = FinanceTransaction.query
        
        if transaction_type:
            query = query.filter_by(transaction_type=transaction_type)
            
        transactions = query.order_by(
            FinanceTransaction.created_at.desc()
        ).limit(limit).all()
        
        return [txn.to_dict() for txn in transactions]
    
    @staticmethod
    def create_expense_transaction(amount, description, reference_id=None, reference_type=None):
        """Create an expense transaction"""
        transaction = FinanceTransaction(
            transaction_type='expense',
            amount=amount,
            description=description,
            reference_id=reference_id,
            reference_type=reference_type
        )
        db.session.add(transaction)
        db.session.commit()
        return transaction.to_dict()

    @staticmethod
    def get_sales_payments_pending_approval():
        """Sales orders payments awaiting finance approval"""
        orders = SalesOrder.query.filter_by(payment_status='pending_finance_approval').order_by(SalesOrder.created_at.desc()).all()
        enriched = []
        for o in orders:
            data = o.to_dict()
            try:
                # Find the most recent payment transaction
                payment_txns = [t for t in getattr(o, 'transactions', []) if getattr(t, 'transaction_type', '') == 'payment']
                payment_txns.sort(key=lambda t: getattr(t, 'created_at', None) or datetime.min, reverse=True)
                
                if payment_txns:
                    latest_payment = payment_txns[0]
                    data['pendingApprovalAmount'] = float(latest_payment.amount)
                    
                    # Get payment details using to_dict()
                    payment_dict = latest_payment.to_dict()
                    
                    # Debug logging
                    print(f"[FINANCE] Order {o.order_number} payment details:")
                    print(f"  Payment Method: {latest_payment.payment_method}")
                    print(f"  Cash Denoms (raw): {latest_payment.cash_denominations}")
                    print(f"  Cash Denoms (parsed): {payment_dict.get('cashDenominations')}")
                    print(f"  Split Details (raw): {latest_payment.split_payment_details}")
                    print(f"  Split Details (parsed): {payment_dict.get('splitPaymentDetails')}")
                    
                    # Include payment details for verification
                    data['paymentDetails'] = {
                        'paymentMethod': latest_payment.payment_method,
                        'referenceNumber': latest_payment.reference_number,
                        'utrNumber': latest_payment.utr_number,
                        'cashDenominations': payment_dict.get('cashDenominations'),
                        'splitPaymentDetails': payment_dict.get('splitPaymentDetails'),
                        'notes': latest_payment.notes,
                        'createdAt': latest_payment.created_at.isoformat()
                    }
                else:
                    data['pendingApprovalAmount'] = 0.0
                    data['paymentDetails'] = None
            except Exception as e:
                print(f"Error enriching payment data: {e}")
                import traceback
                traceback.print_exc()
                data['pendingApprovalAmount'] = 0.0
                data['paymentDetails'] = None
            enriched.append(data)
        return enriched

    @staticmethod
    def approve_sales_payment(order_id, approved=True):
        """Approve or reject sales payment"""
        order = SalesOrder.query.get(order_id)
        if not order:
            raise ValueError('Sales order not found')

        if order.payment_status != 'pending_finance_approval':
            raise ValueError('No pending finance approval for this order')

        if approved:
            # Get the most recent payment transaction that's being approved
            recent_payment = SalesTransaction.query.filter_by(
                sales_order_id=order_id,
                transaction_type='payment'
            ).order_by(SalesTransaction.created_at.desc()).first()
            
            # Create FinanceTransaction for the approved payment (actual revenue received)
            if recent_payment:
                revenue_transaction = FinanceTransaction(
                    transaction_type='revenue',
                    amount=recent_payment.amount,
                    description=f'Payment approved for Order #{order.order_number} - {recent_payment.payment_method}',
                    reference_id=order_id,
                    reference_type='sales_payment'
                )
                db.session.add(revenue_transaction)
                print(f"[FINANCE] Created FinanceTransaction for approved payment: ₹{recent_payment.amount}")
            
            # Query database directly for accurate payment total
            total_paid = db.session.query(db.func.coalesce(db.func.sum(SalesTransaction.amount), 0)).filter_by(
                sales_order_id=order_id,
                transaction_type='payment'
            ).scalar() or 0
            
            if total_paid >= order.final_amount:
                order.payment_status = 'completed'
            elif total_paid > 0:
                order.payment_status = 'partial'
            else:
                order.payment_status = 'pending'
        else:
            # When finance rejects, find and delete the most recent payment transaction
            # Query for the most recent payment transaction for this order
            most_recent_payment = SalesTransaction.query.filter_by(
                sales_order_id=order_id,
                transaction_type='payment'
            ).order_by(SalesTransaction.created_at.desc()).first()
            
            if most_recent_payment:
                # Delete the most recent payment transaction
                db.session.delete(most_recent_payment)
                db.session.flush()  # Ensure deletion is processed
                
                # Refresh the order to get updated relationships
                db.session.refresh(order)

            # Recalculate total paid amount after deletion
            remaining_payments = SalesTransaction.query.filter_by(
                sales_order_id=order_id,
                transaction_type='payment'
            ).all()
            
            total_paid_remaining = sum(t.amount for t in remaining_payments)

            # Set status based on remaining payments
            if total_paid_remaining >= order.final_amount:
                order.payment_status = 'completed'
            elif total_paid_remaining > 0:
                order.payment_status = 'partial'
            else:
                order.payment_status = 'pending'

        db.session.commit()
        
        # Refresh the order one more time to ensure all relationships are current
        db.session.refresh(order)
        return order.to_dict()
    
    @staticmethod
    def create_revenue_transaction(amount, description, reference_id=None, reference_type=None):
        """Create a revenue transaction"""
        transaction = FinanceTransaction(
            transaction_type='revenue',
            amount=amount,
            description=description,
            reference_id=reference_id,
            reference_type=reference_type
        )
        db.session.add(transaction)
        db.session.commit()
        return transaction.to_dict()
