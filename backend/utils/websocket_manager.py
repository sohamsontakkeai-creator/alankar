"""
WebSocket Manager for Real-Time Updates
Handles WebSocket connections and broadcasts events to connected clients
"""
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request
from functools import wraps
import jwt
import os

# Initialize SocketIO
socketio = SocketIO(cors_allowed_origins="*", async_mode='threading')

# Store active connections by user_id and role
active_connections = {}

def init_socketio(app):
    """Initialize SocketIO with Flask app"""
    socketio.init_app(app, cors_allowed_origins="*")
    return socketio

def authenticate_socket(f):
    """Decorator to authenticate socket connections"""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            token = request.args.get('token')
            if not token:
                return {'error': 'Authentication required'}, 401
            
            # Decode JWT token
            secret_key = os.getenv('SECRET_KEY', 'your-secret-key-here')
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            
            # Store user info in request context
            request.user_id = payload.get('user_id')
            request.username = payload.get('username')
            request.role = payload.get('role')
            
            return f(*args, **kwargs)
        except jwt.ExpiredSignatureError:
            return {'error': 'Token expired'}, 401
        except jwt.InvalidTokenError:
            return {'error': 'Invalid token'}, 401
    
    return decorated

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    try:
        token = request.args.get('token')
        if not token:
            return False
        
        # Decode JWT token
        secret_key = os.getenv('SECRET_KEY', 'your-secret-key-here')
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        
        user_id = payload.get('user_id')
        username = payload.get('username')
        role = payload.get('role')
        
        # Store connection info
        sid = request.sid
        active_connections[sid] = {
            'user_id': user_id,
            'username': username,
            'role': role
        }
        
        # Join user-specific room
        join_room(f"user_{user_id}")
        
        # Join role-specific room
        if role:
            join_room(f"role_{role}")
        
        print(f"✅ WebSocket connected: {username} ({role}) - SID: {sid}")
        
        # Send connection confirmation
        emit('connected', {
            'message': 'Connected to real-time updates',
            'user_id': user_id,
            'username': username,
            'role': role
        })
        
        return True
        
    except Exception as e:
        print(f"❌ WebSocket connection error: {e}")
        return False

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    sid = request.sid
    if sid in active_connections:
        user_info = active_connections[sid]
        print(f"❌ WebSocket disconnected: {user_info['username']} - SID: {sid}")
        del active_connections[sid]

@socketio.on('ping')
def handle_ping():
    """Handle ping from client to keep connection alive"""
    emit('pong', {'timestamp': int(time.time())})

# ============================================
# Broadcast Functions for Different Events
# ============================================

def broadcast_to_user(user_id, event_type, data):
    """Send event to specific user"""
    try:
        socketio.emit(event_type, data, room=f"user_{user_id}")
        print(f"📤 Sent {event_type} to user {user_id}")
    except Exception as e:
        print(f"❌ Error broadcasting to user {user_id}: {e}")

def broadcast_to_role(role, event_type, data):
    """Send event to all users with specific role"""
    try:
        socketio.emit(event_type, data, room=f"role_{role}")
        print(f"📤 Sent {event_type} to role {role}")
    except Exception as e:
        print(f"❌ Error broadcasting to role {role}: {e}")

def broadcast_to_all(event_type, data):
    """Send event to all connected clients"""
    try:
        socketio.emit(event_type, data, broadcast=True)
        print(f"📤 Broadcast {event_type} to all clients")
    except Exception as e:
        print(f"❌ Error broadcasting to all: {e}")

# ============================================
# Specific Event Broadcasters
# ============================================

def notify_order_update(order_id, order_data, affected_roles=None):
    """Notify about order updates"""
    event_data = {
        'order_id': order_id,
        'order_data': order_data,
        'timestamp': int(time.time())
    }
    
    if affected_roles:
        for role in affected_roles:
            broadcast_to_role(role, 'order_update', event_data)
    else:
        broadcast_to_all('order_update', event_data)

def notify_approval_request(approver_id, approval_type, request_data):
    """Notify user about pending approval"""
    event_data = {
        'approval_type': approval_type,
        'request_data': request_data,
        'timestamp': int(time.time())
    }
    broadcast_to_user(approver_id, 'approval_request', event_data)

def notify_approval_decision(requester_id, approval_type, decision, comments=None):
    """Notify requester about approval decision"""
    event_data = {
        'approval_type': approval_type,
        'decision': decision,
        'comments': comments,
        'timestamp': int(time.time())
    }
    broadcast_to_user(requester_id, 'approval_decision', event_data)

def notify_inventory_alert(alert_type, inventory_data, affected_roles=None):
    """Notify about inventory alerts (low stock, etc.)"""
    event_data = {
        'alert_type': alert_type,
        'inventory_data': inventory_data,
        'timestamp': int(time.time())
    }
    
    if affected_roles:
        for role in affected_roles:
            broadcast_to_role(role, 'inventory_alert', event_data)
    else:
        broadcast_to_role('STORE', 'inventory_alert', event_data)
        broadcast_to_role('PURCHASE', 'inventory_alert', event_data)

def notify_leave_request(manager_id, leave_data):
    """Notify manager about new leave request"""
    event_data = {
        'leave_data': leave_data,
        'timestamp': int(time.time())
    }
    broadcast_to_user(manager_id, 'leave_request', event_data)

def notify_tour_request(approver_role, tour_data):
    """Notify about tour intimation request"""
    event_data = {
        'tour_data': tour_data,
        'timestamp': int(time.time())
    }
    broadcast_to_role(approver_role, 'tour_request', event_data)

def notify_payment_update(order_id, payment_data, affected_roles=None):
    """Notify about payment updates"""
    event_data = {
        'order_id': order_id,
        'payment_data': payment_data,
        'timestamp': int(time.time())
    }
    
    if affected_roles:
        for role in affected_roles:
            broadcast_to_role(role, 'payment_update', event_data)

def notify_dispatch_update(order_id, dispatch_data, affected_roles=None):
    """Notify about dispatch updates"""
    event_data = {
        'order_id': order_id,
        'dispatch_data': dispatch_data,
        'timestamp': int(time.time())
    }
    
    if affected_roles:
        for role in affected_roles:
            broadcast_to_role(role, 'dispatch_update', event_data)

def notify_production_update(production_data, affected_roles=None):
    """Notify about production updates"""
    event_data = {
        'production_data': production_data,
        'timestamp': int(time.time())
    }
    
    if affected_roles:
        for role in affected_roles:
            broadcast_to_role(role, 'production_update', event_data)

def notify_guest_update(guest_data):
    """Notify about guest list updates"""
    event_data = {
        'guest_data': guest_data,
        'timestamp': int(time.time())
    }
    broadcast_to_role('RECEPTION', 'guest_update', event_data)
    broadcast_to_role('WATCHMAN', 'guest_update', event_data)

def notify_system_alert(alert_message, severity='info', affected_roles=None):
    """Send system-wide alerts"""
    event_data = {
        'message': alert_message,
        'severity': severity,
        'timestamp': int(time.time())
    }
    
    if affected_roles:
        for role in affected_roles:
            broadcast_to_role(role, 'system_alert', event_data)
    else:
        broadcast_to_all('system_alert', event_data)

import time
