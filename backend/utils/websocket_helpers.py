"""
WebSocket Helper Functions
Easy-to-use functions to emit WebSocket events from anywhere in the backend
"""
from utils.websocket_manager import (
    notify_order_update,
    notify_approval_request,
    notify_approval_decision,
    notify_inventory_alert,
    notify_leave_request,
    notify_tour_request,
    notify_payment_update,
    notify_dispatch_update,
    notify_production_update,
    notify_guest_update,
    notify_system_alert
)

# Re-export all notification functions for easy import
__all__ = [
    'notify_order_update',
    'notify_approval_request',
    'notify_approval_decision',
    'notify_inventory_alert',
    'notify_leave_request',
    'notify_tour_request',
    'notify_payment_update',
    'notify_dispatch_update',
    'notify_production_update',
    'notify_guest_update',
    'notify_system_alert'
]

# Example usage in your routes/services:
"""
# In sales route when order is created:
from utils.websocket_helpers import notify_order_update

@sales_bp.route('/orders', methods=['POST'])
def create_order():
    # ... create order logic ...
    
    # Notify relevant departments
    notify_order_update(
        order_id=order.id,
        order_data={
            'order_number': order.order_number,
            'customer_name': order.customer_name,
            'status': order.status
        },
        affected_roles=['FINANCE', 'PRODUCTION', 'DISPATCH']
    )
    
    return jsonify({'success': True})

# In HR route when leave request is created:
from utils.websocket_helpers import notify_leave_request

@hr_bp.route('/leave-requests', methods=['POST'])
def create_leave_request():
    # ... create leave request logic ...
    
    # Notify manager
    notify_leave_request(
        manager_id=employee.manager_id,
        leave_data={
            'employee_name': employee.name,
            'leave_type': leave_request.leave_type,
            'start_date': leave_request.start_date.isoformat(),
            'end_date': leave_request.end_date.isoformat()
        }
    )
    
    return jsonify({'success': True})

# In inventory service when stock is low:
from utils.websocket_helpers import notify_inventory_alert

def check_inventory_levels():
    # ... check inventory logic ...
    
    if stock_level < reorder_point:
        notify_inventory_alert(
            alert_type='low_stock',
            inventory_data={
                'item_name': item.name,
                'current_stock': stock_level,
                'reorder_point': reorder_point
            },
            affected_roles=['STORE', 'PURCHASE']
        )
"""
