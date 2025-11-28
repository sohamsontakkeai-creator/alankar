"""
Purchase-related database models
"""
import json
from datetime import datetime
from utils.timezone_helpers import get_ist_now
from . import db

class PurchaseOrder(db.Model):
    """Model for purchase orders"""
    
    id = db.Column(db.Integer, primary_key=True)
    production_order_id = db.Column(db.Integer, db.ForeignKey('production_order.id'), nullable=False)
    product_name = db.Column(db.String(200), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), default='pending_request')
    materials = db.Column(db.Text)  # JSON string of materials (purchased quantities)
    original_requirements = db.Column(db.Text)  # JSON string of original required materials (locked)
    extra_materials = db.Column(db.Text)  # JSON string of extra materials added by Purchase
    payment_terms = db.Column(db.String(50), default='full_payment')  # Payment terms for finance
    created_at = db.Column(db.DateTime, default=get_ist_now)
    
    def to_dict(self):
        """Convert model instance to dictionary"""
        # Return created_at as ISO format (already in IST from database)
        created_fixed = self.created_at.isoformat() if self.created_at else None

        # Handle missing original_requirements column gracefully
        try:
            original_reqs = json.loads(self.original_requirements) if self.original_requirements else []
        except (AttributeError, json.JSONDecodeError, TypeError):
            original_reqs = []
        
        # Handle extra_materials
        try:
            extra_mats = json.loads(self.extra_materials) if hasattr(self, 'extra_materials') and self.extra_materials else []
        except (AttributeError, json.JSONDecodeError, TypeError):
            extra_mats = []

        return {
            'id': self.id,
            'productionOrderId': self.production_order_id,
            'productName': self.product_name,
            'quantity': self.quantity,
            'status': self.status,
            'materials': json.loads(self.materials) if self.materials else [],
            'originalRequirements': original_reqs,
            'extraMaterials': extra_mats,
            'paymentTerms': self.payment_terms if hasattr(self, 'payment_terms') else 'full_payment',
            'createdAt': created_fixed
        }
    
    def get_materials_list(self):
        """Get materials as a list of dictionaries"""
        if not self.materials:
            return []
        try:
            materials = json.loads(self.materials) if isinstance(self.materials, str) else self.materials
            # Ensure each material has a unit_cost field (default to 0 if missing)
            for material in materials:
                if isinstance(material, dict) and 'unit_cost' not in material:
                    material['unit_cost'] = 0
            return materials
        except (json.JSONDecodeError, TypeError):
            return []
    
    def get_original_requirements(self):
        """Get original requirements as a list of dictionaries"""
        try:
            if not hasattr(self, 'original_requirements') or not self.original_requirements:
                return []
            return json.loads(self.original_requirements) if isinstance(self.original_requirements, str) else self.original_requirements
        except (AttributeError, json.JSONDecodeError, TypeError):
            return []
    
    def set_materials_list(self, materials_list):
        """Set materials from a list of dictionaries"""
        self.materials = json.dumps(materials_list) if materials_list else None
    
    def set_original_requirements(self, requirements_list):
        """Set original requirements from a list of dictionaries"""
        try:
            if hasattr(self, 'original_requirements'):
                self.original_requirements = json.dumps(requirements_list) if requirements_list else None
        except AttributeError:
            # Column doesn't exist yet, skip silently
            pass
    
    def get_extra_materials(self):
        """Get extra materials as a list of dictionaries"""
        try:
            if not hasattr(self, 'extra_materials') or not self.extra_materials:
                return []
            return json.loads(self.extra_materials) if isinstance(self.extra_materials, str) else self.extra_materials
        except (AttributeError, json.JSONDecodeError, TypeError):
            return []
    
    def set_extra_materials(self, materials_list):
        """Set extra materials from a list of dictionaries"""
        try:
            if hasattr(self, 'extra_materials'):
                self.extra_materials = json.dumps(materials_list) if materials_list else None
        except AttributeError:
            # Column doesn't exist yet, skip silently
            pass