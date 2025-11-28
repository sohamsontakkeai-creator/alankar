"""
Audit Trail Model for tracking system activities
"""
from datetime import datetime
from . import db
from sqlalchemy import Enum
import enum

class AuditAction(enum.Enum):
    """Enumeration for audit actions"""
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    VIEW = "VIEW"
    EXPORT = "EXPORT"
    IMPORT = "IMPORT"
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    SUBMIT = "SUBMIT"
    CANCEL = "CANCEL"
    RESTORE = "RESTORE"

class AuditModule(enum.Enum):
    """Enumeration for system modules"""
    AUTH = "AUTH"
    HR = "HR"
    PRODUCTION = "PRODUCTION"
    PURCHASE = "PURCHASE"
    INVENTORY = "INVENTORY"
    SHOWROOM = "SHOWROOM"
    FINANCE = "FINANCE"
    SALES = "SALES"
    TRANSPORT = "TRANSPORT"
    SECURITY = "SECURITY"
    GATE_ENTRY = "GATE_ENTRY"
    GUEST_LIST = "GUEST_LIST"
    APPROVAL = "APPROVAL"
    ADMIN = "ADMIN"

class AuditTrail(db.Model):
    """
    Model for tracking all system activities and changes
    """
    __tablename__ = 'audit_trail'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # User information
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    username = db.Column(db.String(100), nullable=True)  # Store username for deleted users
    user_ip = db.Column(db.String(45), nullable=True)  # Support IPv6
    user_agent = db.Column(db.Text, nullable=True)
    
    # Activity information
    action = db.Column(Enum(AuditAction), nullable=False)
    module = db.Column(Enum(AuditModule), nullable=False)
    resource_type = db.Column(db.String(100), nullable=False)  # Table/Model name
    resource_id = db.Column(db.String(100), nullable=True)  # Record ID
    resource_name = db.Column(db.String(255), nullable=True)  # Human readable name
    
    # Change details
    description = db.Column(db.Text, nullable=False)
    old_values = db.Column(db.JSON, nullable=True)  # Previous state
    new_values = db.Column(db.JSON, nullable=True)  # New state
    
    # Metadata
    timestamp = db.Column(db.DateTime, default=datetime.now, nullable=False)
    session_id = db.Column(db.String(255), nullable=True)
    request_id = db.Column(db.String(100), nullable=True)  # For request tracing
    
    # Relationships
    user = db.relationship('User', backref='audit_logs', lazy=True)
    
    def __repr__(self):
        return f'<AuditTrail {self.id}: {self.action.value} on {self.resource_type}>'
    
    def to_dict(self):
        """Convert audit trail to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.username,
            'user_ip': self.user_ip,
            'action': self.action.value if self.action else None,
            'module': self.module.value if self.module else None,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'resource_name': self.resource_name,
            'description': self.description,
            'old_values': self.old_values,
            'new_values': self.new_values,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'session_id': self.session_id,
            'request_id': self.request_id
        }
    
    @classmethod
    def log_activity(cls, action, module, resource_type, description, 
                    user_id=None, username=None, resource_id=None, 
                    resource_name=None, old_values=None, new_values=None,
                    user_ip=None, user_agent=None, session_id=None, request_id=None):
        """
        Create a new audit log entry
        
        Args:
            action: AuditAction enum value
            module: AuditModule enum value
            resource_type: String identifying the resource type
            description: Human readable description of the action
            user_id: ID of the user performing the action
            username: Username (for cases where user might be deleted)
            resource_id: ID of the affected resource
            resource_name: Human readable name of the resource
            old_values: Previous state of the resource
            new_values: New state of the resource
            user_ip: IP address of the user
            user_agent: User agent string
            session_id: Session identifier
            request_id: Request identifier for tracing
        """
        try:
            audit_log = cls(
                user_id=user_id,
                username=username,
                user_ip=user_ip,
                user_agent=user_agent,
                action=action,
                module=module,
                resource_type=resource_type,
                resource_id=str(resource_id) if resource_id else None,
                resource_name=resource_name,
                description=description,
                old_values=old_values,
                new_values=new_values,
                session_id=session_id,
                request_id=request_id
            )
            
            db.session.add(audit_log)
            db.session.commit()
            return audit_log
            
        except Exception as e:
            db.session.rollback()
            print(f"Error creating audit log: {e}")
            return None
    
    @classmethod
    def get_user_activities(cls, user_id, limit=50):
        """Get recent activities for a specific user"""
        return cls.query.filter_by(user_id=user_id)\
                      .order_by(cls.timestamp.desc())\
                      .limit(limit).all()
    
    @classmethod
    def get_resource_history(cls, resource_type, resource_id, limit=50):
        """Get history for a specific resource"""
        return cls.query.filter_by(resource_type=resource_type, resource_id=str(resource_id))\
                      .order_by(cls.timestamp.desc())\
                      .limit(limit).all()
    
    @classmethod
    def get_module_activities(cls, module, limit=100):
        """Get recent activities for a specific module"""
        return cls.query.filter_by(module=module)\
                      .order_by(cls.timestamp.desc())\
                      .limit(limit).all()