# ERP Management System - Technical Setup Guide

**Version:** 1.0  
**Last Updated:** November 2025  
**Document Type:** Technical Setup & Configuration Guide

---

## Technical Setup

### Prerequisites

- **Node.js** (v16+)
- **Python** (v3.8+)
- **MySQL** (v8.0+)
- **npm** or **yarn**

---

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

Create `.env` file in `backend` directory:

```env
# Database
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=production_management

# Flask
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key

# URLs
FRONTEND_BASE_URL=http://localhost:5173
BACKEND_BASE_URL=http://localhost:5000

# Email
MAILERSEND_API_KEY=your_api_key
MAILERSEND_FROM_EMAIL=your_email

# OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

### 3. Initialize Database

```bash
python app.py
```

This will:
- Create all tables
- Run migrations
- Create admin user (admin@example.com / admin123)

### 4. Run Backend

```bash
python app.py
```

Server runs on **http://localhost:5000**

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Create `.env` file in `frontend` directory:

```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=http://localhost:5000
```

### 3. Run Frontend

```bash
npm run dev
```

App runs on **http://localhost:5173**

---

## Production Deployment

### Backend (Render/AWS/Heroku)

1. Set environment variables
2. Update `BACKEND_BASE_URL` to production URL
3. Configure MySQL database
4. Deploy application

### Frontend (Vercel/Netlify)

1. Build application:
   ```bash
   npm run build
   ```
2. Set `VITE_API_URL` to production backend URL
3. Deploy `dist` folder

---

## Product Data Configuration

### Understanding the BOM Structure

The Bill of Materials (BOM) is defined in `frontend/src/data/productData.js`. This file contains all products organized by category with their required materials.

### File Structure

```javascript
const productData = {
  CategoryName: [
    {
      name: "PRODUCT NAME",
      materials: [
        { name: "Material Name", quantity: number },
        { name: "Another Material", quantity: number }
      ]
    }
  ]
};
```

### Adding Products with BOM

#### Step 1: Open the Product Data File

```bash
# Location: frontend/src/data/productData.js
```

#### Step 2: Add Your Product

```javascript
const productData = {
  RCM: [
    // Existing products...
    
    // Add your new product here
    {
      name: "YOUR PRODUCT NAME",
      materials: [
        { name: "Steel Plate 10mm", quantity: 2 },
        { name: "Bolt M12x50", quantity: 8 },
        { name: "Nut M12", quantity: 8 },
        { name: "Washer M12", quantity: 16 },
        { name: "Paint (Liters)", quantity: 0.5 }
      ]
    }
  ],
  
  BCE: [
    // Block/Concrete Equipment products
    {
      name: "CUSTOM MIXER MACHINE",
      materials: [
        { name: "Motor 3HP", quantity: 1 },
        { name: "Gearbox", quantity: 1 },
        { name: "Mixing Drum", quantity: 1 },
        { name: "Frame Assembly", quantity: 1 }
      ]
    }
  ]
};

export default productData;
```

### Product Categories

The system supports two main categories:

1. **RCM** - Road Construction Machinery
   - Compactors
   - Rollers
   - Vibrators
   - Cutting Machines
   - Engines

2. **BCE** - Block/Concrete Equipment
   - Mixers
   - Wheel Barrows
   - Vibrating Tables
   - EBM Machines

### BOM Format Rules

1. **Product Name:**
   - Must be unique within the category
   - Use UPPERCASE for consistency
   - Include all specifications (HP, size, make, etc.)

2. **Materials Array:**
   - Can be empty `[]` if no BOM defined yet
   - Each material must have `name` and `quantity`
   - Quantity can be decimal (e.g., 0.5 for half liter of paint)

3. **Material Names:**
   - Be specific and consistent
   - Include units in the name if needed (e.g., "Paint (Liters)")

### Example: Complete Product Entry

```javascript
{
  name: "ALANKAR MAKE 8.3 HP 110MM GCM WITH COTTON GREAVES ROPE START DI ENGINE",
  materials: [
    { name: "Greaves 8.3 HP Diesel Engine", quantity: 1 },
    { name: "110mm Diamond Blade", quantity: 1 },
    { name: "Cutting Guard Assembly", quantity: 1 },
    { name: "Base Frame Heavy Duty", quantity: 1 },
    { name: "Water Tank 20L", quantity: 1 },
    { name: "Wheels 8 inch", quantity: 2 },
    { name: "Handle Assembly", quantity: 1 },
    { name: "Belt V-Type", quantity: 1 },
    { name: "Pulley Set", quantity: 1 },
    { name: "Bolt & Nut Set", quantity: 1 },
    { name: "Paint Powder Coated", quantity: 0.5 }
  ]
}
```

---

## Accessories Configuration

### Understanding Accessories

Accessories are additional items that are automatically added to invoices for specific products. They are defined in `backend/utils/product_accessories.py`.

### File Location

```
backend/utils/product_accessories.py
```

### Adding Accessories

#### Step 1: Open the Accessories File

```python
# Location: backend/utils/product_accessories.py
```

#### Step 2: Add Product Accessories

```python
PRODUCT_ACCESSORIES = {
    # Format: "EXACT PRODUCT NAME": ["Accessory 1", "Accessory 2", ...]
    
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
    
    # Add your products here
    "YOUR PRODUCT NAME": [
        "Accessory Item 1",
        "Accessory Item 2",
        "Accessory Item 3"
    ],
    
    "ALANKAR MAKE 8.3 HP 110MM GCM": [
        "Diamond Blade 110mm - 1 NOS",
        "Cutting Guard - 1 NOS",
        "Water Pump Assembly - 1 NOS",
        "Tool Kit - 1 SET",
        "User Manual - 1 NOS",
        "Warranty Card - 1 NOS"
    ]
}
```

### Accessories Format Rules

1. **Product Name Key:**
   - Must match EXACTLY with the product name in your system
   - Case-sensitive
   - Include all spaces and special characters

2. **Accessories List:**
   - Each accessory is a string
   - Include quantity in the description (e.g., "- 1 NOS", "- 2 PCS")
   - Be specific about specifications

3. **Matching Logic:**
   - System first tries exact match
   - Then tries partial match (case-insensitive)
   - Returns empty list if no match found

### Example: Complete Accessories Entry

```python
PRODUCT_ACCESSORIES = {
    "ALANKAR MAKE ONE BAG CONCRETE MIXER WITH 3 HP MOTOR": [
        "3 HP SINGLE PHASE CROMPTON ELECTRIC MOTOR - 1 NOS",
        "M.S. HANDI (MIXING DRUM) - 1 NOS",
        "PNEUMATIC TYRE 5.00-19 - 2 NOS",
        "HEAVY DUTY FRAME - 1 NOS",
        "BELT GUARD POWDER COATED - 1 NOS",
        "HANDLE ASSEMBLY - 1 NOS",
        "TOOL KIT - 1 SET",
        "GREASE GUN - 1 NOS",
        "USER MANUAL & WARRANTY CARD - 1 SET"
    ],
    
    "VIBRATING TABLE WITH 2 HP MOTOR": [
        "2 HP THREE PHASE SGL MOTOR - 1 NOS",
        "VIBRATING MOTOR ASSEMBLY - 2 NOS",
        "TABLE TOP M.S. SHEET 6MM - 1 NOS",
        "RUBBER MOUNTING - 4 NOS",
        "CONTROL PANEL - 1 NOS",
        "POWER CABLE 5 MTR - 1 NOS"
    ]
}
```

### Testing Accessories

After adding accessories, test them:

1. Create a sales order with the product
2. Generate an invoice
3. Check if accessories appear in the invoice
4. Verify all accessories are listed correctly


