"""
Production-related database models
"""
from datetime import datetime
from utils.timezone_helpers import get_ist_now
from . import db

class ProductionOrder(db.Model):
    """Model for production orders"""
    
    id = db.Column(db.Integer, primary_key=True)
    product_name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), default='pending_materials')
    created_at = db.Column(db.DateTime, default=get_ist_now)
    created_by = db.Column(db.String(100))
    
    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'productName': self.product_name,
            'category': self.category,
            'quantity': self.quantity,
            'status': self.status,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'createdBy': self.created_by
        }

class AssemblyOrder(db.Model):
    """Model for assembly orders"""

    id = db.Column(db.Integer, primary_key=True)
    production_order_id = db.Column(db.Integer, db.ForeignKey('production_order.id'), nullable=False)
    product_name = db.Column(db.String(200), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), default='pending')
    progress = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=get_ist_now)

    # Optional tracking fields
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    paused_at = db.Column(db.DateTime, nullable=True)
    resumed_at = db.Column(db.DateTime, nullable=True)
    quality_check = db.Column(db.Boolean, default=False)
    testing_passed = db.Column(db.Boolean, default=False)

    # Test results relationship
    test_results = db.relationship('AssemblyTestResult', backref='assembly_order', lazy=True, cascade='all, delete-orphan')
    machine_test_results = db.relationship('MachineTestResult', backref='assembly_order', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert model instance to dictionary with fixed IST created timestamp"""
        return {
            'id': self.id,
            'productionOrderId': self.production_order_id,
            'productName': self.product_name,
            'quantity': self.quantity,
            'status': self.status,
            'progress': self.progress if self.progress is not None else 0,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'startedAt': self.started_at.isoformat() if self.started_at else None,
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
            'pausedAt': self.paused_at.isoformat() if self.paused_at else None,
            'resumedAt': self.resumed_at.isoformat() if self.resumed_at else None,
            'qualityCheck': self.quality_check,
            'testingPassed': self.testing_passed
        }


class AssemblyTestResult(db.Model):
    """Model for tracking individual test results for assembly orders"""

    id = db.Column(db.Integer, primary_key=True)
    assembly_order_id = db.Column(db.Integer, db.ForeignKey('assembly_order.id'), nullable=False)
    test_type = db.Column(db.String(10), nullable=False)  # UT, IT, ST, AT
    test_name = db.Column(db.String(100), nullable=False)
    result = db.Column(db.String(10), nullable=False)  # 'pass', 'fail'
    tested_at = db.Column(db.DateTime, default=get_ist_now)
    notes = db.Column(db.Text, nullable=True)

    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'assemblyOrderId': self.assembly_order_id,
            'testType': self.test_type,
            'testName': self.test_name,
            'result': self.result,
            'testedAt': self.tested_at.isoformat(),
            'notes': self.notes
        }


class MachineTestResult(db.Model):
    """Model for tracking individual machine test results within an assembly order"""

    id = db.Column(db.Integer, primary_key=True)
    assembly_order_id = db.Column(db.Integer, db.ForeignKey('assembly_order.id'), nullable=False)
    machine_number = db.Column(db.String(50), nullable=False)  # Machine/Engine number
    engine_number = db.Column(db.String(50), nullable=True)   # Optional engine number
    test_result = db.Column(db.String(10), nullable=False)    # 'pass', 'fail', 'pending'
    tested_at = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=get_ist_now)
    # New fields for rework tracking
    is_in_rework = db.Column(db.Boolean, default=False)
    rework_order_id = db.Column(db.Integer, db.ForeignKey('rework_order.id'), nullable=True)
    original_lot_id = db.Column(db.Integer, nullable=True)  # Track original assembly order for rejoining

    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'assemblyOrderId': self.assembly_order_id,
            'machineNumber': self.machine_number,
            'engineNumber': self.engine_number,
            'testResult': self.test_result,
            'testedAt': self.tested_at.isoformat() if self.tested_at else None,
            'notes': self.notes,
            'createdAt': self.created_at.isoformat(),
            'isInRework': self.is_in_rework,
            'reworkOrderId': self.rework_order_id,
            'originalLotId': self.original_lot_id
        }


class ReworkOrder(db.Model):
    """Model for tracking rework orders for failed machines"""

    id = db.Column(db.Integer, primary_key=True)
    original_assembly_order_id = db.Column(db.Integer, db.ForeignKey('assembly_order.id'), nullable=False)
    product_name = db.Column(db.String(200), nullable=False)
    failed_machine_count = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), default='pending')  # pending, in_progress, completed, returned_to_testing
    created_at = db.Column(db.DateTime, default=get_ist_now)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    
    # Relationships
    failed_machines = db.relationship('MachineTestResult', backref='rework_order', lazy=True)
    original_assembly_order = db.relationship('AssemblyOrder', backref='rework_orders', lazy=True)

    def to_dict(self):
        """Convert model instance to dictionary"""
        return {
            'id': self.id,
            'originalAssemblyOrderId': self.original_assembly_order_id,
            'productName': self.product_name,
            'failedMachineCount': self.failed_machine_count,
            'status': self.status,
            'createdAt': self.created_at.isoformat(),
            'startedAt': self.started_at.isoformat() if self.started_at else None,
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
            'notes': self.notes,
            'failedMachines': [machine.to_dict() for machine in self.failed_machines] if self.failed_machines else []
        }
