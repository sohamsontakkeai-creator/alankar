"""
Permission decorators for role-based access control
"""
from functools import wraps
from flask import request, jsonify
from utils.jwt_helpers import decode_token

def require_management_or_admin(f):
    """
    Decorator to require management or admin role
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'No token provided'}), 401
        
        token = auth_header.split(' ')[1]
        user_data = decode_token(token)
        
        if not user_data:
            return jsonify({'error': 'Invalid token'}), 401
        
        user_department = user_data.get('department', '').lower()
        
        if user_department not in ['admin', 'management']:
            return jsonify({'error': 'Insufficient permissions. Management or Admin access required.'}), 403
        
        return f(*args, **kwargs)
    
    return decorated_function


def allow_read_access(f):
    """
    Decorator to allow read access for management and admin
    This should be used on GET endpoints where management needs visibility
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'No token provided'}), 401
        
        token = auth_header.split(' ')[1]
        user_data = decode_token(token)
        
        if not user_data:
            return jsonify({'error': 'Invalid token'}), 401
        
        # Pass user data to the route function
        return f(*args, user_data=user_data, **kwargs)
    
    return decorated_function


def require_write_permission(allowed_departments):
    """
    Decorator to check write permissions for specific departments
    Management has read-only access (except for approvals)
    
    Args:
        allowed_departments: List of departments that can write
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get token from header
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({'error': 'No token provided'}), 401
            
            token = auth_header.split(' ')[1]
            user_data = decode_token(token)
            
            if not user_data:
                return jsonify({'error': 'Invalid token'}), 401
            
            user_department = user_data.get('department', '').lower()
            
            # Admin can always write
            if user_department == 'admin':
                return f(*args, **kwargs)
            
            # Check if user's department is in allowed list
            if user_department not in [dept.lower() for dept in allowed_departments]:
                return jsonify({'error': f'Insufficient permissions. Only {", ".join(allowed_departments)} can perform this action.'}), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator
