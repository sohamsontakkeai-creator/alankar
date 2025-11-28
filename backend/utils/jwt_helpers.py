"""
JWT Helper Functions
Utility functions to handle JWT token creation and validation with proper type conversion
"""

from flask_jwt_extended import create_access_token as _create_access_token
from flask_jwt_extended import get_jwt_identity as _get_jwt_identity
from flask_jwt_extended import decode_token as _decode_token
from flask_jwt_extended import JWTManager
import jwt
from flask import current_app

# ==========================
# Monkey patch PyJWT to allow integer subjects
# ==========================

original_encode = jwt.encode

def patched_encode(payload, key, algorithm='HS256', headers=None, json_encoder=None):
    """Patched JWT encode that allows integer subjects"""
    # Create a copy of the payload and convert subject to string if needed
    patched_payload = payload.copy()
    if 'sub' in patched_payload and not isinstance(patched_payload['sub'], str):
        patched_payload['sub'] = str(patched_payload['sub'])

    return original_encode(patched_payload, key, algorithm, headers, json_encoder)

# Replace the encode function
jwt.encode = patched_encode


# ==========================
# Safe token creation and identity retrieval
# ==========================

def create_access_token_safe(identity, **kwargs):
    """
    Create JWT access token with identity converted to string

    Args:
        identity: User ID (int or str)
        **kwargs: Additional arguments to pass to create_access_token

    Returns:
        str: JWT access token
    """
    # Convert identity to string to avoid "Subject must be a string" error
    return _create_access_token(identity=str(identity), **kwargs)


def get_jwt_identity_safe():
    """
    Get JWT identity and convert back to integer if possible

    Returns:
        int or str: User ID as integer if possible, otherwise string
    """
    identity = _get_jwt_identity()

    # Try to convert back to integer
    try:
        return int(identity)
    except (ValueError, TypeError):
        return identity


def decode_token(token):
    """
    Decode JWT token and return payload with user information
    
    Args:
        token: JWT token string
        
    Returns:
        dict: Token payload with user information, or None if invalid
    """
    try:
        # Decode the token
        decoded = _decode_token(token)
        
        # Get user information from the token
        user_id = decoded.get('sub')
        
        # Import here to avoid circular imports
        from models import User
        user = User.query.get(int(user_id))
        
        if user:
            return {
                'id': user.id,
                'username': user.username,
                'department': user.department,
                'full_name': user.full_name,
                'email': user.email
            }
        return None
    except Exception as e:
        print(f"Error decoding token: {e}")
        return None


# ==========================
# JWT Manager Configuration
# ==========================

def configure_jwt_manager(app):
    """
    Configure JWT Manager with custom identity handling to support both string and integer identities
    """
    jwt_manager = JWTManager(app)

    @jwt_manager.user_identity_loader
    def user_identity_lookup(user):
        """Convert user identity to string for JWT"""
        return str(user)

    @jwt_manager.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        """Custom user lookup that handles both string and integer identities"""
        identity = jwt_data.get("sub")

        # Try to convert to integer for backward compatibility
        try:
            user_id = int(identity)
        except (ValueError, TypeError):
            user_id = identity

        # Import here to avoid circular imports
        from models import User
        return User.query.get(user_id)

    @jwt_manager.decode_key_loader
    def custom_decode_key(jwt_header, jwt_payload):
        """Custom decode key loader"""
        return current_app.config.get('JWT_SECRET_KEY')

    @jwt_manager.token_verification_loader
    def token_verification_callback(jwt_header, jwt_payload):
        """Custom token verification that handles integer identities"""
        # Allow tokens with integer identities for backward compatibility
        return True

    return jwt_manager
