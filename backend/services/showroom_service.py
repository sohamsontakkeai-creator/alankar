"""
Showroom Service Module
Handles business logic for showroom operations
"""
from datetime import datetime
from utils.timezone_helpers import get_ist_now
from models import db, ShowroomProduct, AssemblyOrder, FinanceTransaction, SalesOrder
from models.production import MachineTestResult
import json


class ShowroomService:
    """Service class for showroom operations"""
    
    @staticmethod
    def get_completed_assembly_products():
        """Get completed assembly orders ready for showroom (including those with reworked machines)"""
        # Get assembly orders that are completed OR have machines returned from rework
        completed_orders = AssemblyOrder.query.filter(
            AssemblyOrder.status.in_(['completed', 'partially_completed'])
        ).all()
        
        # Convert to format expected by showroom
        products = []
        for order in completed_orders:
            # Check if there are any machines that need testing (pending status)
            pending_machines = MachineTestResult.query.filter_by(
                assembly_order_id=order.id,
                test_result='pending'
            ).count()
            
            # Check if already processed to showroom
            existing_showroom = ShowroomProduct.query.filter_by(
                production_order_id=order.production_order_id
            ).first()
            
            # Show the order if:
            # 1. No showroom product exists yet (first time), OR
            # 2. Showroom product exists with 'available' status (can still be managed)
            # Don't show if showroom product is 'sold' (fully completed)
            should_show = (not existing_showroom) or (existing_showroom and existing_showroom.showroom_status == 'available')
            
            if should_show:
                products.append({
                    'id': order.id,
                    'productName': order.product_name,
                    'quantity': order.quantity,
                    'pendingMachines': pending_machines,  # Number of machines waiting for testing
                    'completedAt': order.completed_at.isoformat() if order.completed_at else order.created_at.isoformat(),
                    'qualityRating': 5,  # Default quality rating
                    'productionOrderId': order.production_order_id,
                    'hasReworkedMachines': pending_machines > 0 and existing_showroom is not None
                })
        
        return products
    
    @staticmethod
    def get_displayed_products():
        """Get products currently displayed in showroom with accurate machine counts"""
        # Only show available products - sold products are handled by Sales department
        displayed_products = ShowroomProduct.query.filter_by(
            showroom_status='available'
        ).order_by(ShowroomProduct.created_at.desc()).all()
        
        # Convert to format expected by frontend
        products = []
        for product in displayed_products:
            # Get the original assembly order for additional details
            assembly_order = None
            if product.production_order_id:
                assembly_order = AssemblyOrder.query.filter_by(
                    production_order_id=product.production_order_id
                ).first()
            
            # Get machine status breakdown for this assembly order
            machine_counts = {
                'total': 0,
                'displayed': product.quantity,  # Machines actually on display
                'in_rework': 0,
                'pending_retest': 0
            }
            
            if assembly_order:
                # Get machine test results for this assembly order
                all_machines = MachineTestResult.query.filter_by(
                    assembly_order_id=assembly_order.id
                ).all()
                
                machine_counts['total'] = len(all_machines)
                machine_counts['in_rework'] = sum(1 for m in all_machines if m.is_in_rework)
                machine_counts['pending_retest'] = sum(1 for m in all_machines if m.test_result == 'pending' and not m.is_in_rework)
            
            # Get original quantity from assembly order
            original_quantity = assembly_order.quantity if assembly_order else 1
            
            products.append({
                'id': product.id,
                'productName': product.name,
                'quantity': product.quantity,  # Machines currently on display
                'original_qty': original_quantity,  # Original quantity from assembly
                'machineBreakdown': machine_counts,  # Detailed machine status
                'showroomStatus': product.showroom_status,
                'displayedAt': product.created_at.isoformat(),
                'salePrice': product.sale_price,
                'customerInterest': 8,  # Demo value - you could add this as a field
                'qualityRating': 5,  # Demo value - you could add this as a field
                'productionOrderId': product.production_order_id,
                'assemblyOrderId': assembly_order.id if assembly_order else None
            })
        
        return products
    
    @staticmethod
    def add_product_to_showroom(product_id, test_results=None):
        """Add a completed assembly product to showroom display or send back to assembly if tests fail"""
        from models import AssemblyTestResult, AssemblyOrder

        # Get the assembly order
        assembly_order = AssemblyOrder.query.get(product_id)
        if not assembly_order:
            raise ValueError('Assembly order not found')

        if assembly_order.status != 'completed':
            raise ValueError('Product must be completed first')

        # Process test results if provided
        if test_results:
            # Clear existing test results for this assembly order
            AssemblyTestResult.query.filter_by(assembly_order_id=assembly_order.id).delete()

            any_failed = False
            for test_type, passed in test_results.items():
                test_name = {
                    'UT': 'Unit Testing',
                    'IT': 'Integration Testing',
                    'ST': 'System Testing',
                    'AT': 'Acceptance Testing'
                }.get(test_type, 'Unknown Test')

                result = 'pass' if passed else 'fail'
                if not passed:
                    any_failed = True

                test_result = AssemblyTestResult(
                    assembly_order_id=assembly_order.id,
                    test_type=test_type,
                    test_name=test_name,
                    result=result
                )
                db.session.add(test_result)

            if any_failed:
                # Update assembly order status to rework
                assembly_order.status = 'rework'
                assembly_order.testing_passed = False
                db.session.commit()
                return {'message': 'Product sent back to assembly due to failed tests', 'failedTests': [k for k,v in test_results.items() if not v]}

            # If all passed, mark testing_passed True
            assembly_order.testing_passed = True
            db.session.commit()

        # Check if already in showroom
        existing = ShowroomProduct.query.filter_by(
            production_order_id=assembly_order.production_order_id
        ).first()

        if existing:
            raise ValueError('Product already in showroom')

        # Calculate sale price (cost + markup)
        estimated_cost = 100.0  # You can calculate this based on materials
        sale_price = estimated_cost * 1.5  # 50% markup

        # Create showroom product
        showroom_product = ShowroomProduct(
            name=assembly_order.product_name,
            category='Manufactured',  # Or get from production order
            cost_price=estimated_cost,
            sale_price=sale_price,
            showroom_status='available',
            production_order_id=assembly_order.production_order_id
        )

        db.session.add(showroom_product)
        db.session.commit()

        # Return in expected format
        return {
            'id': showroom_product.id,
            'productName': showroom_product.name,
            'quantity': assembly_order.quantity,  # Use actual quantity from assembly
            'showroomStatus': 'displayed',
            'displayedAt': showroom_product.created_at.isoformat(),
            'salePrice': showroom_product.sale_price,
            'customerInterest': 8,
            'qualityRating': 5,
            'productionOrderId': showroom_product.production_order_id
        }

    # Removed mark_product_sold method - selling is handled by Sales department

    @staticmethod
    def send_back_to_assembly(product_id, test_results=None):
        """Send a product back to assembly for rework due to failed tests"""
        from models import AssemblyTestResult, AssemblyOrder

        # Get the assembly order
        assembly_order = AssemblyOrder.query.get(product_id)
        if not assembly_order:
            raise ValueError('Assembly order not found')

        if assembly_order.status != 'completed':
            raise ValueError('Product must be completed first')

        # Process test results if provided
        if test_results:
            # Clear existing test results for this assembly order
            AssemblyTestResult.query.filter_by(assembly_order_id=assembly_order.id).delete()

            for test_type, passed in test_results.items():
                test_name = {
                    'UT': 'Unit Testing',
                    'IT': 'Integration Testing',
                    'ST': 'System Testing',
                    'AT': 'Acceptance Testing'
                }.get(test_type, 'Unknown Test')

                result = 'pass' if passed else 'fail'

                test_result = AssemblyTestResult(
                    assembly_order_id=assembly_order.id,
                    test_type=test_type,
                    test_name=test_name,
                    result=result
                )
                db.session.add(test_result)

            # Update assembly order status to rework
            assembly_order.status = 'rework'
            assembly_order.testing_passed = False
            db.session.commit()

        else:
            raise ValueError('Test results required to send back to assembly')

        return {'message': 'Product sent back to assembly for rework'}

    @staticmethod
    def get_machines_for_testing(assembly_order_id):
        """Get all machines for an assembly order that need testing"""
        try:
            # Get the assembly order
            assembly_order = AssemblyOrder.query.get(assembly_order_id)
            if not assembly_order:
                raise ValueError('Assembly order not found')

            # Get existing machine test results
            existing_results = MachineTestResult.query.filter_by(
                assembly_order_id=assembly_order_id
            ).all()

            # If no results exist, create initial entries for each machine in quantity
            if not existing_results:
                machines = []
                for i in range(1, assembly_order.quantity + 1):
                    machine = MachineTestResult(
                        assembly_order_id=assembly_order_id,
                        machine_number=f"M{i:03d}",  # Format as M001, M002, etc.
                        test_result='pending'
                    )
                    db.session.add(machine)
                    machines.append(machine)
                db.session.commit()
            else:
                machines = existing_results

            return [machine.to_dict() for machine in machines]

        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error getting machines for testing: {str(e)}")

    @staticmethod
    def update_machine_test_result(machine_id, test_result, engine_number=None, notes=None):
        """Update individual machine test result"""
        try:
            machine = MachineTestResult.query.get(machine_id)
            if not machine:
                raise ValueError('Machine not found')

            machine.test_result = test_result
            machine.tested_at = get_ist_now()

            if engine_number:
                machine.engine_number = engine_number

            if notes:
                machine.notes = notes

            db.session.commit()
            return machine.to_dict()

        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error updating machine test result: {str(e)}")

    @staticmethod
    def get_assembly_order_test_summary(assembly_order_id):
        """Get summary of testing for an assembly order"""
        try:
            machines = MachineTestResult.query.filter_by(
                assembly_order_id=assembly_order_id
            ).all()

            total_machines = len(machines)
            passed = sum(1 for m in machines if m.test_result == 'pass')
            # Only count failed machines that haven't been sent to rework yet
            failed = sum(1 for m in machines if m.test_result == 'fail' and not m.is_in_rework)
            failed_in_rework = sum(1 for m in machines if m.test_result == 'fail' and m.is_in_rework)
            pending = sum(1 for m in machines if m.test_result == 'pending')

            return {
                'totalMachines': total_machines,
                'passed': passed,
                'failed': failed,
                'failedInRework': failed_in_rework,
                'pending': pending,
                'allTested': pending == 0,
                'canProceed': failed == 0 and pending == 0
            }

        except Exception as e:
            raise Exception(f"Error getting test summary: {str(e)}")

    @staticmethod
    def process_completed_assembly_with_machine_testing(assembly_order_id, user_name='Showroom Manager'):
        """Process completed assembly order based on individual machine test results"""
        try:
            from models import ReworkOrder
            from services.audit_service import AuditService
            from models import AuditAction, AuditModule
            
            # Get test summary
            summary = ShowroomService.get_assembly_order_test_summary(assembly_order_id)

            assembly_order = AssemblyOrder.query.get(assembly_order_id)
            if not assembly_order:
                raise ValueError('Assembly order not found')

            # Get all machines for this assembly order
            all_machines = MachineTestResult.query.filter_by(
                assembly_order_id=assembly_order_id
            ).all()

            passed_machines = [m for m in all_machines if m.test_result == 'pass']
            failed_machines = [m for m in all_machines if m.test_result == 'fail']
            pending_machines = [m for m in all_machines if m.test_result == 'pending']

            if pending_machines:
                raise ValueError('Cannot process assembly order with pending machine tests')

            # Process passed machines to showroom immediately
            if passed_machines:
                # Create showroom product for passed machines only
                print(f"DEBUG: Creating showroom product for {len(passed_machines)} passed machines")
                showroom_product = ShowroomService._create_showroom_product_for_machines(assembly_order, passed_machines)
                print(f"DEBUG: Showroom product created/updated: ID={showroom_product.id}, status={showroom_product.showroom_status}, qty={showroom_product.quantity}")
                
                # Log showroom product creation
                try:
                    price = float(showroom_product.sale_price) if showroom_product.sale_price else 0
                except (ValueError, TypeError):
                    price = 0
                
                try:
                    AuditService.log_activity(
                        action=AuditAction.CREATE,
                        module=AuditModule.SHOWROOM,
                        resource_type='ShowroomProduct',
                        resource_id=str(showroom_product.id),
                        resource_name=f'Product: {showroom_product.name}',
                        description=f'{user_name} added {len(passed_machines)} machines of {showroom_product.name} to showroom display - Price: ₹{price:,.2f}',
                        username=user_name
                    )
                except Exception as audit_error:
                    print(f"Warning: Failed to log showroom product creation: {audit_error}")

            # Create rework order for failed machines
            if failed_machines:
                rework_order = ReworkOrder(
                    original_assembly_order_id=assembly_order_id,
                    product_name=assembly_order.product_name,
                    failed_machine_count=len(failed_machines),
                    status='pending',
                    notes=f'Rework required for {len(failed_machines)} machines from assembly order #{assembly_order_id}'
                )
                db.session.add(rework_order)
                db.session.flush()  # Get the rework order ID

                # Update failed machines to reference the rework order
                for machine in failed_machines:
                    machine.is_in_rework = True
                    machine.rework_order_id = rework_order.id
                    machine.original_lot_id = assembly_order_id

            # Update assembly order status based on results
            if failed_machines and not passed_machines:
                # All failed - entire order goes to rework
                assembly_order.status = 'rework'
                assembly_order.testing_passed = False
            elif passed_machines and not failed_machines:
                # All passed - order completed and sent to showroom
                assembly_order.status = 'sent_to_showroom'
                assembly_order.testing_passed = True
            else:
                # Mixed results - partial completion
                assembly_order.status = 'partially_completed'
                assembly_order.testing_passed = False

            db.session.commit()

            result = {
                'passedMachines': len(passed_machines),
                'failedMachines': len(failed_machines),
                'summary': summary
            }

            if passed_machines and failed_machines:
                result['message'] = f'{len(passed_machines)} machines sent to showroom, {len(failed_machines)} machines sent for rework'
            elif passed_machines:
                result['message'] = f'All {len(passed_machines)} machines passed and sent to showroom'
            elif failed_machines:
                result['message'] = f'All {len(failed_machines)} machines failed and sent for rework'

            return result

        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error processing completed assembly: {str(e)}")

    @staticmethod
    def _create_showroom_product_for_machines(assembly_order, passed_machines):
        """Create or update showroom product for passed machines"""
        try:
            # Check if showroom product already exists for this production order
            existing_product = ShowroomProduct.query.filter_by(
                production_order_id=assembly_order.production_order_id
            ).first()

            # Calculate sale price (cost + markup)
            estimated_cost = 100.0 * len(passed_machines)  # Cost per machine
            sale_price = estimated_cost * 1.5  # 50% markup

            if existing_product:
                # Update existing product - add newly passed machines to quantity
                existing_product.quantity = len(passed_machines)
                existing_product.cost_price = estimated_cost
                existing_product.sale_price = sale_price
                existing_product.showroom_status = 'available'
                print(f"Updated existing showroom product {existing_product.id} with {len(passed_machines)} machines")
                return existing_product
            else:
                # Create new showroom product for passed machines
                showroom_product = ShowroomProduct(
                    name=assembly_order.product_name,
                    category='Manufactured',
                    cost_price=estimated_cost,
                    sale_price=sale_price,
                    showroom_status='available',
                    production_order_id=assembly_order.production_order_id,
                    quantity=len(passed_machines)  # Only passed machines
                )
                db.session.add(showroom_product)
                print(f"Created new showroom product for {assembly_order.product_name} with {len(passed_machines)} machines")
                return showroom_product

        except Exception as e:
            print(f"ERROR in _create_showroom_product_for_machines: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Error creating showroom product: {str(e)}")
