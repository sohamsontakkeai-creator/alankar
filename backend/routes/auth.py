"""
Authentication Routes Module
API endpoints for user authentication (login, registration, password reset, OAuth)
"""
from flask import Blueprint, request, jsonify, current_app
from flask_mail import Message
from utils.jwt_helpers import create_access_token_safe
from utils.timezone_helpers import get_ist_now
from models.user import User, UserStatus, db
from models.password_reset_token import PasswordResetToken
from models import AuditAction, AuditModule
from services.audit_service import AuditService
from werkzeug.security import check_password_hash, generate_password_hash
import threading
import mailersend
from threading import Thread
import os 
from utils.mail import send_mailersend_email
from utils.mail import send_email_async

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/auth/register', methods=['POST'])
def register():
    """Register a new user with pending status"""
    try:
        data = request.get_json() or {}

        # Validate required fields
        required_fields = ['full_name', 'email', 'username', 'password', 'department']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Check if email already exists
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already registered'}), 409

        # Check if username already exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already taken'}), 409

        # Create new user with pending status
        new_user = User(
            full_name=data['full_name'],
            email=data['email'],
            username=data['username'],
            department=data['department'],
            status=UserStatus.PENDING
        )
        new_user.set_password(data['password'])

        db.session.add(new_user)
        db.session.commit()

        # Log registration activity
        AuditService.log_auth_activity(
            action=AuditAction.CREATE,
            description=f"User registered: {new_user.username} ({new_user.email})",
            user_id=new_user.id,
            username=new_user.username
        )

        return jsonify({
            'message': 'Registration successful! Your account is pending approval.',
            'user': new_user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/auth/login', methods=['POST'])
def login():
    """Authenticate a user using either username or email and return user data"""
    try:
        data = request.get_json() or {}

        # Validate required fields
        if ('username' not in data and 'email' not in data) or 'password' not in data:
            return jsonify({'error': 'Username/Email and password are required'}), 400

        # Find user by username or email
        if 'username' in data:
            user = User.query.filter_by(username=data['username']).first()
        else:
            user = User.query.filter_by(email=data['email']).first()

        # Check if user exists and password is correct
        if not user or not user.check_password(data['password']):
            # Log failed login attempt
            username_or_email = data.get('username') or data.get('email')
            AuditService.log_auth_activity(
                action=AuditAction.LOGIN,
                description=f"Failed login attempt for: {username_or_email}",
                username=username_or_email
            )
            return jsonify({'error': 'Invalid credentials'}), 401

        # Check if user is approved
        if user.status != UserStatus.APPROVED:
            # Log rejected login due to status
            AuditService.log_auth_activity(
                action=AuditAction.LOGIN,
                description=f"Login rejected - account not approved: {user.username}",
                user_id=user.id,
                username=user.username
            )
            return jsonify({'error': 'Your account is pending approval', 'status': user.status.value}), 403

        # Generate JWT token
        access_token = create_access_token_safe(identity=str(user.id))
        
        # Log successful login
        AuditService.log_auth_activity(
            action=AuditAction.LOGIN,
            description=f"Successful login: {user.username}",
            user_id=user.id,
            username=user.username
        )

        # Return user data with token
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'token': access_token
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/auth/pending-users', methods=['GET'])
def get_pending_users():
    """Get all users with pending status (admin only)"""
    try:
        # TODO: Add admin authentication check

        pending_users = User.query.filter_by(status=UserStatus.PENDING).all()
        return jsonify([user.to_dict() for user in pending_users]), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/auth/approve-user/<int:user_id>', methods=['PUT'])
def approve_user(user_id):
    """Approve a pending user (admin only)"""
    try:
        # TODO: Add admin authentication check

        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if user.status != UserStatus.PENDING:
            return jsonify({'error': 'User is not in pending status'}), 400

        user.status = UserStatus.APPROVED
        db.session.commit()

        # Log user approval
        AuditService.log_auth_activity(
            action=AuditAction.APPROVE,
            description=f"User approved: {user.username}",
            user_id=user.id,
            username=user.username
        )

        return jsonify({
            'message': 'User approved successfully',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/auth/reject-user/<int:user_id>', methods=['PUT'])
def reject_user(user_id):
    """Reject a pending user (admin only)"""
    try:
        # TODO: Add admin authentication check

        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if user.status != UserStatus.PENDING:
            return jsonify({'error': 'User is not in pending status'}), 400

        user.status = UserStatus.REJECTED
        db.session.commit()

        # Log user rejection
        AuditService.log_auth_activity(
            action=AuditAction.REJECT,
            description=f"User rejected: {user.username}",
            user_id=user.id,
            username=user.username
        )

        return jsonify({
            'message': 'User rejected successfully',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/auth/users', methods=['GET'])
def get_all_users():
    """Get all users (admin only)"""
    try:
        # TODO: Add admin authentication check

        users = User.query.all()
        return jsonify([user.to_dict() for user in users]), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/auth/users-by-department', methods=['GET'])
def get_users_by_department():
    """Get users filtered by department"""
    try:
        department = request.args.get('department')
        status = request.args.get('status')
        
        query = User.query
        
        if department:
            query = query.filter_by(department=department)
        
        if status:
            query = query.filter_by(status=status)
        else:
            # By default, only return approved users
            query = query.filter_by(status=UserStatus.APPROVED)
        
        users = query.all()
        return jsonify({
            'users': [user.to_dict() for user in users]
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/auth/users/<int:user_id>/department', methods=['PUT'])
def update_user_department(user_id):
    """Update user's department (admin only)"""
    try:
        # TODO: Add admin authentication check

        data = request.get_json() or {}

        if 'department' not in data:
            return jsonify({'error': 'Department is required'}), 400

        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        old_department = user.department
        user.department = data['department']
        user.updated_at = get_ist_now()  # Update timestamp to track change
        db.session.commit()

        # Log the department change
        print(f"[DEPARTMENT CHANGE] User {user.username} (ID: {user_id}) department changed from {old_department} to {data['department']}")

        return jsonify({
            'message': 'User department updated successfully',
            'user': user.to_dict(),
            'department_changed': True,
            'affected_user_id': user_id
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/auth/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Delete a user from the system (admin only)"""
    try:
        # TODO: Add admin authentication check

        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Prevent admin from deleting themselves
        if user.department == 'admin':
            return jsonify({'error': 'Cannot delete admin user'}), 400

        db.session.delete(user)
        db.session.commit()

        return jsonify({
            'message': 'User deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/auth/forgot-password', methods=['POST'])
def forgot_password():
    """
    Handle forgot password requests and send reset link via MailerSend.
    The reset link will always be sent to the ADMIN email, but the
    password reset will apply to the user’s own account.
    """
    try:
        data = request.get_json() or {}
        email = data.get('email')

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        # Check if user exists
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'No account found with this email'}), 404

        # Create password reset token for that specific user
        reset_token_obj = PasswordResetToken.create_token(user.id)

        # Generate reset link
        frontend_base_url = current_app.config.get('FRONTEND_BASE_URL', 'http://localhost:5173')
        reset_url = f"{frontend_base_url}/reset-password?token={reset_token_obj.token}"

        # Email details
        user_name = getattr(user, 'name', None) or getattr(user, 'username', None) or "User"
        subject = f"Password Reset Request for {user_name}"

        # ✅ Send to admin email only
        admin_email = "alankarengghelp@gmail.com"

        text_content = (
            f"User {user_name} ({email}) has requested a password reset.\n\n"
            f"Click this link to reset their password:\n{reset_url}"
        )

        html_content = f"""
            <p><b>User:</b> {user_name} ({email})</p>
            <p>Requested a password reset.</p>
            <p><a href="{reset_url}" style="color: blue; text-decoration: underline;">
                Click here to reset their password
            </a></p>
            <p>If this wasn't expected, please ignore this message.</p>
        """

        # Send email asynchronously to admin
        Thread(
            target=send_email_async,
            args=(current_app._get_current_object(), admin_email, subject, html_content, text_content)
        ).start()

        return jsonify({
            'message': 'A password reset link has been sent to the support email. The support team will assist you with your password reset.',
            'reset_token': reset_token_obj.token,
            'reset_url': reset_url
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Forgot password error: {e}")
        return jsonify({'error': str(e)}), 500
        
@auth_bp.route('/auth/reset-password', methods=['POST'])
def reset_password():
    """Reset user password using token"""
    try:
        data = request.get_json() or {}

        required_fields = ['token', 'new_password']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Validate token and get user
        user = PasswordResetToken.validate_token(data['token'])
        if not user:
            return jsonify({'error': 'Invalid or expired reset token'}), 400

        # Update password
        user.set_password(data['new_password'])
        db.session.commit()

        # Mark token as used
        PasswordResetToken.mark_token_used(data['token'])

        return jsonify({'message': 'Password reset successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/auth/departments', methods=['GET'])
def get_departments():
    """Get all available departments"""
    try:
        # Default departments (including management)
        default_departments = ['production', 'purchase', 'store', 'assembly', 'finance', 'showroom', 'sales', 'dispatch', 'transport', 'hr', 'watchman', 'management', 'admin']

        # Get unique departments from existing users
        users = User.query.all()
        user_departments = set(user.department for user in users if user.department)

        # Combine and sort
        all_departments = sorted(list(set(default_departments + list(user_departments))))

        return jsonify({'departments': all_departments}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/auth/validate-session', methods=['POST'])
def validate_session():
    """Validate if user's session is still valid (check if department changed)"""
    try:
        data = request.get_json() or {}
        user_id = data.get('userId')
        current_department = data.get('currentDepartment')
        
        if not user_id or not current_department:
            return jsonify({'valid': False, 'reason': 'Missing parameters'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'valid': False, 'reason': 'User not found'}), 404
        
        # Check if department has changed
        if user.department != current_department:
            return jsonify({
                'valid': False,
                'reason': 'Department changed',
                'new_department': user.department,
                'message': 'Your department has been changed. Please login again.'
            }), 200
        
        return jsonify({'valid': True}), 200
        
    except Exception as e:
        return jsonify({'valid': False, 'reason': str(e)}), 500
