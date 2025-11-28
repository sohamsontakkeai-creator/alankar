"""
Assembly order business logic service
"""
from datetime import datetime
from utils.timezone_helpers import get_ist_now
from models import db, AssemblyOrder, PurchaseOrder
from utils.validators import validate_positive_integer, validate_status

class AssemblyService:
    """Service class for assembly order operations"""
    
    VALID_STATUSES = ['pending', 'in_progress', 'paused', 'completed', 'sent_to_showroom']
    
    @staticmethod
    def get_ready_assembly_orders():
        """Get assembly orders ready for processing (materials allocated)"""
        try:
            ready_statuses = ['store_allocated', 'verified_in_store']
            orders = (
                db.session.query(AssemblyOrder)
                .join(PurchaseOrder, AssemblyOrder.production_order_id == PurchaseOrder.production_order_id)
                .filter(PurchaseOrder.status.in_(ready_statuses))
                .order_by(AssemblyOrder.created_at.desc())
                .all()
            )
            return [order.to_dict() for order in orders]
        except Exception as e:
            raise Exception(f"Error fetching assembly orders: {str(e)}")
    
    @staticmethod
    def get_all_assembly_orders():
        """Get all assembly orders"""
        try:
            orders = AssemblyOrder.query.order_by(AssemblyOrder.created_at.desc()).all()
            return [order.to_dict() for order in orders]
        except Exception as e:
            raise Exception(f"Error fetching all assembly orders: {str(e)}")
    
    @staticmethod
    def update_assembly_order(order_id, data):
        """Update assembly order with comprehensive field support"""
        try:
            order = AssemblyOrder.query.get_or_404(order_id)
            
            # Update status
            if 'status' in data:
                status = validate_status(data['status'], AssemblyService.VALID_STATUSES)
                order.status = status
            
            # Update progress - FIXED LOGIC
            if 'progress' in data:
                try:
                    progress = int(data['progress'])
                except (ValueError, TypeError):
                    raise Exception("Progress must be a valid integer")
                
                # Validate progress is in range 0-100 (0 is valid for assembly)
                if not (0 <= progress <= 100):
                    raise Exception("Progress must be between 0 and 100")
                
                order.progress = progress
            
            # Update timestamp fields
            if 'startedAt' in data:
                try:
                    order.started_at = datetime.fromisoformat(data['startedAt'].replace('Z', '+00:00'))
                except:
                    order.started_at = get_ist_now()
            
            if 'completedAt' in data:
                try:
                    order.completed_at = datetime.fromisoformat(data['completedAt'].replace('Z', '+00:00'))
                except:
                    order.completed_at = get_ist_now()
            
            if 'pausedAt' in data:
                try:
                    order.paused_at = datetime.fromisoformat(data['pausedAt'].replace('Z', '+00:00'))
                except:
                    order.paused_at = get_ist_now()
            
            if 'resumedAt' in data:
                try:
                    order.resumed_at = datetime.fromisoformat(data['resumedAt'].replace('Z', '+00:00'))
                except:
                    order.resumed_at = get_ist_now()
            
            # Update quality fields
            if 'qualityCheck' in data:
                order.quality_check = bool(data['qualityCheck'])
            
            if 'testingPassed' in data:
                order.testing_passed = bool(data['testingPassed'])
            
            db.session.commit()
            return order.to_dict()
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error updating assembly order: {str(e)}")
    
    @staticmethod
    def update_assembly_status(order_id, status):
        """Update assembly order status only"""
        try:
            order = AssemblyOrder.query.get_or_404(order_id)
            
            validated_status = validate_status(status, AssemblyService.VALID_STATUSES)
            order.status = validated_status
            
            # Set appropriate timestamps based on status
            if validated_status == 'in_progress' and not order.started_at:
                order.started_at = get_ist_now()
            elif validated_status == 'completed' and not order.completed_at:
                order.completed_at = get_ist_now()
                order.progress = 100  # Ensure progress is 100% when completed
            elif validated_status == 'paused':
                order.paused_at = get_ist_now()
            
            db.session.commit()
            return order.to_dict()
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error updating assembly status: {str(e)}")
    
    @staticmethod
    def update_assembly_progress(order_id, progress):
        """Update assembly progress only"""
        try:
            order = AssemblyOrder.query.get_or_404(order_id)
            
            try:
                progress = int(progress)
            except (ValueError, TypeError):
                raise Exception("Progress must be a valid integer")
            
            # Validate progress is in range 0-100 (0 is valid for assembly)
            if not (0 <= progress <= 100):
                raise Exception("Progress must be between 0 and 100")
            
            order.progress = progress
            
            # Auto-update status based on progress
            if order.progress == 0 and order.status != 'pending':
                order.status = 'pending'
            elif 0 < order.progress < 100 and order.status == 'pending':
                order.status = 'in_progress'
                if not order.started_at:
                    order.started_at = get_ist_now()
            elif order.progress == 100 and order.status != 'completed':
                order.status = 'completed'
                order.completed_at = get_ist_now()
            
            db.session.commit()
            return order.to_dict()
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error updating assembly progress: {str(e)}")
    
    @staticmethod
    def get_completed_products():
        """Get completed assembly products ready for showroom testing"""
        try:
            from models import ShowroomProduct
            
            # Get orders that are:
            # - 'completed': Just finished assembly, ready for testing
            # - 'partially_completed': Some machines passed/failed, still has pending tests
            # Exclude:
            # - 'sent_to_showroom': Already processed and in display
            # - 'rework': All failed, back to assembly
            completed_orders = AssemblyOrder.query.filter(
                AssemblyOrder.status.in_(['completed', 'partially_completed'])
            ).all()
            
            products = []
            for order in completed_orders:
                # Check if there's a showroom product for this order
                existing_showroom = ShowroomProduct.query.filter_by(
                    production_order_id=order.production_order_id
                ).first()
                
                # Show ALL completed/partially_completed orders
                # - If no showroom product exists: show so showroom can create it and start testing
                # - If showroom product exists: show for ongoing testing
                products.append({
                    'id': order.id,
                    'productName': order.product_name,
                    'quantity': order.quantity,
                    'completedAt': order.completed_at.isoformat() if order.completed_at else order.created_at.isoformat(),
                    'qualityRating': 5,  # Default quality rating
                    'productionOrderId': order.production_order_id,
                    'showroomQuantity': existing_showroom.quantity if existing_showroom else 0,
                    'showroomStatus': existing_showroom.showroom_status if existing_showroom else 'pending'
                })
            
            return products
        except Exception as e:
            print(f"ERROR in get_completed_products: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Error fetching completed products: {str(e)}")
    
    @staticmethod
    def get_assembly_order_by_id(order_id):
        """Get a specific assembly order by ID"""
        try:
            order = AssemblyOrder.query.get_or_404(order_id)
            return order.to_dict()
        except Exception as e:
            raise Exception(f"Error fetching assembly order: {str(e)}")

    @staticmethod
    def get_rework_orders():
        """Get all rework orders for the assembly department"""
        try:
            from models import ReworkOrder
            
            rework_orders = ReworkOrder.query.filter(
                ReworkOrder.status.in_(['pending', 'in_progress'])
            ).order_by(ReworkOrder.created_at.desc()).all()
            
            return [order.to_dict() for order in rework_orders]
        except Exception as e:
            raise Exception(f"Error fetching rework orders: {str(e)}")

    @staticmethod
    def update_rework_order(rework_order_id, data):
        """Update rework order status"""
        try:
            from models import ReworkOrder
            
            rework_order = ReworkOrder.query.get_or_404(rework_order_id)
            
            if 'status' in data:
                valid_statuses = ['pending', 'in_progress', 'completed', 'returned_to_testing']
                status = validate_status(data['status'], valid_statuses)
                rework_order.status = status
                
                if status == 'in_progress' and not rework_order.started_at:
                    rework_order.started_at = get_ist_now()
                elif status == 'completed':
                    rework_order.completed_at = get_ist_now()
            
            if 'notes' in data:
                rework_order.notes = data['notes']
            
            db.session.commit()
            return rework_order.to_dict()
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error updating rework order: {str(e)}")

    @staticmethod
    def complete_rework_order(rework_order_id, data):
        """Complete rework order and send machines back to testing"""
        try:
            from models import ReworkOrder, MachineTestResult
            
            rework_order = ReworkOrder.query.get_or_404(rework_order_id)
            
            if rework_order.status == 'completed':
                raise ValueError('Rework order already completed')
            
            # Update rework order status
            rework_order.status = 'returned_to_testing'
            rework_order.completed_at = get_ist_now()
            if 'notes' in data:
                rework_order.notes = data['notes']
            
            # Reset failed machines to pending status for re-testing
            failed_machines = MachineTestResult.query.filter_by(
                rework_order_id=rework_order_id
            ).all()
            
            for machine in failed_machines:
                machine.test_result = 'pending'
                machine.tested_at = None
                machine.is_in_rework = False
                machine.rework_order_id = None  # Clear rework order reference
                machine.notes = f"Reworked - {machine.notes}" if machine.notes else "Reworked"
            
            # Update the assembly order status to allow it to appear in showroom again
            if failed_machines:
                original_assembly_order = AssemblyOrder.query.get(rework_order.original_assembly_order_id)
                if original_assembly_order:
                    # Check if there are any machines still in rework for this assembly order
                    remaining_in_rework = MachineTestResult.query.filter_by(
                        assembly_order_id=original_assembly_order.id,
                        is_in_rework=True
                    ).count()
                    
                    # If no machines are in rework anymore, update status to partially_completed
                    if remaining_in_rework == 0:
                        original_assembly_order.status = 'partially_completed'
            
            db.session.commit()
            
            return {
                'message': f'Rework completed for {len(failed_machines)} machines. Machines returned to testing.',
                'reworkOrderId': rework_order_id,
                'machinesReturned': len(failed_machines),
                'originalLotId': rework_order.original_assembly_order_id
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Error completing rework order: {str(e)}")