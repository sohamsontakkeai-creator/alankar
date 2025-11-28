"""
Showroom Routes Module
API endpoints for showroom operations
"""
from flask import Blueprint, request, jsonify
from services.showroom_service import ShowroomService
from services.audit_service import AuditService
from models import AuditAction, AuditModule, AssemblyOrder

showroom_bp = Blueprint('showroom', __name__)


@showroom_bp.route('/assembly/completed', methods=['GET'])
def get_completed_assembly_products():
    """Get completed assembly orders ready for showroom"""
    try:
        products = ShowroomService.get_completed_assembly_products()
        return jsonify(products), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@showroom_bp.route('/showroom/displayed', methods=['GET'])
def get_displayed_showroom_products():
    """Get products currently displayed in showroom"""
    try:
        products = ShowroomService.get_displayed_products()
        return jsonify(products), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@showroom_bp.route('/showroom/add', methods=['POST'])
def add_product_to_showroom():
    """Add a completed assembly product to showroom display or send back to assembly if tests fail"""
    try:
        data = request.get_json()
        product_id = data.get('product_id')  # This is the assembly order ID
        test_results = data.get('test_results')  # Optional test results

        if not product_id:
            return jsonify({'error': 'Product ID required'}), 400

        result = ShowroomService.add_product_to_showroom(product_id, test_results)
        
        # Log showroom addition
        user_name = data.get('addedBy', 'Showroom Manager')
        product_name = result.get('product_name', 'Product')
        
        try:
            price = float(result.get('sale_price', 0))
        except (ValueError, TypeError):
            price = 0
        
        AuditService.log_activity(
            action=AuditAction.CREATE,
            module=AuditModule.SHOWROOM,
            resource_type='ShowroomProduct',
            resource_id=str(result.get('id')),
            resource_name=f'Product: {product_name}',
            description=f'{user_name} added {product_name} to showroom display - Price: ₹{price:,.2f}',
            username=user_name
        )
        
        return jsonify(result), 201

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@showroom_bp.route('/showroom/send-back', methods=['POST'])
def send_back_to_assembly():
    """Send a product back to assembly for rework due to failed tests"""
    try:
        data = request.get_json()
        product_id = data.get('product_id')
        test_results = data.get('test_results')

        if not product_id:
            return jsonify({'error': 'Product ID required'}), 400

        result = ShowroomService.send_back_to_assembly(product_id, test_results)
        return jsonify(result), 200

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Removed mark_product_sold endpoint - selling is handled by Sales department


@showroom_bp.route('/showroom/testing/machines/<int:assembly_order_id>', methods=['GET'])
def get_machines_for_testing(assembly_order_id):
    """Get all machines for testing in an assembly order"""
    try:
        machines = ShowroomService.get_machines_for_testing(assembly_order_id)
        return jsonify(machines), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@showroom_bp.route('/showroom/testing/machine/<int:machine_id>', methods=['PUT'])
def update_machine_test_result(machine_id):
    """Update test result for a specific machine"""
    try:
        data = request.get_json()
        test_result = data.get('testResult')
        engine_number = data.get('engineNumber')
        notes = data.get('notes')

        if not test_result or test_result not in ['pass', 'fail', 'pending']:
            return jsonify({'error': 'Valid test result (pass/fail/pending) required'}), 400

        result = ShowroomService.update_machine_test_result(
            machine_id, test_result, engine_number, notes
        )

        # Log the machine testing
        user_name = data.get('testedBy', 'Showroom Manager')
        try:
            AuditService.log_activity(
                action=AuditAction.UPDATE,
                module=AuditModule.SHOWROOM,
                resource_type='MachineTestResult',
                resource_id=str(machine_id),
                resource_name=f'Machine: {result.get("machineNumber", "Unknown")}',
                description=f'{user_name} updated machine test result to {test_result}',
                username=user_name
            )
        except:
            pass  # Don't fail the request if audit logging fails

        return jsonify(result), 200

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@showroom_bp.route('/showroom/testing/summary/<int:assembly_order_id>', methods=['GET'])
def get_assembly_test_summary(assembly_order_id):
    """Get testing summary for an assembly order"""
    try:
        summary = ShowroomService.get_assembly_order_test_summary(assembly_order_id)
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@showroom_bp.route('/showroom/testing/process/<int:assembly_order_id>', methods=['POST'])
def process_completed_assembly(assembly_order_id):
    """Process completed assembly order based on machine test results"""
    try:
        data = request.get_json() or {}
        user_name = data.get('processedBy', 'Showroom Manager')
        result = ShowroomService.process_completed_assembly_with_machine_testing(assembly_order_id, user_name)

        # Log the processing
        try:
            assembly_order = AssemblyOrder.query.get(assembly_order_id)
            product_name = assembly_order.product_name if assembly_order else 'Unknown Product'

            AuditService.log_activity(
                action=AuditAction.UPDATE,
                module=AuditModule.SHOWROOM,
                resource_type='AssemblyOrder',
                resource_id=str(assembly_order_id),
                resource_name=f'Assembly Order: {product_name}',
                description=f'{user_name} processed assembly order after testing - {result.get("message", "Completed")}',
                username=user_name
            )
        except:
            pass  # Don't fail the request if audit logging fails

        return jsonify(result), 200

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
