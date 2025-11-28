# Production Management System - Complete Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [User Roles & Departments](#user-roles--departments)
4. [Module Documentation](#module-documentation)
5. [Workflows](#workflows)
6. [Technical Setup](#technical-setup)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)

---

## System Overview

### Purpose
The Production Management System is a comprehensive Enterprise Resource Planning (ERP) solution designed to manage end-to-end business operations including production, inventory, sales, dispatch, HR, and finance.

### Key Features
- **Multi-Department Management**: 15+ specialized departments
- **Real-time Tracking**: Order tracking, inventory management, and status updates
- **Role-Based Access Control**: Secure access based on user roles
- **Audit Trail**: Complete activity logging for compliance
- **WebSocket Notifications**: Real-time updates across departments
- **File Upload Management**: Document and photo management
- **Automated Workflows**: Streamlined approval processes

### Technology Stack
- **Frontend**: React.js, Vite, TailwindCSS, Shadcn UI
- **Backend**: Python Flask, SQLAlchemy
- **Database**: MySQL
- **Authentication**: JWT, Google OAuth
- **Real-time**: WebSocket (Socket.IO)
- **Email**: MailerSend API

---

## Architecture

### System Architecture
```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │Dashboard │  │Components│  │  Hooks   │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
                         │
                    HTTP/WebSocket
                         │
┌─────────────────────────────────────────────────────────┐
│                  Backend (Flask API)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Routes  │  │ Services │  │  Models  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
                         │
                    SQLAlchemy ORM
                         │
┌─────────────────────────────────────────────────────────┐
│                   Database (MySQL)                       │
│  Users | Orders | Inventory | Finance | HR | Audit      │
└─────────────────────────────────────────────────────────┘
```

### Directory Structure
```
project/
├── backend/
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   ├── models/          # Database models
│   ├── utils/           # Helper functions
│   ├── uploads/         # File storage
│   ├── app.py           # Application entry
│   └── config.py        # Configuration
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom hooks
│   │   └── App.jsx      # Main app
│   └── index.html
└── SYSTEM_DOCUMENTATION.md
```

---

## User Roles & Departments

### 1. Admin
**Access Level**: Full system access
**Capabilities**:
- User management (create, update, delete users)
- System configuration
- Access all department dashboards
- View audit trails
- System health monitoring

### 2. Management
**Access Level**: Read-only access to all departments
**Capabilities**:
- View all department activities
- Access management dashboard with KPIs
- View alerts and notifications
- Set sales targets
- Monitor performance metrics

### 3. Production Department
**Responsibilities**:
- Create and manage production orders
- Track production progress
- Manage rework orders
- Quality control

**Key Features**:
- Production order creation
- Status tracking (pending, in_progress, completed)
- Material requirement planning
- Production scheduling

### 4. Purchase Department
**Responsibilities**:
- Create purchase orders
- Vendor management
- Track purchase order status
- Manage procurement

**Key Features**:
- Purchase order creation
- Vendor selection
- Order tracking
- Approval workflow integration

### 5. Store/Inventory Department
**Responsibilities**:
- Inventory management
- Stock tracking
- Material receiving
- Stock allocation

**Key Features**:
- Real-time inventory tracking
- Low stock alerts
- Material receiving from purchases
- Stock allocation to production

### 6. Assembly Department
**Responsibilities**:
- Product assembly
- Quality testing
- Assembly order management
- Test result recording

**Key Features**:
- Assembly order tracking
- Machine testing
- Quality assurance
- Rework management

### 7. Showroom Department
**Responsibilities**:
- Display product management
- Customer interaction
- Product demonstrations
- Showroom inventory

**Key Features**:
- Product catalog management
- Customer inquiries
- Product status tracking
- Sales coordination

### 8. Sales Department
**Responsibilities**:
- Customer management
- Sales order creation
- Quotation management
- Sales tracking

**Key Features**:
- Customer database
- Sales order management
- Performance tracking
- Target monitoring
- Commission calculation

### 9. Dispatch Department
**Responsibilities**:
- Order fulfillment
- Dispatch request management
- Delivery coordination
- Gate pass generation

**Key Features**:
- Dispatch request processing
- Delivery type selection (self-pickup/transport)
- Gate pass generation
- Loading coordination

### 10. Watchman/Security Department
**Responsibilities**:
- Gate security
- Customer verification
- Vehicle entry/exit management
- Guest management

**Key Features**:
- Pending pickup verification
- Customer identity verification
- Photo documentation (send-in/after-loading)
- Guest list management
- Company vehicle check-in

### 11. Transport Department
**Responsibilities**:
- Vehicle management
- Transport job assignment
- Driver management
- Delivery tracking

**Key Features**:
- Vehicle fleet management
- Transport job creation
- Part-load management
- Driver assignment
- Delivery status tracking

### 12. Finance Department
**Responsibilities**:
- Financial transactions
- Payment tracking
- Invoice management
- Financial reporting

**Key Features**:
- Transaction recording
- Payment status tracking
- Financial reports
- GST verification

### 13. HR Department
**Responsibilities**:
- Employee management
- Attendance tracking
- Leave management
- Payroll processing
- Recruitment

**Key Features**:
- Employee database
- Attendance management
- Leave approval workflow
- Payroll generation
- Job posting and recruitment
- Interview scheduling

### 14. Reception Department
**Responsibilities**:
- Visitor management
- Guest registration
- Call handling
- Front desk operations

**Key Features**:
- Guest list viewing
- Visitor check-in/check-out
- Guest information management

### 15. Audit Department
**Access Level**: View-only access to audit trails
**Capabilities**:
- View all system activities
- Filter audit logs by module, action, user
- Export audit reports
- Compliance monitoring

---

## Module Documentation

### Authentication Module

#### Login Process
1. User enters email and password
2. System validates credentials
3. JWT token generated on success
4. User redirected to department dashboard

#### Google OAuth
1. User clicks "Sign in with Google"
2. Redirected to Google consent screen
3. On approval, callback received
4. User account created/linked
5. JWT token issued

#### Password Reset
1. User requests password reset
2. Reset link sent to email
3. User clicks link and enters new password
4. Password updated in database

### Production Module

#### Production Order Workflow
```
Create Order → Assign Materials → Start Production → 
Quality Check → Complete/Rework → Update Inventory
```

**Order States**:
- `pending`: Order created, awaiting materials
- `in_progress`: Production started
- `completed`: Production finished
- `rework`: Quality issues, needs rework

### Sales Module

#### Sales Order Workflow
```
Customer Inquiry → Quotation → Order Creation → 
Payment → Production → Dispatch → Delivery
```

**Key Operations**:
- Customer management (CRUD)
- Sales order creation
- Order tracking
- Performance metrics
- Target vs achievement tracking

### Dispatch Module

#### Dispatch Workflow
```
Sales Order → Dispatch Request → Delivery Type Selection →
Gate Pass Generation → Watchman Verification → Delivery
```

**Delivery Types**:
1. **Self-Pickup**: Customer collects from facility
   - Gate pass generated
   - Watchman verifies customer
   - Loading completed
   - Customer released

2. **Transport**: Company arranges delivery
   - Transport job created
   - Vehicle assigned
   - Driver assigned
   - Delivery tracking

### Watchman Module

#### Customer Verification Process
1. **Pending Pickup List**: View all customers waiting
2. **Identity Verification**: Verify customer details
3. **Send In**: Allow customer entry for loading
4. **Photo Documentation**: Capture send-in photo
5. **Loading**: Dispatch team loads products
6. **After Loading Photo**: Capture loaded vehicle photo
7. **Release**: Customer exits with products

**Photo Storage**:
- Photos stored in `backend/uploads/`
- URLs stored in database: `{BACKEND_URL}/api/watchman/uploads/{filename}`
- Accessible via browser for verification

#### Guest Management
- Add guest entries
- Schedule visits
- Check-in/check-out tracking
- Visit purpose documentation

### HR Module

#### Employee Management
- Employee profiles
- Department assignment
- Contact information
- Employment history

#### Attendance System
- Daily attendance marking
- Status: Present, Absent, Half-day, Leave
- Attendance reports
- Integration with payroll

#### Leave Management
**Leave Types**:
- Casual Leave
- Sick Leave
- Earned Leave
- Unpaid Leave

**Leave Workflow**:
```
Employee Request → Manager Approval → HR Approval → 
Leave Granted/Rejected
```

#### Payroll System
- Salary calculation
- Deductions management
- Payslip generation
- Payment tracking

#### Recruitment
- Job posting creation
- Application management
- Interview scheduling
- Candidate tracking

### Finance Module

#### Transaction Management
- Record income/expenses
- Payment tracking
- Invoice management
- GST verification

#### Financial Reports
- Revenue reports
- Expense reports
- Profit/loss statements
- Tax reports

### Audit Module

#### Audit Trail Features
- Complete activity logging
- User action tracking
- Timestamp recording
- Module-wise filtering

**Audit Actions**:
- CREATE: New record created
- UPDATE: Record modified
- DELETE: Record deleted
- VIEW: Record accessed
- APPROVE: Approval granted
- REJECT: Approval rejected

**Audit Modules**:
- Production, Purchase, Store, Assembly
- Sales, Dispatch, Transport, Watchman
- Finance, HR, Auth, Approval

---

## Workflows

### Complete Order Fulfillment Workflow

```
1. SALES DEPARTMENT
   └─> Create sales order
   └─> Customer details entered
   └─> Product selected
   └─> Payment terms set

2. PRODUCTION DEPARTMENT
   └─> Receive order notification
   └─> Create production order
   └─> Request materials from store

3. STORE DEPARTMENT
   └─> Allocate materials
   └─> Update inventory
   └─> Notify production

4. ASSEMBLY DEPARTMENT
   └─> Receive assembled products
   └─> Perform quality tests
   └─> Mark as ready for dispatch

5. DISPATCH DEPARTMENT
   └─> Create dispatch request
   └─> Select delivery type
   └─> Generate gate pass (if self-pickup)
   └─> OR create transport job

6A. SELF-PICKUP PATH
    └─> WATCHMAN DEPARTMENT
        └─> Verify customer identity
        └─> Send customer in for loading
        └─> Capture photos
        └─> Release customer

6B. TRANSPORT PATH
    └─> TRANSPORT DEPARTMENT
        └─> Assign vehicle
        └─> Assign driver
        └─> Track delivery
        └─> Mark delivered

7. FINANCE DEPARTMENT
   └─> Record payment
   └─> Generate invoice
   └─> Update accounts
```

### Leave Approval Workflow

```
1. EMPLOYEE
   └─> Submit leave request
   └─> Specify dates and reason

2. MANAGER
   └─> Review request
   └─> Approve/Reject with comments

3. HR DEPARTMENT
   └─> Final approval
   └─> Update leave balance
   └─> Notify employee

4. SYSTEM
   └─> Update attendance records
   └─> Adjust payroll if needed
```

### Purchase Order Workflow

```
1. PURCHASE DEPARTMENT
   └─> Create purchase order
   └─> Select vendor
   └─> Specify items and quantities

2. APPROVAL (if required)
   └─> Manager reviews
   └─> Approves/Rejects

3. VENDOR
   └─> Receives order
   └─> Delivers materials

4. STORE DEPARTMENT
   └─> Receive materials
   └─> Update inventory
   └─> Notify purchase department

5. FINANCE DEPARTMENT
   └─> Process payment
   └─> Record transaction
```

---
 

## API Reference

### Authentication Endpoints

#### POST /api/auth/login
Login with email and password
```json
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "department": "sales"
  },
  "token": "jwt_token_here"
}
```

#### POST /api/auth/logout
Logout current user

#### POST /api/auth/register
Register new user (admin only)

#### POST /api/auth/forgot-password
Request password reset

### Sales Endpoints

#### GET /api/sales/orders
Get all sales orders

#### POST /api/sales/orders
Create new sales order

#### GET /api/sales/customers
Get all customers

#### POST /api/sales/customers
Create new customer

### Dispatch Endpoints

#### GET /api/dispatch/requests
Get all dispatch requests

#### POST /api/dispatch/requests
Create dispatch request

#### POST /api/dispatch/gate-pass
Generate gate pass

### Watchman Endpoints

#### GET /api/watchman/pending-pickups
Get pending customer pickups

#### POST /api/watchman/verify/:id
Verify customer and process pickup

#### GET /api/watchman/uploads/:filename
Serve uploaded photos

### HR Endpoints

#### GET /api/hr/employees
Get all employees

#### POST /api/hr/attendance
Mark attendance

#### GET /api/hr/leaves
Get leave requests

#### POST /api/hr/leaves/approve
Approve leave request

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Error
**Problem**: Cannot connect to MySQL
**Solution**:
- Check MySQL is running
- Verify credentials in `.env`
- Ensure database exists

#### 2. CORS Error
**Problem**: Frontend cannot access backend
**Solution**:
- Check `CORS_ORIGINS` in config
- Verify frontend URL is allowed
- Check backend is running

#### 3. File Upload Not Working
**Problem**: Photos not saving or displaying
**Solution**:
- Check `backend/uploads/` folder exists
- Verify `BACKEND_BASE_URL` is correct
- Check file permissions

#### 4. WebSocket Not Connecting
**Problem**: Real-time updates not working
**Solution**:
- Check Socket.IO is initialized
- Verify `VITE_WS_URL` is correct
- Check firewall settings

#### 5. Authentication Failing
**Problem**: Cannot login
**Solution**:
- Check JWT secret key is set
- Verify user exists in database
- Check password is correct
- Clear browser cookies

### Performance Optimization

1. **Database Indexing**: Add indexes on frequently queried columns
2. **Caching**: Implement Redis for session storage
3. **File Storage**: Use cloud storage (S3) for uploads
4. **Load Balancing**: Use Nginx for multiple backend instances
5. **Database Connection Pooling**: Configure SQLAlchemy pool settings

### Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **Password Hashing**: Use bcrypt for password storage
3. **JWT Expiration**: Set appropriate token expiration
4. **HTTPS**: Always use HTTPS in production
5. **Input Validation**: Validate all user inputs
6. **SQL Injection**: Use parameterized queries
7. **XSS Protection**: Sanitize user-generated content
8. **CSRF Protection**: Implement CSRF tokens

---

## Maintenance & Support

### Regular Maintenance Tasks

1. **Database Backup**: Daily automated backups
2. **Log Rotation**: Weekly log cleanup
3. **Security Updates**: Monthly dependency updates
4. **Performance Monitoring**: Continuous monitoring
5. **Audit Review**: Monthly audit trail review

### Monitoring

**Key Metrics to Monitor**:
- API response times
- Database query performance
- Error rates
- User activity
- System resource usage

### Support Contacts

For technical support:
- Email: support@yourcompany.com
- Documentation: [System Wiki]
- Issue Tracker: [GitHub/Jira]

---

## Appendix

### Database Schema Overview

**Core Tables**:
- `user`: User accounts and authentication
- `sales_order`: Sales orders
- `production_order`: Production orders
- `purchase_order`: Purchase orders
- `store_inventory`: Inventory items
- `dispatch_request`: Dispatch requests
- `gate_pass`: Gate passes for pickups
- `transport_job`: Transport assignments
- `employee`: Employee records
- `attendance`: Attendance records
- `leave`: Leave requests
- `audit_trail`: System audit logs

### Glossary

- **ERP**: Enterprise Resource Planning
- **JWT**: JSON Web Token
- **CRUD**: Create, Read, Update, Delete
- **API**: Application Programming Interface
- **ORM**: Object-Relational Mapping
- **WebSocket**: Real-time bidirectional communication
- **Gate Pass**: Authorization document for customer pickup
- **Part Load**: Partial vehicle load for multiple deliveries

---

**Document Version**: 1.0  
**Last Updated**: November 26, 2025  
**Prepared By**: System Documentation Team


---

# DETAILED DEPARTMENT FUNCTIONS AND COMPONENTS

## 1. PRODUCTION DEPARTMENT - Complete Functions

### Overview
The Production Department manages the entire production order lifecycle from creation to completion, coordinating with Purchase and Store departments for material requirements.

### Key Components

#### 1.1 Production Order Creation Form
**Purpose**: Create new production orders with material requirements

**Fields**:
- **Product Category**: RCM (Road Construction Machines) or BCE (Building Construction Equipments)
- **Product Sub-Category**: Searchable dropdown with product list
- **Required Quantity**: Number of units to produce

**Process**:
1. User selects product category (RCM/BCE)
2. System loads available products for that category
3. User searches and selects specific product
4. User enters quantity
5. System automatically calculates material requirements based on product BOM (Bill of Materials)
6. On submission:
   - Production order created with status `pending`
   - Purchase order automatically generated for required materials
   - Materials list sent to Purchase department
   - Order appears in active orders list

**Validation**:
- All fields mandatory
- Quantity must be positive integer
- Product must exist in product data

#### 1.2 Active Production Orders List
**Purpose**: Display all production orders with real-time status

**Information Displayed**:
- Order ID
- Product name
- Quantity
- Order creation date/time (IST format)
- Current status badge
- Material availability status

**Status Types**:
- `pending_materials`: Waiting for materials from store
- `materials_ready`: Materials allocated, ready for production
- `in_production`: Currently being produced
- `completed`: Production finished

**Features**:
- Auto-refresh every 10 seconds
- Color-coded status badges
- Chronological ordering (newest first)
- Real-time updates via WebSocket

#### 1.3 Material Requirements Integration
**Automatic Process**:
1. When production order created, system:
   - Extracts material list from product definition
   - Multiplies material quantities by order quantity
   - Creates purchase order with calculated materials
   - Sends to Purchase department for approval

**Material Data Structure**:
```json
{
  "name": "Material Name",
  "quantity": calculated_quantity,
  "unit_cost": 0 (filled by Purchase dept)
}
```

#### 1.4 Order Status Tracking
**Status Flow**:
```
pending → pending_materials → materials_ready → 
in_production → completed
```

**Status Updates Triggered By**:
- Purchase approval → `pending_materials`
- Store allocation → `materials_ready`
- Assembly start → `in_production`
- Assembly completion → `completed`

### Conditions and Business Rules

1. **Order Creation**:
   - Condition: User must be logged in as Production department
   - Validation: Product must exist in system
   - Action: Auto-generate purchase order

2. **Material Dependency**:
   - Condition: Production cannot start until materials ready
   - Check: Store department must allocate all materials
   - Notification: Production team notified when materials ready

3. **Audit Trail**:
   - All order creations logged
   - User who created order recorded
   - Timestamp in IST format
   - Changes tracked in audit_trail table

### Integration Points

- **With Purchase**: Auto-creates purchase orders
- **With Store**: Receives material allocation notifications
- **With Assembly**: Sends completed orders for assembly
- **With Management**: Provides production metrics

---

## 2. PURCHASE DEPARTMENT - Complete Functions

### Overview
Purchase Department reviews production material requirements, adds pricing, manages vendor relationships, and coordinates with Finance for approval.

### Key Components

#### 2.1 Purchase Orders Dashboard
**Two Main Tabs**:

**Tab 1: Orders Requiring Action**
- Shows orders needing Purchase department intervention
- Statuses included:
  - `pending_request`: New orders from Production
  - `insufficient_stock`: Store cannot fulfill
  - `partially_allocated`: Some materials available
  - `pending_store_check`: Waiting for Store verification
  - `pending_finance_approval`: Sent to Finance

**Tab 2: Processed Orders**
- Shows completed/approved orders
- Statuses included:
  - `approved`: Purchase approved
  - `completed`: Fully processed
  - `finance_approved`: Finance approved purchase
  - `store_allocated`: Materials allocated
  - `verified_in_store`: Store verified receipt
  - `rejected`: Order rejected

#### 2.2 Order Review and Editing
**Edit Functionality**:

**Locked Fields** (Cannot be changed):
- Product name
- Original material names
- Original material quantities

**Editable Fields**:
- Unit cost for each material (₹)
- Payment terms
- Extra materials (fully editable)

**Payment Terms Options**:
- Full Payment (100%)
- 50-50 Split Payment
- 30-70 Split Payment
- 70-30 Split Payment
- Cash on Delivery (COD)
- 50% Advance
- 30% Advance
- 30 Days Credit
- 60 Days Credit
- Other (custom terms)

#### 2.3 Material Cost Management
**Required Materials Section**:
- Original materials from Production (locked)
- Only unit cost can be edited
- Quantity fixed based on production requirements
- Subtotal calculated automatically

**Extra Materials Section**:
- Additional materials not in original requisition
- Fully editable (name, quantity, unit cost)
- Can add/remove extra materials
- Separate subtotal calculation

**Total Cost Calculation**:
```
Total = (Required Materials Subtotal) + (Extra Materials Subtotal)
```

#### 2.4 Approval Workflow Actions

**Action 1: Accept & Send to Store**
- Condition: Order status is `pending_request`
- Process:
  1. Validates all required fields filled
  2. Changes status to `pending_store_check`
  3. Notifies Store department
  4. Creates audit log entry
- Result: Order moves to Store for stock verification

**Action 2: Reject Order**
- Condition: Order status is `pending_request`
- Process:
  1. Changes status to `rejected`
  2. Notifies Production department
  3. Creates audit log with rejection reason
- Result: Order cancelled, Production notified

**Action 3: Send to Finance for Approval**
- Condition: Order status is `insufficient_stock` or `partially_allocated`
- Validations Required:
  - Payment terms must be set (cannot be empty)
  - All materials must have unit cost > 0
  - Total amount must be > 0
- Process:
  1. Validates payment terms exist
  2. Checks all unit costs filled
  3. Calculates total cost
  4. Changes status to `pending_finance_approval`
  5. Notifies Finance department
- Result: Order sent to Finance for budget approval

#### 2.5 Status Badge System
**Color-Coded Status Indicators**:
- Yellow: `pending_request` - Needs Purchase action
- Blue: `pending_store_check` - Store reviewing
- Green: `store_allocated` - Materials available
- Amber: `partially_allocated` - Some materials available
- Orange: `insufficient_stock` - Need to purchase
- Indigo: `pending_finance_approval` - Finance reviewing
- Purple: `finance_approved` - Finance approved
- Teal: `verified_in_store` - Store verified receipt
- Red: `rejected` - Order rejected
- Gray: `completed` - Fully processed

### Conditions and Business Rules

1. **Order Acceptance**:
   - Condition: Must review material requirements
   - Action: Can accept or reject
   - Validation: Cannot accept without reviewing

2. **Finance Approval Request**:
   - Condition: Payment terms must be set
   - Condition: All unit costs must be > ₹0
   - Condition: Total amount must be > ₹0
   - Validation: System blocks if conditions not met
   - Error Messages:
     - "Payment Terms Required" if terms empty
     - "Unit Costs Required" if any cost is ₹0
     - "Invalid Total Amount" if total is ₹0

3. **Material Editing**:
   - Condition: Can only edit before Finance approval
   - Restriction: Cannot change original material names/quantities
   - Freedom: Can add unlimited extra materials

4. **Auto-Refresh**:
   - Frequency: Every 15 seconds
   - Pauses: When user is typing or modal open
   - Indicator: Shows last refresh time

### Integration Points

- **With Production**: Receives material requisitions
- **With Store**: Sends for stock verification
- **With Finance**: Requests budget approval
- **With Vendors**: (Future: Vendor management)

---

## 3. STORE/INVENTORY DEPARTMENT - Complete Functions

### Overview
Store Department manages inventory, verifies stock availability, allocates materials to production, and receives purchased materials.

### Key Components

#### 3.1 Inventory Management Tab
**Two Main Sections**:

**Section A: Add Inventory**
- Manual entry form
- Fields:
  - Item Name (text)
  - Quantity (number)
- Bulk import via Excel
- Excel format: Product Name | Quantity | Category (optional)

**Section B: Inventory List**
- Real-time inventory display
- Search functionality
- Shows: Item name, Current quantity
- Color-coded stock levels
- Alphabetical sorting

#### 3.2 Stock Verification Tab
**Purpose**: Process purchase orders and verify stock availability

**Order Types Handled**:
1. `pending_store_check`: New orders from Purchase
2. `finance_approved`: Orders approved by Finance

**Stock Check Process**:
1. Order arrives with status `pending_store_check`
2. Store reviews required materials
3. System checks current inventory levels
4. Three possible outcomes:
   - **Fully Available**: All materials in stock
     - Status → `store_allocated`
     - Materials reserved for production
     - Inventory quantities reduced
   - **Partially Available**: Some materials in stock
     - Status → `partially_allocated`
     - Available materials reserved
     - Shortage list sent back to Purchase
   - **Insufficient Stock**: Materials not available
     - Status → `insufficient_stock`
     - Full shortage list sent to Purchase
     - Purchase must procure materials

#### 3.3 Material Receipt and Verification
**Process for Finance-Approved Orders**:
1. Order status: `finance_approved`
2. Materials purchased and delivered
3. Store performs "Verify & Send Stock" action:
   - Physically receives materials
   - Verifies quantities match order
   - Adds materials to inventory
   - Updates inventory database
   - Changes order status to `verified_in_store`
   - Notifies Production that materials ready

**Verification Steps**:
- Check material quality
- Count quantities
- Match against purchase order
- Record receipt in system
- Update inventory levels
- Generate receipt documentation

#### 3.4 Excel Import Functionality
**Purpose**: Bulk inventory upload

**Excel Format Requirements**:
- Column 1: Product Name (required)
- Column 2: Quantity (required, must be number)
- Column 3: Category (optional, defaults to "Raw Material")

**Import Process**:
1. User selects Excel file (.xlsx or .xls)
2. System reads file using XLSX library
3. Validates data format
4. Filters invalid entries
5. Bulk inserts valid items
6. Shows success/error message
7. Refreshes inventory list

**Validation Rules**:
- Product name cannot be empty
- Quantity must be positive number
- Duplicate items are merged (quantities added)

#### 3.5 Search and Filter
**Search Functionality**:
- Real-time search as user types
- Searches in item names
- Case-insensitive matching
- Instant results display
- No results message if no matches

### Conditions and Business Rules

1. **Stock Allocation**:
   - Condition: Materials must be physically available
   - Action: Reduces inventory count
   - Validation: Cannot allocate more than available
   - Rollback: If production cancelled, materials returned

2. **Material Receipt**:
   - Condition: Order must be `finance_approved`
   - Requirement: Physical verification required
   - Action: Adds to inventory
   - Audit: Receipt logged with timestamp and user

3. **Inventory Levels**:
   - Warning: Low stock alerts (future feature)
   - Minimum: Cannot go negative
   - Tracking: All changes logged in audit trail

4. **Auto-Refresh**:
   - Frequency: Every 8 seconds
   - Pauses: When user typing in search
   - Updates: Both inventory and purchase orders

### Integration Points

- **With Purchase**: Receives orders for stock check
- **With Production**: Allocates materials
- **With Finance**: Receives approved purchase confirmations
- **With Assembly**: Notifies when materials ready

---

## 4. ASSEMBLY DEPARTMENT - Complete Functions

### Overview
Assembly Department handles product assembly, quality testing, progress tracking, and rework management for failed machines.

### Key Components

#### 4.1 Assembly Dashboard - Three Tabs

**Tab 1: Pending Assembly**
- Shows orders ready for assembly
- Statuses: `pending`, `in_progress`, `paused`
- Real-time progress tracking
- Action buttons based on status

**Tab 2: Machine Rework Orders**
- Individual machines that failed showroom testing
- Returned from Showroom for rework
- Tracks rework progress
- Re-testing after rework completion

**Tab 3: Completed Assembly Orders**
- Historical record of completed assemblies
- Shows completion dates
- Quality test results
- Sent to Showroom status

#### 4.2 Assembly Order Management

**Order Lifecycle**:
```
pending → in_progress → paused (optional) → 
in_progress → completed → sent_to_showroom
```

**Status: Pending**
- Order created, materials allocated
- Waiting to start assembly
- Action Available: "Start Assembly"

**Status: In Progress**
- Assembly work ongoing
- Progress bar shows completion %
- Actions Available:
  - "+25% Progress"
  - "+50% Progress"
  - "Complete (100%)"
  - "Pause"

**Status: Paused**
- Assembly temporarily stopped
- Progress preserved
- Action Available: "Resume Assembly"

**Status: Completed**
- Assembly finished at 100%
- Quality check passed
- Ready for showroom testing
- Automatically creates showroom product entry

#### 4.3 Progress Tracking System

**Progress Increments**:
- Manual updates: +25%, +50%, or Complete
- Current progress displayed as percentage
- Visual progress bar (color-coded)
- Progress cannot decrease
- Maximum: 100%

**Progress Bar Colors**:
- 0-25%: Orange (just started)
- 26-75%: Blue (in progress)
- 76-99%: Yellow (almost done)
- 100%: Green (completed)

**Completion Requirements**:
- Progress must reach 100%
- Quality check marked as passed
- Testing passed flag set
- Completion timestamp recorded

#### 4.4 Machine Rework System

**Rework Order Creation**:
- Triggered by Showroom when machine fails testing
- Contains:
  - Original assembly order ID
  - Machine ID (specific unit that failed)
  - Engine number
  - Failure reason/notes
  - Test results

**Rework Process**:
1. Failed machine appears in "Machine Rework Orders" tab
2. Assembly team reviews failure notes
3. Performs rework/repairs
4. Updates rework status:
   - `pending`: Just received
   - `in_progress`: Being reworked
   - `completed`: Rework finished
5. Marks rework as complete
6. Machine automatically sent back to Showroom for re-testing

**Rework Completion**:
- Action: "Complete Rework"
- Process:
  - Validates rework finished
  - Updates machine status to `pending` (for re-test)
  - Returns machine to Showroom testing queue
  - Removes from rework list
  - Creates audit log entry
- Notification: Showroom notified of reworked machine

#### 4.5 Quality Control Integration

**Quality Checks**:
- Performed at 100% completion
- Automated quality flag set
- Testing passed indicator
- If quality fails:
  - Order status → `rework`
  - Appears in rework tab
  - Must be reassembled

**Testing Integration**:
- After completion, order sent to Showroom
- Showroom performs machine-by-machine testing
- Failed machines return as rework orders
- Passed machines proceed to display

### Conditions and Business Rules

1. **Starting Assembly**:
   - Condition: Order status must be `pending`
   - Condition: Materials must be allocated
   - Action: Status → `in_progress`, Progress → 0%
   - Timestamp: `startedAt` recorded

2. **Progress Updates**:
   - Condition: Status must be `in_progress`
   - Validation: Cannot exceed 100%
   - Validation: Cannot decrease progress
   - Action: Updates progress percentage
   - Audit: Each update logged

3. **Pausing Assembly**:
   - Condition: Status must be `in_progress`
   - Action: Status → `paused`
   - Preservation: Progress percentage saved
   - Timestamp: `pausedAt` recorded

4. **Resuming Assembly**:
   - Condition: Status must be `paused`
   - Action: Status → `in_progress`
   - Restoration: Progress continues from saved point
   - Timestamp: `resumedAt` recorded

5. **Completing Assembly**:
   - Condition: Progress must be 100%
   - Action: Status → `completed`
   - Quality: `qualityCheck` → true
   - Testing: `testingPassed` → true
   - Timestamp: `completedAt` recorded
   - Integration: Creates showroom product entry

6. **Rework Management**:
   - Condition: Machine failed showroom testing
   - Source: Rework order from Showroom
   - Process: Assembly repairs specific machine
   - Completion: Machine returns to Showroom for re-test
   - Tracking: Rework history maintained

7. **Auto-Refresh**:
   - Frequency: Every 8 seconds
   - Updates: All three tabs
   - Pauses: During user interaction

### Integration Points

- **With Store**: Receives material allocation notifications
- **With Showroom**: Sends completed products for testing
- **With Showroom**: Receives failed machines for rework
- **With Production**: Updates production order status
- **With Management**: Provides assembly metrics

---


## 5. SHOWROOM DEPARTMENT - Complete Functions

### Overview
Showroom Department performs machine-by-machine quality testing, manages product display, and coordinates with Sales for customer orders.

### Key Components

#### 5.1 Showroom Dashboard - Two Tabs

**Tab 1: Products Ready for Showroom**
- Completed assembly orders awaiting testing
- Machine-by-machine testing interface
- Testing progress tracking
- Failed machine management

**Tab 2: Products on Display**
- Products approved and displayed in showroom
- Available for customer viewing
- Synced with Sales department
- Quantity tracking after sales

#### 5.2 Machine Testing System

**Testing Process**:
1. Assembly completes order (e.g., 10 machines)
2. Order appears in "Products Ready for Showroom"
3. Showroom tests each machine individually
4. Each machine gets: Pass, Fail, or Pending status
5. All machines must be tested before proceeding

**Machine Test Dialog**:
- Opens detailed testing interface
- Shows all machines in the assembly order
- Each machine has:
  - Machine ID
  - Engine Number (editable)
  - Test Result (Pass/Fail/Pending)
  - Test Notes
  - Tested By (auto-filled)
  - Test Date

**Test Result Options**:
- **Pass**: Machine meets quality standards
  - Color: Green
  - Action: Machine approved for showroom
  - Status: Ready for display
- **Fail**: Machine has defects
  - Color: Red
  - Action: Machine sent back to Assembly for rework
  - Status: Rework required
  - Requires: Failure notes
- **Pending**: Not yet tested
  - Color: Yellow
  - Action: Awaiting testing
  - Status: Testing incomplete

#### 5.3 Testing Progress Tracking

**Progress Indicators**:
- Total Machines: Count of machines in order
- Passed: Number of machines that passed
- Failed: Number of machines that failed
- Pending: Number of machines not yet tested

**Progress Bar**:
- Visual representation of testing completion
- Color changes based on results:
  - Green: All tested, all passed
  - Yellow: Testing in progress
  - Red: Some machines failed
- Percentage: (Tested / Total) × 100%

**Testing Summary**:
```
Passed: X machines (green badge)
Failed: Y machines (red badge)
Pending: Z machines (yellow badge)
```

#### 5.4 Processing Assembly After Testing

**Scenario 1: All Machines Pass**
- Condition: All machines have "Pass" status
- Action: "Move to Showroom" button enabled
- Process:
  1. Validates all machines tested
  2. Creates showroom product entry
  3. Sets quantity = number of passed machines
  4. Removes from "Ready for Showroom" tab
  5. Adds to "Products on Display" tab
  6. Notifies Sales department
  7. Product available for customer orders

**Scenario 2: Some Machines Fail**
- Condition: One or more machines have "Fail" status
- Action: "Send Failed Machines" button appears
- Process:
  1. Identifies failed machines
  2. Creates rework orders for each failed machine
  3. Sends failed machines back to Assembly
  4. Keeps passed machines in showroom
  5. Updates assembly order with rework count
  6. Notifies Assembly of rework requirements

**Scenario 3: Testing Incomplete**
- Condition: Some machines still "Pending"
- Action: "Move to Showroom" button disabled
- Message: "Testing Incomplete"
- Requirement: All machines must be tested

#### 5.5 Reworked Machine Re-testing

**Rework Return Process**:
1. Assembly completes rework on failed machine
2. Machine returns to Showroom with "rework" flag
3. Appears in testing queue with orange badge
4. Showroom re-tests the reworked machine
5. New test result recorded
6. If passes: Added to showroom inventory
7. If fails again: Sent back for additional rework

**Rework Indicators**:
- Orange badge: "Rework Returned"
- Icon: Refresh/cycle icon
- Note: "Contains reworked machines returned for re-testing"
- Tracking: Rework history maintained

#### 5.6 Products on Display Management

**Display Information**:
- Product name
- Category
- Cost price (from assembly)
- Sale price (calculated with markup)
- Quantity available
- Production order ID
- Status: Available

**Showroom-Sales Sync**:
- Real-time quantity updates
- When Sales sells a product:
  - Quantity decremented in showroom
  - Status updated if sold out
  - Inventory synchronized
- Prevents overselling
- Accurate availability display

### Conditions and Business Rules

1. **Machine Testing Requirements**:
   - Condition: All machines must be tested individually
   - Validation: Cannot proceed with pending machines
   - Requirement: Engine number must be recorded
   - Documentation: Test notes required for failures

2. **Moving to Showroom**:
   - Condition: All machines tested
   - Condition: All machines passed OR failed machines sent to rework
   - Action: Creates showroom product
   - Quantity: Only passed machines counted
   - Validation: Cannot move with pending tests

3. **Failed Machine Handling**:
   - Condition: Machine fails quality test
   - Requirement: Failure notes mandatory
   - Action: Creates rework order
   - Routing: Sent to Assembly department
   - Tracking: Rework history maintained
   - Re-testing: Required after rework completion

4. **Rework Machine Re-testing**:
   - Condition: Machine returned from rework
   - Indicator: Orange "Rework Returned" badge
   - Process: Full re-test required
   - Options: Pass (add to inventory) or Fail (send back again)
   - Limit: No limit on rework cycles

5. **Product Display Rules**:
   - Condition: All machines passed testing
   - Availability: Immediately available for sales
   - Pricing: Cost price + markup = sale price
   - Inventory: Synced with Sales department
   - Updates: Real-time quantity changes

6. **Auto-Refresh**:
   - Frequency: Every 8 seconds
   - Updates: Both tabs
   - Pauses: During testing dialog open

### Integration Points

- **With Assembly**: Receives completed products, sends rework orders
- **With Sales**: Provides available products, syncs inventory
- **With Management**: Provides quality metrics
- **With Finance**: Provides cost/pricing data

---

## 6. SALES DEPARTMENT - Complete Functions

### Overview
Sales Department manages customer relationships, creates sales orders, tracks payments, monitors performance, and coordinates with Dispatch for delivery.

### Key Components

#### 6.1 Sales Dashboard - Multiple Tabs

**Tab 1: Create Sales Order**
- Customer selection/creation
- Product selection from showroom
- Pricing and payment terms
- Order creation form

**Tab 2: Sales Orders**
- All sales orders list
- Status tracking
- Payment status
- Delivery coordination

**Tab 3: Customers**
- Customer database
- Contact information
- Order history
- Customer management

**Tab 4: Performance**
- Sales metrics
- Target vs achievement
- Commission calculations
- Performance graphs

#### 6.2 Customer Management

**Customer Creation**:
- Fields:
  - Customer Name (required)
  - Contact Number (required)
  - Email Address
  - Company Name
  - GST Number
  - Billing Address
  - Shipping Address
  - Customer Type (Individual/Company)
- Validation: Duplicate check by contact number
- Storage: Customer database

**Customer Search**:
- Real-time search
- Search by: Name, Contact, Email, Company
- Quick selection for orders
- Customer history display

#### 6.3 Sales Order Creation

**Order Form Fields**:
- Customer Selection (dropdown/search)
- Product Selection (from showroom inventory)
- Quantity (max = available quantity)
- Unit Price (from showroom, editable)
- Discount (percentage or amount)
- Tax/GST (calculated)
- Final Amount (auto-calculated)
- Payment Terms
- Delivery Type (Self-Pickup/Transport)
- Expected Delivery Date
- Special Instructions

**Payment Terms Options**:
- Full Payment (100% upfront)
- Partial Payment (custom split)
- Credit Terms (30/60/90 days)
- Installments (custom schedule)

**Delivery Type Selection**:
- **Self-Pickup**: Customer collects from facility
  - Generates gate pass
  - Coordinates with Dispatch
  - Watchman verification required
- **Transport**: Company arranges delivery
  - Creates transport job
  - Vehicle assignment
  - Driver assignment
  - Delivery tracking

#### 6.4 Payment Management

**Payment Status Types**:
- `pending`: No payment received
- `partial`: Some payment received
- `pending_finance_approval`: Payment submitted, awaiting Finance approval
- `finance_approved`: Finance approved payment
- `paid`: Fully paid
- `overdue`: Payment deadline passed

**Payment Recording**:
- Payment Method:
  - Cash
  - Cheque
  - Bank Transfer
  - UPI
  - Card
  - Split Payment (multiple methods)
- Payment Details:
  - Amount
  - Date
  - Reference Number
  - Bank Details (if applicable)
  - Cash Denominations (if cash)
- Validation: Amount cannot exceed pending amount
- Finance Approval: Required for large amounts

**Payment Reminders**:
- Automatic reminder generation
- Based on payment terms
- Reminder types:
  - Due Today
  - Overdue
  - Upcoming (3 days before)
- Notification to customer
- Finance department visibility

#### 6.5 Sales Performance Tracking

**Metrics Displayed**:
- Total Sales (current month)
- Total Revenue
- Number of Orders
- Average Order Value
- Conversion Rate
- Target Achievement %

**Target Management**:
- Monthly targets set by Management
- Individual salesperson targets
- Team targets
- Real-time progress tracking
- Achievement percentage
- Commission calculation based on achievement

**Performance Dashboard**:
- Sales graph (daily/weekly/monthly)
- Top products sold
- Top customers
- Sales by category
- Payment collection rate
- Pending payments summary

#### 6.6 Order Status Tracking

**Order Lifecycle**:
```
created → payment_pending → payment_received → 
finance_approved → dispatch_requested → 
in_transit/loading → delivered
```

**Status Updates**:
- Created: Order placed
- Payment Pending: Awaiting payment
- Payment Received: Payment recorded
- Finance Approved: Finance approved payment
- Dispatch Requested: Sent to Dispatch department
- Loading: Customer/vehicle being loaded
- In Transit: On the way to customer
- Delivered: Successfully delivered

### Conditions and Business Rules

1. **Customer Requirements**:
   - Condition: Customer must exist before creating order
   - Validation: Contact number unique
   - Option: Create new customer during order creation
   - Requirement: Minimum info (name, contact)

2. **Product Availability**:
   - Condition: Product must be in showroom inventory
   - Validation: Quantity ≤ available quantity
   - Real-time: Inventory synced with Showroom
   - Prevention: Cannot oversell

3. **Pricing Rules**:
   - Base Price: From showroom product
   - Discount: Can be applied (requires approval if > threshold)
   - Tax: Auto-calculated based on GST rules
   - Final Amount: Base - Discount + Tax
   - Minimum: Cannot sell below cost price (warning shown)

4. **Payment Processing**:
   - Condition: Payment amount > 0
   - Validation: Cannot exceed order amount
   - Partial Payments: Allowed, tracked separately
   - Finance Approval: Required if amount > threshold
   - Recording: All payments logged with timestamp

5. **Delivery Coordination**:
   - Self-Pickup:
     - Generates gate pass automatically
     - Sends to Dispatch department
     - Dispatch creates gate pass
     - Watchman verifies customer
   - Transport:
     - Creates transport job
     - Sends to Transport department
     - Vehicle and driver assigned
     - Delivery tracking enabled

6. **Commission Calculation**:
   - Based on: Sales amount, Target achievement
   - Formula: Configurable by Management
   - Tiers: Different rates for different achievement levels
   - Payment: Monthly, after Finance approval

7. **Order Cancellation**:
   - Condition: Order not yet dispatched
   - Process: Refund payment, Return inventory to showroom
   - Approval: Manager approval required
   - Audit: Cancellation reason recorded

### Integration Points

- **With Showroom**: Gets available products, updates inventory
- **With Dispatch**: Sends dispatch requests, coordinates delivery
- **With Transport**: Creates transport jobs for delivery
- **With Watchman**: Coordinates customer pickups
- **With Finance**: Sends payments for approval
- **With Management**: Provides sales metrics and performance data

---


## 7. DISPATCH DEPARTMENT - Complete Functions

### Overview
Dispatch Department coordinates product delivery, generates gate passes for customer pickups, manages loading operations, and tracks delivery status.

### Key Components

#### 7.1 Dispatch Dashboard

**Main Functions**:
- View pending dispatch requests
- Generate gate passes
- Coordinate with Watchman for pickups
- Create transport jobs
- Track delivery status
- Manage loading operations

#### 7.2 Dispatch Request Processing

**Request Sources**:
- Sales Department (after payment approval)
- Contains:
  - Sales order details
  - Customer information
  - Product details
  - Delivery type (Self-Pickup/Transport)
  - Delivery address (if transport)

**Dispatch Request Statuses**:
- `pending`: New request received
- `gate_pass_generated`: Gate pass created for self-pickup
- `transport_assigned`: Vehicle and driver assigned
- `loading`: Product being loaded
- `entered_for_pickup`: Customer entered facility (self-pickup)
- `in_transit`: On the way to customer
- `delivered`: Successfully delivered
- `completed`: Fully processed

#### 7.3 Gate Pass Generation (Self-Pickup)

**Gate Pass Creation**:
- Triggered by: Sales order with delivery type "Self-Pickup"
- Information Included:
  - Gate Pass ID (unique)
  - Sales Order Number
  - Customer Name
  - Customer Contact
  - Customer Email
  - Customer Address
  - Product Name
  - Quantity
  - Vehicle Number (if provided)
  - Driver Name (if provided)
  - Driver Contact (if provided)
  - Issue Date/Time
  - Valid Until (expiry)
  - Company Name (if transport company)

**Gate Pass Workflow**:
1. Dispatch generates gate pass
2. Gate pass sent to Watchman department
3. Status: `pending` (waiting for customer)
4. Customer arrives at gate
5. Watchman verifies identity
6. Customer sent in for loading
7. Dispatch team loads product
8. Watchman captures photos
9. Customer released
10. Status: `completed`

#### 7.4 Loading Operations

**Loading Process**:
1. Customer/vehicle enters facility
2. Dispatch receives notification
3. Loading team prepares product
4. Product loaded onto vehicle
5. Loading verification:
   - Quantity check
   - Quality check
   - Damage inspection
   - Secure packaging
6. Loading completion recorded
7. Photos taken (before/after)
8. Customer/driver signs off
9. Gate pass updated

**Loading Documentation**:
- Loading checklist
- Product condition report
- Quantity verification
- Photos (send-in, after-loading)
- Customer signature
- Timestamp

#### 7.5 Transport Job Creation

**For Transport Delivery**:
- Triggered by: Sales order with delivery type "Transport"
- Creates transport job with:
  - Sales order reference
  - Dispatch request ID
  - Product details
  - Delivery address
  - Customer contact
  - Expected delivery date
  - Special instructions
  - Priority level

**Transport Coordination**:
1. Dispatch creates transport job
2. Sent to Transport department
3. Transport assigns vehicle and driver
4. Loading scheduled
5. Product loaded
6. Vehicle dispatched
7. Delivery tracking enabled
8. Delivery confirmation
9. Status updated to `delivered`

#### 7.6 Delivery Tracking

**Tracking Information**:
- Current status
- Location (if GPS enabled)
- Estimated delivery time
- Driver contact
- Vehicle details
- Delivery updates
- Customer notifications

**Status Updates**:
- Dispatch sends real-time updates
- Customer receives SMS/email notifications
- Management dashboard shows delivery status
- Delays or issues flagged immediately

### Conditions and Business Rules

1. **Gate Pass Generation**:
   - Condition: Sales order must be payment-approved
   - Condition: Delivery type must be "Self-Pickup"
   - Requirement: Customer details must be complete
   - Validation: Product must be available in showroom
   - Action: Creates gate pass, notifies Watchman

2. **Customer Verification**:
   - Condition: Customer must present gate pass
   - Validation: Gate pass must be valid (not expired)
   - Check: Customer identity matches gate pass
   - Options: If mismatch, manager approval required
   - Security: Watchman performs verification

3. **Loading Authorization**:
   - Condition: Customer must be verified by Watchman
   - Condition: Status must be `entered_for_pickup`
   - Process: Dispatch team loads product
   - Verification: Quantity and quality checked
   - Documentation: Photos and signatures required

4. **Transport Assignment**:
   - Condition: Delivery type must be "Transport"
   - Requirement: Delivery address must be complete
   - Process: Creates transport job
   - Assignment: Transport department assigns vehicle/driver
   - Tracking: GPS tracking enabled (if available)

5. **Delivery Completion**:
   - Self-Pickup: Completed when customer exits gate
   - Transport: Completed when customer signs delivery receipt
   - Verification: Photos and signatures required
   - Update: Sales order status updated to `delivered`
   - Notification: Customer and Sales notified

6. **Failed Delivery Handling**:
   - Condition: Customer not available or refuses delivery
   - Action: Return to facility
   - Rescheduling: New delivery date arranged
   - Notification: Sales and customer notified
   - Status: `delivery_failed` with reason

### Integration Points

- **With Sales**: Receives dispatch requests
- **With Watchman**: Coordinates customer pickups, gate pass verification
- **With Transport**: Creates transport jobs for delivery
- **With Showroom**: Confirms product availability
- **With Management**: Provides delivery metrics

---

## 8. WATCHMAN/SECURITY DEPARTMENT - Complete Functions

### Overview
Watchman Department manages gate security, verifies customer identity for pickups, documents vehicle entry/exit with photos, and manages guest visits.

### Key Components

#### 8.1 Watchman Dashboard - Multiple Sections

**Section 1: Pending Pickups**
- Gate passes awaiting customer arrival
- Customer verification interface
- Photo documentation system

**Section 2: Guest Management**
- Guest list viewing
- Guest check-in/check-out
- Visitor tracking

**Section 3: Company Vehicle Returns**
- Company vehicle check-in
- Driver verification
- Vehicle availability updates

**Section 4: Gate Pass History**
- Completed pickups
- Rejected pickups
- Search functionality

#### 8.2 Customer Verification Process

**Verification Steps**:
1. Customer arrives at gate with gate pass
2. Watchman views pending pickups list
3. Selects customer's gate pass
4. Verification dialog opens with:
   - Customer name (from gate pass)
   - Vehicle number
   - Driver name
   - Driver contact
   - Product details
   - Order information

**Identity Verification**:
- Customer Name Check:
  - Watchman asks for customer name
  - Enters name in verification form
  - System compares with gate pass
  - If match: Verification passes
  - If mismatch: Shows warning, requires manager approval

**Vehicle Verification**:
- Vehicle number recorded
- Driver name recorded
- Driver contact recorded
- Company name (if transport company)

#### 8.3 Two-Step Pickup Process

**Step 1: Send In for Loading**
- Action: "Send In" button
- Process:
  1. Customer identity verified
  2. Send-in photo captured
  3. Vehicle details recorded
  4. Status → `entered_for_pickup`
  5. Entry time recorded
  6. Notification sent to Dispatch
  7. Customer proceeds to loading area

**Send-In Photo**:
- Purpose: Document vehicle entry
- Captures: Vehicle, driver, entry time
- Storage: `backend/uploads/sendin_[filename].jpg`
- URL Format: `{BACKEND_URL}/api/watchman/uploads/sendin_[filename].jpg`
- Accessible: Via browser for verification

**Step 2: Release After Loading**
- Action: "Release" button
- Process:
  1. Dispatch completes loading
  2. After-loading photo captured
  3. Vehicle condition documented
  4. Status → `verified` (completed)
  5. Exit time recorded
  6. Gate opened for customer
  7. Sales order status → `delivered`

**After-Loading Photo**:
- Purpose: Document loaded vehicle
- Captures: Loaded product, vehicle, exit time
- Storage: `backend/uploads/afterload_[filename].jpg`
- URL Format: `{BACKEND_URL}/api/watchman/uploads/afterload_[filename].jpg`
- Accessible: Via browser for verification

#### 8.4 Photo Documentation System

**Photo Upload Process**:
1. Watchman captures photo (mobile/camera)
2. Photo uploaded via multipart form data
3. Backend receives file
4. File saved to `backend/uploads/` directory
5. Filename secured (sanitized)
6. Full URL generated: `{BACKEND_BASE_URL}/api/watchman/uploads/{filename}`
7. URL stored in database (gate_pass table)
8. Photo accessible via URL in browser

**Photo Storage**:
- Location: `backend/uploads/` folder
- Naming: `sendin_[id].jpg` or `afterload_[id].jpg`
- Format: JPEG, PNG supported
- Size: Configurable (default: 5MB max)
- Retention: Permanent (for audit trail)

**Photo Access**:
- Route: `/api/watchman/uploads/:filename`
- Method: GET
- Authentication: Required
- Response: Image file
- Usage: Audit, verification, disputes

#### 8.5 Identity Mismatch Handling

**Mismatch Scenario**:
- Condition: Customer name doesn't match gate pass
- Response:
  ```json
  {
    "status": "identity_mismatch",
    "message": "Customer name mismatch. Expected: [Name], Provided: [Name]",
    "requiresManager": true
  }
  ```
- Action: Watchman must call manager
- Manager Decision:
  - Approve: Override mismatch, allow entry
  - Reject: Deny entry, customer must contact Sales
- Audit: Mismatch and decision logged

#### 8.6 Pickup Rejection

**Rejection Reasons**:
- Identity mismatch (no manager approval)
- Invalid/expired gate pass
- Security concerns
- Missing documentation
- Customer behavior issues

**Rejection Process**:
1. Watchman selects "Reject" option
2. Enters rejection reason (mandatory)
3. System updates:
   - Gate pass status → `rejected`
   - Dispatch request status → `pickup_rejected`
   - Rejection reason recorded
   - Rejection time recorded
4. Notifications sent:
   - Sales department
   - Customer (via Sales)
   - Management (if flagged)
5. Audit log created

#### 8.7 Guest Management

**Guest Entry Creation**:
- Fields:
  - Guest Name (required)
  - Company Name
  - Contact Number
  - Meeting Person (required)
  - Visit Date (required)
  - Visit Time
  - Purpose (required)
  - Expected Duration
  - Vehicle Number
  - ID Proof Type
  - ID Proof Number

**Guest Check-In**:
- Guest arrives at gate
- Watchman searches guest list
- Selects guest entry
- Records:
  - Actual arrival time
  - ID verification
  - Photo (optional)
  - Visitor badge issued
- Status → `checked_in`
- Meeting person notified

**Guest Check-Out**:
- Guest leaves facility
- Watchman records:
  - Departure time
  - Visitor badge returned
  - Exit notes (optional)
- Status → `checked_out`
- Visit duration calculated
- Entry archived

#### 8.8 Company Vehicle Check-In

**Vehicle Return Process**:
1. Company vehicle returns from delivery
2. Watchman receives notification
3. Verifies:
   - Vehicle number
   - Driver identity
   - Delivery completion
4. Checks vehicle condition
5. Records return time
6. Updates vehicle status → `available`
7. Notifies Transport department

### Conditions and Business Rules

1. **Customer Verification Requirements**:
   - Condition: Gate pass must be valid
   - Condition: Customer must be present
   - Validation: Identity must match gate pass
   - Exception: Manager can override mismatch
   - Security: All verifications logged

2. **Photo Documentation Requirements**:
   - Condition: Send-in photo mandatory
   - Condition: After-loading photo mandatory
   - Format: JPEG or PNG
   - Storage: Permanent (audit trail)
   - Access: Authenticated users only
   - URL: Full URL stored in database for easy access

3. **Two-Step Process Enforcement**:
   - Step 1: Send In (cannot skip)
   - Step 2: Release (only after loading)
   - Validation: Cannot release without send-in
   - Timing: Both steps timestamped
   - Audit: Complete trail maintained

4. **Identity Mismatch Protocol**:
   - Automatic Detection: System compares names
   - Warning: Displayed to watchman
   - Manager Approval: Required to proceed
   - Rejection Option: Available if no approval
   - Logging: All mismatches logged

5. **Guest Management Rules**:
   - Pre-Registration: Guests can be pre-registered
   - Walk-In: Walk-in guests can be registered at gate
   - ID Verification: Mandatory for all guests
   - Badge: Visitor badge issued and tracked
   - Duration: Expected vs actual tracked
   - Notification: Meeting person notified on arrival

6. **Security Protocols**:
   - All entries/exits logged
   - Photos required for all pickups
   - Identity verification mandatory
   - Suspicious activity flagged
   - Manager escalation available
   - Audit trail complete

### Integration Points

- **With Dispatch**: Receives gate passes, coordinates loading
- **With Sales**: Updates delivery status
- **With Transport**: Checks in company vehicles
- **With Management**: Provides security metrics
- **With Audit**: Complete activity logging

---


## 9. FINANCE DEPARTMENT - Complete Functions

### Overview
Finance Department manages financial approvals for purchases and sales, tracks payment reminders, maintains bills/invoices, monitors bypassed orders, and provides financial performance overview.

### Key Components

#### 9.1 Finance Dashboard - Six Tabs

**Tab 1: Finance Approval**
- Purchase orders awaiting finance approval
- Sales payments awaiting finance approval
- Approval/rejection workflow

**Tab 2: Payment Reminders**
- Overdue payments
- Due today payments
- Upcoming payment reminders
- Customer payment tracking

**Tab 3: Purchase Bills**
- Approved purchase orders
- Purchase invoices
- Payment tracking
- Vendor payment history

**Tab 4: Sales Bills**
- Approved sales orders
- Sales invoices
- Customer payment tracking
- Revenue tracking

**Tab 5: Bypassed Orders**
- Sales orders that bypassed finance approval
- Direct payment orders
- Audit trail for bypassed transactions

**Tab 6: Financial Performance Overview**
- Revenue metrics
- Expense tracking
- Profit/loss analysis
- Financial KPIs

#### 9.2 Purchase Order Approval Process

**Purchase Order Review**:
- Order Information Displayed:
  - Order ID
  - Product name
  - Quantity
  - Total cost (calculated from materials)
  - Creation date
  - Payment terms
  - Required materials list
  - Extra materials list

**Material Cost Breakdown**:
- **Required Materials Section**:
  - Original materials from production
  - Each material shows:
    - Material name
    - Quantity
    - Unit cost (₹)
    - Line total (Quantity × Unit Cost)
  - Subtotal for required materials

- **Extra Materials Section**:
  - Additional materials added by Purchase
  - Each material shows:
    - Material name
    - Quantity
    - Unit cost (₹)
    - Line total
  - Subtotal for extra materials

- **Total Purchase Cost**:
  - Sum of required materials + extra materials
  - Displayed prominently in orange/yellow badge
  - Format: ₹XX,XXX.XX

**Payment Terms Display**:
- Highlighted in yellow box
- Shows selected payment term:
  - Full Payment (100%)
  - 50-50 Split Payment
  - 30-70 Split Payment
  - 70-30 Split Payment
  - Cash on Delivery (COD)
  - 50% Advance Payment
  - 30% Advance Payment
  - 30 Days Credit
  - 60 Days Credit
  - Other (custom terms)

**Approval Actions**:
1. **Approve Purchase**:
   - Button: Green "Approve Purchase"
   - Process:
     - Validates all costs are filled
     - Validates payment terms set
     - Changes status to `finance_approved`
     - Notifies Store department
     - Creates audit log
     - Adds to Purchase Bills tab
   - Result: Order sent to Store for material procurement

2. **Reject Purchase**:
   - Button: Red "Reject Purchase"
   - Process:
     - Changes status to `rejected`
     - Notifies Purchase department
     - Records rejection reason
     - Creates audit log
   - Result: Order cancelled, Purchase must revise

#### 9.3 Sales Payment Approval Process

**Sales Payment Review**:
- Order Information Displayed:
  - Sales order number
  - Customer name
  - Product name
  - Payment amount
  - Payment method
  - Payment details
  - Request date

**Payment Details Verification**:
- **Cash Payment**:
  - Cash denominations breakdown
  - Total cash amount
  - Verification notes

- **Cheque Payment**:
  - Cheque number
  - Bank name
  - Cheque date
  - Amount

- **Bank Transfer**:
  - Transaction reference
  - Bank details
  - Transfer date
  - Amount

- **UPI Payment**:
  - UPI transaction ID
  - UPI app used
  - Amount

- **Split Payment**:
  - Multiple payment methods
  - Amount breakdown per method
  - Total amount

**Payment Approval Actions**:
1. **Approve Payment**:
   - Button: Green "Approve Payment"
   - Process:
     - Validates payment details
     - Changes payment status to `finance_approved`
     - Updates sales order status
     - Notifies Sales department
     - Enables dispatch process
     - Creates audit log
     - Adds to Sales Bills tab
   - Result: Order can proceed to dispatch

2. **Reject Payment**:
   - Button: Red "Reject Payment"
   - Process:
     - Changes payment status to `rejected`
     - Notifies Sales department
     - Records rejection reason
     - Creates audit log
   - Result: Sales must collect correct payment

#### 9.4 Payment Reminders Management

**Reminder Types**:
- **Overdue**: Payment deadline passed
  - Red badge
  - High priority
  - Immediate action required

- **Due Today**: Payment due today
  - Yellow badge
  - Medium priority
  - Reminder sent to customer

- **Upcoming**: Payment due within 3 days
  - Blue badge
  - Low priority
  - Advance notification

**Reminder Information**:
- Customer name
- Order number
- Amount due
- Due date
- Days overdue (if applicable)
- Payment terms
- Contact information
- Last reminder sent date

**Reminder Actions**:
- Send reminder to customer (SMS/Email)
- Mark as contacted
- Update payment status
- Escalate to management
- Record payment received

#### 9.5 Purchase Bills Management

**Bill Information**:
- Purchase order ID
- Vendor/supplier name
- Product name
- Total amount
- Payment terms
- Approval date
- Approved by
- Payment status
- Payment date (if paid)

**Bill Tracking**:
- Pending payment
- Partially paid
- Fully paid
- Payment overdue

**Bill Actions**:
- View bill details
- Download invoice
- Record payment
- Update payment status
- Generate payment report

#### 9.6 Sales Bills Management

**Bill Information**:
- Sales order number
- Customer name
- Product name
- Total amount
- Payment method
- Approval date
- Approved by
- Payment status
- Delivery status

**Revenue Tracking**:
- Total sales amount
- Payments received
- Pending payments
- Payment collection rate

**Bill Actions**:
- View bill details
- Download invoice
- Send invoice to customer
- Record additional payments
- Generate sales report

#### 9.7 Bypassed Orders Tracking

**Bypassed Order Information**:
- Sales order number
- Customer name
- Product name
- Amount
- Payment method
- Bypass reason
- Bypass date
- Bypassed by (user)

**Bypass Scenarios**:
- Small amount orders (below threshold)
- Cash on delivery orders
- Pre-approved customers
- Emergency orders
- Management override

**Audit Trail**:
- Complete record of bypassed transactions
- User who bypassed
- Reason for bypass
- Approval chain
- Compliance tracking

#### 9.8 Financial Performance Overview

**Key Metrics**:
- **Total Revenue**:
  - Current month revenue
  - Year-to-date revenue
  - Revenue growth %

- **Total Expenses**:
  - Purchase costs
  - Operational expenses
  - Expense breakdown

- **Net Profit**:
  - Revenue - Expenses
  - Profit margin %
  - Profit trend

- **Pending Approvals**:
  - Count of pending purchase approvals
  - Count of pending sales approvals
  - Total pending amount

**Recent Transactions**:
- Latest approved purchases
- Latest approved sales
- Recent payments received
- Recent payments made

**Financial Reports**:
- Monthly financial summary
- Quarterly reports
- Annual reports
- Tax reports
- Audit reports

### Conditions and Business Rules

1. **Purchase Approval Requirements**:
   - Condition: All material costs must be > ₹0
   - Condition: Payment terms must be set
   - Condition: Total amount must be > ₹0
   - Validation: Cannot approve with missing information
   - Threshold: Large purchases may require additional approval

2. **Sales Payment Approval Requirements**:
   - Condition: Payment details must be complete
   - Condition: Payment amount must match order amount
   - Validation: Payment method must be valid
   - Verification: Cash denominations must add up correctly
   - Documentation: Payment proof required for large amounts

3. **Payment Reminder Rules**:
   - Automatic Generation: Based on payment terms
   - Reminder Schedule:
     - 3 days before due date
     - On due date
     - 1 day after due date
     - 3 days after due date
     - Weekly thereafter
   - Escalation: Overdue > 30 days escalated to management

4. **Bypass Authorization**:
   - Threshold: Orders below ₹X can be bypassed
   - Authorization: Manager approval required
   - Documentation: Bypass reason mandatory
   - Audit: All bypasses logged
   - Review: Monthly bypass report to management

5. **Financial Reporting**:
   - Frequency: Daily, weekly, monthly, quarterly, annual
   - Accuracy: All transactions must be recorded
   - Compliance: Tax regulations followed
   - Audit: Complete audit trail maintained

6. **Auto-Refresh**:
   - Frequency: Every 10 seconds
   - Updates: All tabs
   - Pauses: During user interaction

### Integration Points

- **With Purchase**: Approves purchase orders
- **With Sales**: Approves sales payments
- **With Store**: Notifies of approved purchases
- **With Dispatch**: Enables dispatch after payment approval
- **With Management**: Provides financial reports and metrics
- **With Audit**: Complete financial activity logging

---

## 10. TRANSPORT DEPARTMENT - Complete Functions

### Overview
Transport Department manages vehicle fleet, assigns vehicles to deliveries, tracks transport jobs, handles part-load orders, processes transport approvals, and coordinates with Watchman for vehicle returns.

### Key Components

#### 10.1 Transport Dashboard - Seven Tabs

**Tab 1: Transport Approvals**
- Pending transport approval requests
- Approve/reject workflow
- Demand amount negotiation

**Tab 2: Active Transport Orders**
- Orders currently in transit
- Vehicle assignments
- Delivery tracking
- Status updates

**Tab 3: Part Load Orders (Driver Details)**
- Part-load orders needing driver assignment
- Driver details form
- Company vehicle coordination

**Tab 4: After Delivery Details**
- Completed deliveries needing documentation
- LR number entry
- Loading/unloading dates
- Delivery confirmation

**Tab 5: Completed Transport Orders**
- Historical delivery records
- Delivery performance
- Completion dates

**Tab 6: Fleet Management**
- Vehicle list
- Vehicle status
- Driver information
- Vehicle maintenance

**Tab 7: Deliveries**
- All delivery requests
- Pending assignments
- In-transit tracking
- Delivery completion

#### 10.2 Transport Approval Process

**Approval Request Information**:
- Order number
- Customer name
- Product details
- Delivery address
- Distance
- Requested amount
- Request date
- Requested by (Sales person)

**Approval Actions**:
1. **Approve Transport**:
   - Button: Green "Approve"
   - Process:
     - Reviews transport request
     - Validates delivery details
     - Approves requested amount
     - Changes status to `approved`
     - Notifies Sales department
     - Creates transport job
     - Adds to Active Transport Orders
   - Result: Transport job created, ready for vehicle assignment

2. **Reject Transport**:
   - Button: Red "Reject"
   - Required Fields:
     - Demand Amount (₹): Counter-offer amount
     - Notes: Reason for rejection/negotiation
   - Process:
     - Validates demand amount > 0
     - Validates notes provided
     - Changes status to `rejected`
     - Sends counter-offer to Sales
     - Records rejection reason
     - Creates audit log
   - Result: Sales must revise or accept counter-offer

**Validation Rules**:
- Demand amount must be positive number
- Notes mandatory for rejection
- Cannot approve without reviewing details
- All fields must be filled for rejection

#### 10.3 Active Transport Orders Management

**Order Information Displayed**:
- Transport job ID
- Order number
- Customer name
- Product name
- Delivery address
- Vehicle assigned (if any)
- Driver assigned (if any)
- Current status
- Expected delivery date

**Order Statuses**:
- `pending`: Awaiting vehicle assignment
- `assigned`: Vehicle and driver assigned
- `in_transit`: On the way to customer
- `delivered`: Successfully delivered
- `failed`: Delivery failed

**Vehicle Assignment**:
- **Assign Vehicle Dialog**:
  - Transporter Name (required)
  - Vehicle Selection (dropdown of available vehicles)
  - Driver Name (auto-filled from vehicle)
  - Driver Contact (auto-filled from vehicle)
  - Expected Delivery Date

- **Assignment Process**:
  1. Select transport order
  2. Click "Assign Vehicle"
  3. Fill transporter name
  4. Select vehicle from available fleet
  5. Driver details auto-populated
  6. Set expected delivery date
  7. Submit assignment
  8. Vehicle status → `in_use`
  9. Order status → `assigned`
  10. Notification sent to driver

**Status Updates**:
- Update current location
- Update delivery status
- Add remarks/notes
- Record delays
- Update estimated arrival

**Delivery Tracking**:
- Real-time location (if GPS enabled)
- Current status
- Estimated time of arrival
- Distance remaining
- Driver contact
- Customer notifications

#### 10.4 Part Load Orders (Driver Details)

**Part Load Concept**:
- Multiple small orders combined in one vehicle
- External transport company hired
- Driver details needed for gate entry
- Watchman coordination required

**Part Load Order Information**:
- Transport job ID
- Order number
- Customer name
- Product name
- Delivery address
- Part load status

**Driver Details Form**:
- **Required Fields**:
  - Driver Name (required)
  - Driver Number (required)
  - Vehicle Number (required)
  - Company Name (required)
  - Expected Delivery Date (required)

**Driver Details Submission Process**:
1. Select part load order
2. Click "Fill Driver Details"
3. Enter driver information
4. Enter vehicle details
5. Enter transport company name
6. Set expected delivery date
7. Submit details
8. System validates all fields
9. Details sent to Watchman department
10. Watchman receives notification
11. Driver can enter gate with details
12. Order status updated

**Validation Rules**:
- All fields mandatory
- Driver number must be valid phone number
- Vehicle number format validated
- Expected delivery date cannot be in past
- Company name cannot be empty

**Watchman Integration**:
- Driver details sent to Watchman
- Watchman verifies driver on arrival
- Vehicle entry authorized
- Loading coordinated
- Exit documented

#### 10.5 After Delivery Details

**Purpose**: Document delivery completion for part-load orders

**After Delivery Form**:
- **Required Fields**:
  - LR Number (Lorry Receipt Number)
  - Loading Date
  - Unloading Date
  - Delivery Date

**LR Number**:
- Unique identifier for transport document
- Issued by transport company
- Required for legal compliance
- Used for tracking and disputes

**Date Fields**:
- **Loading Date**: When product loaded onto vehicle
- **Unloading Date**: When product unloaded at destination
- **Delivery Date**: When customer received product

**Submission Process**:
1. Delivery completed
2. Transport selects completed order
3. Click "Add After Delivery Details"
4. Enter LR number
5. Enter loading date
6. Enter unloading date
7. Enter delivery date
8. Submit details
9. System validates all fields
10. Details saved to database
11. Order marked as fully documented
12. Removed from pending list

**Edit Functionality**:
- Can edit after delivery details if needed
- Shows existing values in form
- Updates instead of creates new entry
- Maintains audit trail of changes

#### 10.6 Fleet Management

**Vehicle Information**:
- License Plate (unique identifier)
- Vehicle Type (Truck, Van, Pickup, etc.)
- Capacity (weight/volume)
- Driver Name
- Driver Phone
- Current Status
- Current Location
- Notes

**Vehicle Statuses**:
- `available`: Ready for assignment
- `in_use`: Currently on delivery
- `maintenance`: Under maintenance
- `out_of_service`: Not operational

**Add New Vehicle**:
- **Form Fields**:
  - License Plate (required, unique)
  - Vehicle Type (required)
  - Capacity (required)
  - Driver Name (required)
  - Driver Phone (required)
  - Initial Status (default: available)
  - Notes (optional)

- **Validation**:
  - License plate must be unique
  - All required fields must be filled
  - Phone number format validated
  - Capacity must be positive number

**Edit Vehicle**:
- Update vehicle details
- Change driver assignment
- Update status
- Add maintenance notes
- Update location

**Delete Vehicle**:
- Soft delete (marked as deleted)
- Cannot delete if vehicle in use
- Requires confirmation
- Audit trail maintained

**Vehicle Availability**:
- Real-time status tracking
- Available vehicles shown in assignment dropdown
- In-use vehicles excluded from assignment
- Maintenance vehicles flagged

#### 10.7 Company Vehicle Return Management

**Vehicle Return Notification**:
- Driver completes delivery
- Returns to facility
- Arrives at gate
- Watchman notified

**Watchman Check-In Process**:
1. Driver arrives at gate
2. Watchman verifies driver identity
3. Watchman verifies vehicle number
4. Watchman checks vehicle condition
5. Watchman records return time
6. Watchman clicks "Check In Vehicle"
7. System updates vehicle status → `available`
8. Transport department notified
9. Vehicle available for new assignments

**Integration with Watchman**:
- Real-time notifications
- Vehicle status updates
- Driver verification
- Return documentation
- Availability updates

#### 10.8 Delivery Management

**All Deliveries View**:
- Complete list of all transport jobs
- Filter by status
- Search by order number, customer
- Sort by date, status

**Delivery Information**:
- Transport job ID
- Order number
- Customer details
- Product details
- Delivery address
- Vehicle assigned
- Driver assigned
- Current status
- Delivery date

**Delivery Actions**:
- Assign vehicle
- Update status
- Track location
- Contact driver
- Mark as delivered
- Handle failed delivery

**Failed Delivery Handling**:
- Record failure reason
- Reschedule delivery
- Notify customer
- Notify Sales
- Reassign vehicle if needed

### Conditions and Business Rules

1. **Transport Approval Requirements**:
   - Condition: Delivery address must be complete
   - Condition: Distance must be calculated
   - Validation: Requested amount must be reasonable
   - Rejection: Demand amount and notes required
   - Approval: Creates transport job automatically

2. **Vehicle Assignment Rules**:
   - Condition: Vehicle must be available
   - Condition: Driver must be assigned to vehicle
   - Validation: Cannot assign in-use vehicle
   - Validation: Cannot assign maintenance vehicle
   - Update: Vehicle status changes to `in_use`

3. **Part Load Driver Details**:
   - Condition: All fields mandatory
   - Validation: Phone number format
   - Validation: Vehicle number format
   - Validation: Expected delivery date not in past
   - Integration: Details sent to Watchman immediately

4. **After Delivery Documentation**:
   - Condition: Delivery must be completed
   - Requirement: LR number mandatory
   - Requirement: All dates mandatory
   - Validation: Dates must be logical sequence
   - Audit: Complete delivery documentation

5. **Fleet Management Rules**:
   - Uniqueness: License plate must be unique
   - Availability: Only available vehicles assignable
   - Maintenance: Maintenance vehicles excluded
   - Deletion: Cannot delete in-use vehicles
   - Tracking: Real-time status updates

6. **Vehicle Return Process**:
   - Condition: Delivery must be completed
   - Verification: Watchman verifies driver and vehicle
   - Update: Vehicle status → `available`
   - Notification: Transport department notified
   - Availability: Vehicle immediately available for assignment

7. **Auto-Refresh**:
   - Frequency: Every 8 seconds
   - Updates: All tabs
   - Pauses: During user interaction

### Integration Points

- **With Sales**: Receives transport requests, sends approvals
- **With Dispatch**: Coordinates delivery assignments
- **With Watchman**: Sends driver details, receives vehicle check-ins
- **With Management**: Provides transport metrics and performance
- **With Finance**: Provides transport cost data
- **With Audit**: Complete transport activity logging

---

