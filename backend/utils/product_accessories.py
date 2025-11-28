"""
Product Accessories Data
Maps product names to their standard accessories for invoice generation
"""

PRODUCT_ACCESSORIES = {
    # Example: Add your products with their accessories here
    "DOUBLE WHEEL BARROW WITH CHAIN": [
        "2 HP SINGLE PHASE CROMPECH MAKE ELECTRIC MOTOR",
        "M S HEAVY DUTY HANDLE & FABRICATED YOKE - 1 NOS",
        "PNEUMATIC TYRE 4.00-8 - 4 NOS",
        "POWDER COATED BELT GUARD & MOTOR GUARD - 1 NOS",
        "POWDER COATED HANDLE - 1 NOS"
    ],
    "BULL FLOATER": [
        "2 HP SINGLE PHASE CROMPECH MAKE ELECTRIC MOTOR",
        "M S HEAVY DUTY HANDLE & FABRICATED YOKE - 1 NOS"
    ],
    # Add more products and their accessories as needed
}


def get_accessories_for_product(product_name):
    """
    Get accessories for a given product name
    
    Args:
        product_name: Name of the product
        
    Returns:
        List of accessory strings, or empty list if no accessories defined
    """
    if not product_name:
        return []
    
    # Try exact match first
    if product_name in PRODUCT_ACCESSORIES:
        return PRODUCT_ACCESSORIES[product_name]
    
    # Try partial match (case-insensitive)
    product_name_lower = product_name.lower()
    for key, accessories in PRODUCT_ACCESSORIES.items():
        if key.lower() in product_name_lower or product_name_lower in key.lower():
            return accessories
    
    return []
