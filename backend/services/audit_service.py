"""
Audit Service for logging system activities
"""

from flask import request, session, g, current_app
from flask_jwt_extended import get_jwt_identity
from utils.jwt_helpers import get_jwt_identity_safe
from models import AuditTrail, AuditAction, AuditModule, User
from functools import wraps
import uuid
import json
from sqlalchemy import event


class AuditService:
    """Service class for handling audit trail operations"""

    @staticmethod
    def get_request_context():
        """Extract request context information for audit logging"""
        context = {
            "user_ip": None,
            "user_agent": None,
            "session_id": None,
            "request_id": None,
            "user_id": None,
            "username": None,
        }

        try:
            # Safely get request info if in a request context
            if request:
                context["user_ip"] = request.headers.get(
                    "X-Forwarded-For", request.remote_addr
                )
                context["user_agent"] = request.headers.get("User-Agent")

            # Get or generate a session ID
            if session is not None:
                context["session_id"] = session.get("session_id") or str(uuid.uuid4())
                session["session_id"] = context["session_id"]

            # Generate a unique request ID for correlation
            context["request_id"] = getattr(g, "request_id", str(uuid.uuid4()))
            g.request_id = context["request_id"]

            # Get current user from JWT (safe integer/string conversion)
            try:
                current_user_id = get_jwt_identity_safe()
                if current_user_id:
                    user = User.query.get(current_user_id)
                    if user:
                        context["user_id"] = user.id
                        context["username"] = user.username
            except Exception:
                # Skip user resolution if token missing or invalid
                pass

        except Exception as e:
            print(f"[AuditService] Error getting request context: {e}")

        return context

    # ----------------------------------------------------------------------
    # Core audit logging
    # ----------------------------------------------------------------------

    @staticmethod
    def log_activity(
        action,
        module,
        resource_type,
        description,
        resource_id=None,
        resource_name=None,
        old_values=None,
        new_values=None,
        user_id=None,
        username=None,
    ):
        """
        Log an activity to the audit trail.

        Args:
            action (AuditAction): The type of action performed.
            module (AuditModule): The module where it occurred.
            resource_type (str): The affected resource type.
            description (str): Human-readable description.
            resource_id (int|str): ID of the affected resource.
            resource_name (str): Name of the affected resource.
            old_values (dict|str): Previous state.
            new_values (dict|str): New state.
            user_id (int|str): Override user ID.
            username (str): Override username.
        """
        try:
            context = AuditService.get_request_context()

            final_user_id = user_id or context["user_id"]
            final_username = username or context["username"]

            # Save the activity
            return AuditTrail.log_activity(
                action=action,
                module=module,
                resource_type=resource_type,
                description=description,
                user_id=final_user_id,
                username=final_username,
                resource_id=resource_id,
                resource_name=resource_name,
                old_values=old_values,
                new_values=new_values,
                user_ip=context["user_ip"],
                user_agent=context["user_agent"],
                session_id=context["session_id"],
                request_id=context["request_id"],
            )

        except Exception as e:
            print(f"[AuditService] Error logging audit activity: {e}")
            return None

    # ----------------------------------------------------------------------
    # Convenience wrappers
    # ----------------------------------------------------------------------

    @staticmethod
    def log_auth_activity(action, description, user_id=None, username=None):
        """Log authentication-related events."""
        return AuditService.log_activity(
            action=action,
            module=AuditModule.AUTH,
            resource_type="User",
            description=description,
            resource_id=user_id,
            resource_name=username,
            user_id=user_id,
            username=username,
        )

    @staticmethod
    def log_data_change(
        action,
        module,
        resource_type,
        resource_id,
        resource_name,
        old_data,
        new_data,
        description=None,
    ):
        """
        Log data changes (CREATE, UPDATE, DELETE) with before/after values.
        """
        try:
            # Convert model instances to dicts for serialization
            def serialize_data(data):
                if data is None:
                    return None
                if hasattr(data, "to_dict"):
                    return data.to_dict()
                if isinstance(data, dict):
                    return data
                try:
                    return json.loads(json.dumps(data))
                except Exception:
                    return str(data)

            old_values = serialize_data(old_data)
            new_values = serialize_data(new_data)

            if not description:
                description = (
                    f"{action.value.capitalize()} {resource_type.lower()}: {resource_name}"
                )

            return AuditService.log_activity(
                action=action,
                module=module,
                resource_type=resource_type,
                description=description,
                resource_id=resource_id,
                resource_name=resource_name,
                old_values=old_values,
                new_values=new_values,
            )

        except Exception as e:
            print(f"[AuditService] Error logging data change: {e}")
            return None


# ----------------------------------------------------------------------
# Decorators
# ----------------------------------------------------------------------

def audit_log(action, module, resource_type, description=None):
    """
    Decorator for automatically logging function calls.

    Example:
        @audit_log(AuditAction.CREATE, AuditModule.HR, 'Employee')
        def create_employee(data):
            return employee
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                result = func(*args, **kwargs)

                # Build log metadata
                func_description = description or f"{func.__name__} executed"
                resource_id = getattr(result, "id", None)
                resource_name = (
                    getattr(result, "name", None)
                    or getattr(result, "username", None)
                    or getattr(result, "title", None)
                )

                AuditService.log_activity(
                    action=action,
                    module=module,
                    resource_type=resource_type,
                    description=func_description,
                    resource_id=resource_id,
                    resource_name=resource_name,
                )

                return result

            except Exception as e:
                # Log the failure as a system-level event
                AuditService.log_activity(
                    action=AuditAction.CREATE,  # fallback type
                    module=AuditModule.SYSTEM,
                    resource_type="Error",
                    description=f"Error in {func.__name__}: {e}",
                )
                raise

        return wrapper
    return decorator


# ----------------------------------------------------------------------
# Model change tracking decorator
# ----------------------------------------------------------------------

def track_model_changes(model_class, module):
    """
    Decorator to automatically track SQLAlchemy model changes.

    Usage:
        @track_model_changes(Employee, AuditModule.HR)
        class Employee(db.Model):
            ...
    """
    def decorator(cls):
        original_init = cls.__init__

        def new_init(self, *args, **kwargs):
            original_init(self, *args, **kwargs)
            self._audit_original_state = None

        def before_update(mapper, connection, target):
            if hasattr(target, "to_dict"):
                target._audit_original_state = target.to_dict()

        def after_insert(mapper, connection, target):
            AuditService.log_data_change(
                action=AuditAction.CREATE,
                module=module,
                resource_type=cls.__name__,
                resource_id=getattr(target, "id", None),
                resource_name=getattr(target, "name", str(getattr(target, "id", ""))),
                old_data=None,
                new_data=target,
            )

        def after_update(mapper, connection, target):
            old_state = getattr(target, "_audit_original_state", None)
            AuditService.log_data_change(
                action=AuditAction.UPDATE,
                module=module,
                resource_type=cls.__name__,
                resource_id=getattr(target, "id", None),
                resource_name=getattr(target, "name", str(getattr(target, "id", ""))),
                old_data=old_state,
                new_data=target,
            )

        def after_delete(mapper, connection, target):
            AuditService.log_data_change(
                action=AuditAction.DELETE,
                module=module,
                resource_type=cls.__name__,
                resource_id=getattr(target, "id", None),
                resource_name=getattr(target, "name", str(getattr(target, "id", ""))),
                old_data=target,
                new_data=None,
            )

        event.listen(cls, "before_update", before_update)
        event.listen(cls, "after_insert", after_insert)
        event.listen(cls, "after_update", after_update)
        event.listen(cls, "after_delete", after_delete)

        cls.__init__ = new_init
        return cls

    return decorator
