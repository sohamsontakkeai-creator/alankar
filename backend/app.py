"""
Main Flask application entry point
"""
from flask import Flask , request, g  
from flask_cors import CORS
from flask_mail import Mail
from flask_session import Session
from config import config
from models import db
from routes import register_blueprints
from utils.migration_manager import init_migrations
from utils.audit_middleware import audit_middleware
from utils.jwt_helpers import configure_jwt_manager
from utils.websocket_manager import init_socketio, socketio
import os

mail = Mail()  # Initialize Mail instance globally

def create_app(config_name=None):
    """
    Application factory pattern
    
    Args:
        config_name: Configuration environment name
        
    Returns:
        Flask: Configured Flask application instance
    """
    app = Flask(__name__)
    
    # Load configuration
    config_name = config_name or os.getenv('FLASK_CONFIG', 'default')
    app.config.from_object(config[config_name])
    
    # Load frontend URL from environment (for password reset links)
    app.config['FRONTEND_BASE_URL'] = os.getenv('FRONTEND_BASE_URL', 'http://localhost:5173')
    
    # Load backend URL from environment (for file uploads)
    app.config['BACKEND_BASE_URL'] = os.getenv('BACKEND_BASE_URL', 'http://localhost:5000')
    
    # Initialize extensions
    db.init_app(app)
    mail.init_app(app)  # Initialize Mail with app
    Session(app)  # Initialize Flask-Session
    configure_jwt_manager(app)  # Initialize JWT Manager with custom configuration
    init_socketio(app)  # Initialize WebSocket support

    CORS(app)
    
    # Register audit middleware
    app.before_request(audit_middleware)
    
    # Register after request handler for audit logging
    # NOTE: This handler is now DISABLED - all departments have custom business audit logging
    # Only auth-related endpoints should be logged automatically
    @app.after_request
    def log_request_audit(response):
        try:
            # Only log authentication-related endpoints
            # All other departments have custom business audit logging
            auth_paths = [
                '/api/auth/login',
                '/api/auth/logout',
                '/api/auth/register',
            ]
            
            # If path is not auth-related, skip logging
            if not any(request.path.startswith(path) for path in auth_paths):
                return response
            
            # Skip GET requests
            if request.method == 'GET':
                return response
                
            # Only log if request was not already logged by specific route
            if hasattr(g, 'audit_logged'):
                return response
                
            from utils.audit_middleware import get_module_from_path, get_action_from_method
            from services.audit_service import AuditService
            from models import AuditAction, AuditModule
            
            # Determine module based on URL path
            module = get_module_from_path(request.path)
            
            # Determine action based on HTTP method
            action = get_action_from_method(request.method)
            
            if action and module:
                description = f"{request.method} {request.path}"
                if response.status_code >= 400:
                    description += f" - Status: {response.status_code}"
                
                AuditService.log_activity(
                    action=action,
                    module=module,
                    resource_type='API',
                    description=description
                )
        except Exception as e:
            print(f"Error in audit after_request: {e}")
            
        return response
    
    # Register blueprints
    register_blueprints(app)

    return app

def initialize_database(app):
    """Initialize database with tables and sample data"""
    with app.app_context():
        try:
            # Step 1: Run all custom migrations first
            print("\n🔧 Running custom migrations...")
            init_migrations(app, db)
            
            # Step 2: Create all database tables from models
            db.create_all()
            print("✅ Database tables created successfully!")
            
            # Step 3: Check and add missing columns for MySQL
            from sqlalchemy import text
            
            try:
                # Check if original_requirements column exists in purchase_order table
                result = db.session.execute(text("""
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'purchase_order' 
                    AND COLUMN_NAME = 'original_requirements'
                """))
                
                column_exists = result.fetchone() is not None
                
                if not column_exists:
                    print("🔄 Adding missing original_requirements column...")
                    db.session.execute(text("ALTER TABLE purchase_order ADD COLUMN original_requirements TEXT"))
                    db.session.commit()
                    print("✅ original_requirements column added successfully!")
                else:
                    print("ℹ️ original_requirements column already exists")
                    
            except Exception as e:
                print(f"⚠️ Error checking/adding column: {e}")
                db.session.rollback()
            
            # Step 4: Create admin user if it doesn't exist
            from models import User, UserStatus
            admin_created = User.create_admin_user()
            if admin_created:
                print("✅ Admin user created successfully!")
            else:
                print("ℹ️ Admin user already exists")
            
                
        except Exception as e:
            print(f"❌ Error setting up database: {e}")
            raise

if __name__ == '__main__':
    # Create the Flask application
    app = create_app()
    
    # Initialize database
    initialize_database(app)
    
    # Run the application with SocketIO
    socketio.run(
        app,
        debug=app.config.get('DEBUG', True),
        host='0.0.0.0',
        port=5000,
        allow_unsafe_werkzeug=True
    )
