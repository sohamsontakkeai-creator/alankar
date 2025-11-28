"""
Role and permission helper functions for the ERP system
"""

def can_read_department(user_department, target_department):
    """
    Check if a user can read data from a target department
    
    Args:
        user_department: The department of the user making the request
        target_department: The department being accessed
        
    Returns:
        bool: True if user can read from target department
    """
    # Admin can read everything
    if user_department == 'admin':
        return True
    
    # Management can read everything
    if user_department == 'management':
        return True
    
    # Users can read their own department
    if user_department == target_department:
        return True
    
    return False


def can_write_department(user_department, target_department):
    """
    Check if a user can write/modify data in a target department
    
    Args:
        user_department: The department of the user making the request
        target_department: The department being accessed
        
    Returns:
        bool: True if user can write to target department
    """
    # Admin can write everything
    if user_department == 'admin':
        return True
    
    # Management can only write to approval-related actions
    # This is handled separately in approval routes
    if user_department == 'management':
        return False
    
    # Users can write to their own department
    if user_department == target_department:
        return True
    
    return False


def can_approve(user_department):
    """
    Check if a user can approve requests
    
    Args:
        user_department: The department of the user
        
    Returns:
        bool: True if user can approve requests
    """
    return user_department in ['admin', 'management']


def is_management_or_admin(user_department):
    """
    Check if user is management or admin
    
    Args:
        user_department: The department of the user
        
    Returns:
        bool: True if user is management or admin
    """
    return user_department in ['admin', 'management']
