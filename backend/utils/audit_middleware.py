"""
Audit Middleware for automatic activity logging
"""
from flask import request, g
from functools import wraps
from models import AuditAction, AuditModule
from services.audit_service import AuditService
import uuid
import json

def audit_middleware():
    """
    Flask middleware to automatically log requests
    
    NOTE: This middleware is now DISABLED by default.
    All departments have custom business audit logging.
    Only auth-related endpoints use this middleware.
    """
    # Generate request ID for tracing
    g.request_id = str(uuid.uuid4())
    
    # Only log auth-related endpoints (login, logout, etc.)
    # All other departments have custom business audit logging
    allowed_paths = [
        '/api/auth/login',
        '/api/auth/logout',
        '/api/auth/register',
    ]
    
    # If path is not in allowed list, skip middleware logging
    if not any(request.path.startswith(path) for path in allowed_paths):
        return
    
    # Skip GET requests for view operations
    if request.method == 'GET':
        return

def get_module_from_path(path):
    """
    Determine the module based on the request path
    """
    path_module_map = {
        '/api/auth': AuditModule.AUTH,
        '/api/hr': AuditModule.HR,
        '/api/production': AuditModule.PRODUCTION,
        '/api/purchase': AuditModule.PURCHASE,
        '/api/store': AuditModule.INVENTORY,
        '/api/showroom': AuditModule.SHOWROOM,
        '/api/finance': AuditModule.FINANCE,
        '/api/sales': AuditModule.SALES,
        '/api/dispatch': AuditModule.TRANSPORT,
        '/api/transport': AuditModule.TRANSPORT,
        '/api/gate-entry': AuditModule.GATE_ENTRY,
        '/api/watchman': AuditModule.SECURITY,
        '/api/approval': AuditModule.APPROVAL,
        '/api/admin': AuditModule.ADMIN
    }
    
    for path_prefix, module in path_module_map.items():
        if path.startswith(path_prefix):
            return module
    
    return AuditModule.SYSTEM

def get_action_from_method(method):
    """
    Determine the action based on HTTP method
    """
    method_action_map = {
        'POST': AuditAction.CREATE,
        'PUT': AuditAction.UPDATE,
        'PATCH': AuditAction.UPDATE,
        'DELETE': AuditAction.DELETE,
        'GET': AuditAction.VIEW
    }
    
    return method_action_map.get(method)

def audit_route(action, module, resource_type, description=None):
    """
    Decorator for specific route audit logging
    
    Usage:
        @audit_route(AuditAction.CREATE, AuditModule.HR, 'Employee', 'Created new employee')
        def create_employee():
            # route implementation
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                # Execute the route function
                result = func(*args, **kwargs)
                
                # Mark as logged to prevent duplicate logging
                g.audit_logged = True
                
                # Extract resource info from result if possible
                resource_id = None
                resource_name = None
                
                # If result is a tuple (response, status_code)
                if isinstance(result, tuple) and len(result) >= 2:
                    response_data = result[0]
                    if hasattr(response_data, 'get_json'):
                        try:
                            json_data = response_data.get_json()
                            if json_data and isinstance(json_data, dict):
                                # Try to extract ID and name from common patterns
                                for key in ['id', 'user_id', 'employee_id', 'order_id']:
                                    if key in json_data:
                                        resource_id = json_data[key]
                                        break
                                
                                for key in ['name', 'username', 'title', 'full_name']:
                                    if key in json_data:
                                        resource_name = json_data[key]
                                        break
                        except:
                            pass
                
                # Generate description if not provided
                final_description = description or f"{func.__name__} executed"
                
                # Log the activity
                AuditService.log_activity(
                    action=action,
                    module=module,
                    resource_type=resource_type,
                    description=final_description,
                    resource_id=resource_id,
                    resource_name=resource_name
                )
                
                return result
                
            except Exception as e:
                # Log the error
                g.audit_logged = True
                AuditService.log_activity(
                    action=AuditAction.CREATE,  # Default action
                    module=AuditModule.SYSTEM,
                    resource_type='Error',
                    description=f"Error in {func.__name__}: {str(e)}"
                )
                raise
                
        return wrapper
    return decorator

def log_model_change(action, module, model_instance, description=None):
    """
    Helper function to log model changes
    
    Args:
        action: AuditAction enum
        module: AuditModule enum  
        model_instance: The model instance that was changed
        description: Optional description
    """
    try:
        resource_type = model_instance.__class__.__name__
        resource_id = getattr(model_instance, 'id', None)
        
        # Try to get a human-readable name
        resource_name = None
        for attr in ['name', 'username', 'title', 'full_name', 'email']:
            if hasattr(model_instance, attr):
                resource_name = getattr(model_instance, attr)
                break
        
        if not resource_name:
            resource_name = str(resource_id) if resource_id else 'Unknown'
        
        # Generate description if not provided
        if not description:
            action_text = action.value.lower()
            description = f"{action_text.capitalize()} {resource_type.lower()}: {resource_name}"
        
        # Get model data if it has to_dict method
        model_data = None
        if hasattr(model_instance, 'to_dict'):
            try:
                model_data = model_instance.to_dict()
            except:
                pass
        
        AuditService.log_activity(
            action=action,
            module=module,
            resource_type=resource_type,
            description=description,
            resource_id=resource_id,
            resource_name=resource_name,
            new_values=model_data if action in [AuditAction.CREATE, AuditAction.UPDATE] else None
        )
        
    except Exception as e:
        print(f"Error logging model change: {e}")

# Convenience functions for common operations
def log_login(user, success=True):
    """Log user login attempt"""
    action = AuditAction.LOGIN
    description = f"{'Successful' if success else 'Failed'} login attempt"
    
    AuditService.log_auth_activity(
        action=action,
        description=description,
        user_id=user.id if user and success else None,
        username=user.username if user else 'Unknown'
    )

def log_logout(user):
    """Log user logout"""
    AuditService.log_auth_activity(
        action=AuditAction.LOGOUT,
        description="User logged out",
        user_id=user.id if user else None,
        username=user.username if user else 'Unknown'
    )

def log_data_export(module, resource_type, count, description=None):
    """Log data export operations"""
    final_description = description or f"Exported {count} {resource_type.lower()} records"
    
    AuditService.log_activity(
        action=AuditAction.EXPORT,
        module=module,
        resource_type=resource_type,
        description=final_description
    )

def log_approval_action(action, resource_type, resource_id, resource_name, approved_by=None):
    """Log approval/rejection actions"""
    description = f"{action.value.capitalize()} {resource_type.lower()}: {resource_name}"
    if approved_by:
        description += f" by {approved_by}"
    
    AuditService.log_activity(
        action=action,
        module=AuditModule.APPROVAL,
        resource_type=resource_type,
        description=description,
        resource_id=resource_id,
        resource_name=resource_name
    )