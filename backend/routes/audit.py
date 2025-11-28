"""
Audit Trail Routes
"""
from flask import Blueprint, request, jsonify, make_response
from models import AuditTrail, AuditAction, AuditModule, User, db
from services.audit_service import AuditService
from datetime import datetime, timedelta
from utils.timezone_helpers import get_ist_now
from sqlalchemy import and_, or_, desc, func
import csv
import io

audit_bp = Blueprint('audit', __name__, url_prefix='/api/audit')

@audit_bp.route('/logs', methods=['GET'])
def get_audit_logs():
    """Get audit logs with filtering and pagination"""
    try:
        # FIX: Accept subject parameter (even if not used)
        subject = request.args.get('subject', 'system', type=str)
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 100)
        
        # Filters
        user_filter = request.args.get('user_id', type=int)
        module_filter = request.args.get('module')
        action_filter = request.args.get('action')
        resource_type_filter = request.args.get('resource_type')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        search = request.args.get('search')
        
        # Build query
        query = AuditTrail.query
        
        # Apply filters
        if user_filter:
            query = query.filter(AuditTrail.user_id == user_filter)
            
        if module_filter:
            try:
                module_enum = AuditModule(module_filter)
                query = query.filter(AuditTrail.module == module_enum)
            except ValueError:
                pass
                
        if action_filter:
            try:
                action_enum = AuditAction(action_filter)
                query = query.filter(AuditTrail.action == action_enum)
            except ValueError:
                pass
                
        if resource_type_filter:
            query = query.filter(AuditTrail.resource_type.ilike(f'%{resource_type_filter}%'))
            
        if date_from:
            try:
                date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                query = query.filter(AuditTrail.timestamp >= date_from_obj)
            except ValueError:
                pass
                
        if date_to:
            try:
                date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                query = query.filter(AuditTrail.timestamp <= date_to_obj)
            except ValueError:
                pass
                
        if search:
            search_filter = or_(
                AuditTrail.description.ilike(f'%{search}%'),
                AuditTrail.resource_name.ilike(f'%{search}%'),
                AuditTrail.username.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)
        
        # Order by timestamp descending
        query = query.order_by(desc(AuditTrail.timestamp))
        
        # Paginate
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        # Convert to dict
        logs = [log.to_dict() for log in pagination.items]
        
        # Add user information
        for log in logs:
            if log['user_id']:
                user = User.query.get(log['user_id'])
                if user:
                    log['user_name'] = user.full_name
                    log['user_department'] = user.department
        
        # Don't log VIEW actions - they create too much noise
        
        return jsonify({
            'logs': logs,
            'pagination': {
                'page': pagination.page,
                'pages': pagination.pages,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        })
        
    except Exception as e:
        error_msg = str(e)
        # Handle JWT "Subject must be a string" error with helpful message
        if 'subject must be a string' in error_msg.lower():
            return jsonify({
                'error': 'Invalid authentication token. Please log out and log back in.',
                'details': 'Your session token is outdated and needs to be refreshed.'
            }), 401
        return jsonify({'error': error_msg}), 500

@audit_bp.route('/stats', methods=['GET'])
def get_audit_stats():
    """Get audit trail statistics"""
    try:
        # FIX: Accept subject parameter (even if not used)
        subject = request.args.get('subject', 'system', type=str)
        
        # Get date range (default to last 30 days)
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        if not date_from:
            # Use local time instead of UTC to match the timestamps in database
            date_from = datetime.now() - timedelta(days=30)
        else:
            date_from = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            
        if not date_to:
            # Use local time instead of UTC to match the timestamps in database
            date_to = datetime.now()
        else:
            date_to = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
        
        # Base query with date filter
        base_query = AuditTrail.query.filter(
            and_(
                AuditTrail.timestamp >= date_from,
                AuditTrail.timestamp <= date_to
            )
        )
        
        # Total activities
        total_activities = base_query.count()
        
        # Activities by action
        actions_stats = db.session.query(
            AuditTrail.action,
            func.count(AuditTrail.id).label('count')
        ).filter(
            and_(
                AuditTrail.timestamp >= date_from,
                AuditTrail.timestamp <= date_to
            )
        ).group_by(AuditTrail.action).all()
        
        # Activities by module
        modules_stats = db.session.query(
            AuditTrail.module,
            func.count(AuditTrail.id).label('count')
        ).filter(
            and_(
                AuditTrail.timestamp >= date_from,
                AuditTrail.timestamp <= date_to
            )
        ).group_by(AuditTrail.module).all()
        
        # Top users
        users_stats = db.session.query(
            AuditTrail.user_id,
            AuditTrail.username,
            func.count(AuditTrail.id).label('count')
        ).filter(
            and_(
                AuditTrail.timestamp >= date_from,
                AuditTrail.timestamp <= date_to,
                AuditTrail.user_id.isnot(None)
            )
        ).group_by(AuditTrail.user_id, AuditTrail.username)\
         .order_by(desc(func.count(AuditTrail.id)))\
         .limit(10).all()
        
        # Daily activity trend
        daily_stats = db.session.query(
            func.date(AuditTrail.timestamp).label('date'),
            func.count(AuditTrail.id).label('count')
        ).filter(
            and_(
                AuditTrail.timestamp >= date_from,
                AuditTrail.timestamp <= date_to
            )
        ).group_by(func.date(AuditTrail.timestamp))\
         .order_by(func.date(AuditTrail.timestamp)).all()
        
        # Format results
        stats = {
            'total_activities': total_activities,
            'date_range': {
                'from': date_from.isoformat(),
                'to': date_to.isoformat()
            },
            'actions': [
                {'action': action.value if action else 'Unknown', 'count': count}
                for action, count in actions_stats
            ],
            'modules': [
                {'module': module.value if module else 'Unknown', 'count': count}
                for module, count in modules_stats
            ],
            'top_users': [
                {
                    'user_id': user_id,
                    'username': username,
                    'count': count
                }
                for user_id, username, count in users_stats
            ],
            'daily_trend': [
                {
                    'date': date.isoformat() if date else None,
                    'count': count
                }
                for date, count in daily_stats
            ]
        }
        
        return jsonify(stats)
        
    except Exception as e:
        error_msg = str(e)
        # Handle JWT "Subject must be a string" error with helpful message
        if 'subject must be a string' in error_msg.lower():
            return jsonify({
                'error': 'Invalid authentication token. Please log out and log back in.',
                'details': 'Your session token is outdated and needs to be refreshed.'
            }), 401
        return jsonify({'error': error_msg}), 500

@audit_bp.route('/export', methods=['GET'])
def export_audit_logs():
    """Export audit logs to CSV"""
    try:
        # FIX: Accept subject parameter (even if not used)
        subject = request.args.get('subject', 'system', type=str)
        
        # Get filters (same as get_audit_logs)
        user_filter = request.args.get('user_id', type=int)
        module_filter = request.args.get('module')
        action_filter = request.args.get('action')
        resource_type_filter = request.args.get('resource_type')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        search = request.args.get('search')
        
        # Build query (same logic as get_audit_logs)
        query = AuditTrail.query
        
        if user_filter:
            query = query.filter(AuditTrail.user_id == user_filter)
            
        if module_filter:
            try:
                module_enum = AuditModule(module_filter)
                query = query.filter(AuditTrail.module == module_enum)
            except ValueError:
                pass
                
        if action_filter:
            try:
                action_enum = AuditAction(action_filter)
                query = query.filter(AuditTrail.action == action_enum)
            except ValueError:
                pass
                
        if resource_type_filter:
            query = query.filter(AuditTrail.resource_type.ilike(f'%{resource_type_filter}%'))
            
        if date_from:
            try:
                date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                query = query.filter(AuditTrail.timestamp >= date_from_obj)
            except ValueError:
                pass
                
        if date_to:
            try:
                date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                query = query.filter(AuditTrail.timestamp <= date_to_obj)
            except ValueError:
                pass
                
        if search:
            search_filter = or_(
                AuditTrail.description.ilike(f'%{search}%'),
                AuditTrail.resource_name.ilike(f'%{search}%'),
                AuditTrail.username.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)
        
        # Order by timestamp descending and limit to prevent huge exports
        logs = query.order_by(desc(AuditTrail.timestamp)).limit(10000).all()
        
        # Create CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            'ID', 'Timestamp', 'User ID', 'Username', 'Action', 'Module',
            'Resource Type', 'Resource ID', 'Resource Name', 'Description',
            'User IP', 'Session ID'
        ])
        
        # Write data
        for log in logs:
            writer.writerow([
                log.id,
                log.timestamp.isoformat() if log.timestamp else '',
                log.user_id or '',
                log.username or '',
                log.action.value if log.action else '',
                log.module.value if log.module else '',
                log.resource_type or '',
                log.resource_id or '',
                log.resource_name or '',
                log.description or '',
                log.user_ip or '',
                log.session_id or ''
            ])
        
        # Create response
        output.seek(0)
        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = f'attachment; filename=audit_logs_{get_ist_now().strftime("%Y%m%d_%H%M%S")}.csv'
        
        # Log export action
        AuditService.log_activity(
            action=AuditAction.EXPORT,
            module=AuditModule.ADMIN,
            resource_type='AuditTrail',
            description=f'Exported {len(logs)} audit log records'
        )
        
        return response
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@audit_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_audit_logs(user_id):
    """Get audit logs for a specific user"""
    try:
        # FIX: Accept subject parameter (even if not used)
        subject = request.args.get('subject', 'system', type=str)
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 50)
        
        # Get user logs
        logs = AuditTrail.get_user_activities(user_id, limit=per_page * page)
        
        # Convert to dict
        logs_data = [log.to_dict() for log in logs]
        
        return jsonify({
            'user_id': user_id,
            'logs': logs_data
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@audit_bp.route('/resource/<resource_type>/<resource_id>', methods=['GET'])
def get_resource_audit_logs(resource_type, resource_id):
    """Get audit logs for a specific resource"""
    try:
        # FIX: Accept subject parameter (even if not used)
        subject = request.args.get('subject', 'system', type=str)
        
        # Get resource logs
        logs = AuditTrail.get_resource_history(resource_type, resource_id)
        
        # Convert to dict
        logs_data = [log.to_dict() for log in logs]
        
        # Add user information
        for log in logs_data:
            if log['user_id']:
                user = User.query.get(log['user_id'])
                if user:
                    log['user_name'] = user.full_name
                    log['user_department'] = user.department
        
        return jsonify({
            'resource_type': resource_type,
            'resource_id': resource_id,
            'logs': logs_data
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500