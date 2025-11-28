# ERP SYSTEM - COMPLETE TRAINING GUIDE
## Manufacturing Company Management System

---

## TABLE OF CONTENTS

1. System Overview
2. User Roles & Access Control
3. Production Flow (Complete Cycle)
4. Department-wise Operations
5. Sales & Delivery Process
6. HR & Employee Management
7. Security & Gate Management
8. Common Workflows & Conditions

---

## 1. SYSTEM OVERVIEW

### What is this ERP System?

This is a **complete Enterprise Resource Planning (ERP) system** designed for a manufacturing company that produces machines (RCM and BCM categories).

### Key Features:
- **14 Departments** working together
- **Real-time tracking** from production to delivery
- **Multi-level approval** system
- **Complete audit trail** of all actions
- **Role-based access control**

### Technology Stack:
- **Backend**: Python Flask + MySQL
- **Frontend**: React + Vite + Tailwind CSS
- **Authentication**: JWT + Session Management

---

## 2. USER ROLES & ACCESS CONTROL

### Department Hierarchy

```
MANAGEMENT (CEO)
    ├── Can view ALL departments (read-only)
    ├── Approves HR/Manager leave requests
    └── Approves special requests (coupons, free delivery)

ADMIN
    ├── Full system access
    ├── User management
    ├── System configuration
    └── All department operations

DEPARTMENTS (13)
    ├── Production
    ├── Purchase
    ├── Store
    ├── Assembly
    ├── Finance
    ├── Showroom
    ├── Sales
    ├── Dispatch
    ├── Transport
    ├── Watchman
    ├── HR
    └── Reception
```

### Access Rules:
- Each user can **ONLY access their assigned department**
- **Admin** can access everything
- **Management** can view everything (monitoring only)
- **No cross-department access** without proper role

---


## 3. PRODUCTION FLOW - COMPLETE CYCLE

### Overview Flowchart

```
PRODUCTION → PURCHASE → STORE → ASSEMBLY → SHOWROOM → SALES → DISPATCH → TRANSPORT → WATCHMAN → DELIVERY
```

### Detailed Step-by-Step Flow

#### STEP 1: PRODUCTION DEPARTMENT
**Action**: Create Production Order

**Input Required**:
- Product Name
- Category: **RCM** or **BCM** (2 main machine types)
- Quantity (number of machines)
- Materials Required (list with quantities)

**What Happens**:
1. Production creates order
2. System automatically creates:
   - Purchase Order (for materials)
   - Assembly Order (for manufacturing)
3. Status: `pending_materials`

**Conditions**:
- Must specify valid category (RCM/BCM)
- Quantity must be > 0
- Materials list cannot be empty

---

#### STEP 2: PURCHASE DEPARTMENT
**Action**: Process Material Procurement

**Workflow**:

**2A. Accept Order**
- Purchase receives production order
- Reviews material requirements
- Status changes to: `pending_store_check`

**2B. Send to Store for Verification**
- Store checks inventory
- **TWO OUTCOMES**:

**OUTCOME 1: Sufficient Stock**
- Store allocates materials
- Status: `store_allocated`
- Materials deducted from inventory
- **Goes directly to Assembly**

**OUTCOME 2: Insufficient Stock**
- Store identifies shortages
- Status: `insufficient_stock` or `partially_allocated`
- Shortage list sent back to Purchase
- Purchase must buy missing materials

**2C. Purchase Missing Materials**
- Purchase adds unit costs for each material
- Can add extra materials if needed
- Selects payment terms (full/partial)
- Status: `pending_finance_approval`

**Conditions**:
- Cannot send to Finance with ₹0 amounts
- All materials must have unit costs
- Original requirements are locked (cannot change quantities)

---

#### STEP 3: FINANCE DEPARTMENT
**Action**: Approve Purchase Expenses

**Workflow**:
1. Reviews purchase request
2. Checks costs and payment terms
3. **TWO OUTCOMES**:

**APPROVED**:
- Status: `finance_approved`
- Expense transaction created
- Order sent back to Store

**REJECTED**:
- Status: `finance_rejected`
- Purchase must revise

**Conditions**:
- Must review all pending requests
- Cannot approve without valid amounts

---

#### STEP 4: STORE DEPARTMENT (After Finance Approval)
**Action**: Receive Materials & Allocate

**Workflow**:
1. Materials arrive from vendor
2. Store verifies purchase
3. **Material Allocation Logic**:
   - **Shortage materials**: Allocated directly to production (reserved)
   - **Extra materials**: Added to general inventory
4. Status: `store_allocated`
5. Production status: `materials_allocated`

**Conditions**:
- Must verify before allocation
- Original requirements must be fulfilled
- Excess goes to inventory for future use

---


#### STEP 5: ASSEMBLY DEPARTMENT
**Action**: Manufacture Products

**Workflow**:
1. Receives orders with status `store_allocated`
2. Starts assembly process
3. Tracks progress (0-100%)
4. Updates status:
   - `pending` → `in_progress` → `completed`

**Status Options**:
- `pending`: Not started
- `in_progress`: Currently assembling
- `paused`: Temporarily stopped
- `completed`: Assembly finished
- `sent_to_showroom`: Passed testing

**Conditions**:
- Can only start if materials allocated
- Progress must be 0-100%
- Must complete before sending to showroom

**Rework Process**:
- If machines fail testing in showroom
- Failed machines sent back as "Rework Order"
- Assembly fixes issues
- Sends back to showroom for re-testing

---

#### STEP 6: SHOWROOM DEPARTMENT
**Action**: Test & Display Products

**Workflow**:

**6A. Receive Completed Assembly**
- Gets orders with status `completed`
- Creates machine test records for each unit

**6B. Individual Machine Testing**
- Each machine gets unique number (M001, M002, etc.)
- Can add engine number
- Test each machine: **PASS** or **FAIL**

**6C. Process Test Results**

**ALL PASS**:
- All machines → Showroom display
- Status: `sent_to_showroom`
- Available for sales

**ALL FAIL**:
- All machines → Rework Order
- Sent back to Assembly
- Status: `rework`

**MIXED (Some Pass, Some Fail)**:
- Passed machines → Showroom display
- Failed machines → Rework Order
- Status: `partially_completed`

**Conditions**:
- Must test EVERY machine individually
- Cannot skip testing
- Failed machines must go to rework
- Passed machines immediately available for sale

---

#### STEP 7: SALES DEPARTMENT
**Action**: Sell Products to Customers

**Workflow**:

**7A. Create Sales Order**
- Select product from showroom
- Enter customer details:
  - Name, Contact, Address, Email
- Set quantity
- Calculate price
- Choose delivery type:
  - **Self Delivery** (customer picks up)
  - **Company Delivery** (company vehicle)
  - **Part Load** (shared transport)
  - **Free Delivery** (no charge)

**7B. Payment Processing**

**Payment Methods**:
- Cash (with denomination breakdown)
- Bank Transfer (with UTR number)
- Split Payment (Cash + Online)

**Payment Scenarios**:

**FULL PAYMENT**:
- Customer pays complete amount
- Status: `completed`
- Can proceed to dispatch

**PARTIAL PAYMENT**:
- Customer pays some amount
- Status: `partial`
- Sent to Finance for approval
- Finance verifies payment
- After approval → Dispatch

**NO PAYMENT (Finance Bypass)**:
- Sales requests bypass
- Requires Admin/Management approval
- Must provide reason
- Set payment due date

**7C. Coupon/Discount Application**
- Sales can apply coupons
- Requires Admin/Management approval
- Creates approval request
- Admin reviews and approves/rejects

**7D. Transport Cost Handling**

**For Company/Part Load/Free Delivery**:
- Sales calculates transport cost
- Can enter origin, destination, distance
- Creates Transport Approval Request
- Sent to Transport Department

**Transport Reviews**:
- **APPROVED**: Order confirmed
- **REJECTED with Demand**: Transport demands different amount
  - Sales can: Accept demand OR Renegotiate OR Modify order

**Conditions**:
- Must have customer details
- Payment method required
- Delivery type must be selected
- Cannot dispatch without payment approval

---


#### STEP 8: DISPATCH DEPARTMENT
**Action**: Prepare Orders for Delivery

**Workflow**:

**8A. Receive Orders from Sales**
- Gets orders with payment completed
- Reviews customer details
- Checks delivery type

**8B. Process by Delivery Type**

**SELF DELIVERY (Customer Pickup)**:
1. Verify customer details complete
2. Create Gate Pass
3. Status: `ready_for_load`
4. Wait for customer vehicle to arrive
5. When vehicle enters → `entered_for_pickup`
6. Load products → `loaded`
7. Send to Watchman for release

**COMPANY DELIVERY**:
1. Verify customer details
2. Enter transporter name & vehicle number
3. Create Transport Job
4. Status: `ready_for_load`
5. Load products → `loaded`
6. Send to Transport Department

**PART LOAD DELIVERY**:
1. Similar to company delivery
2. Transport fills driver details later
3. After loading → Watchman verifies
4. Transport fills LR number, dates after delivery

**FREE DELIVERY**:
- Same as company delivery
- No transport cost charged

**Conditions**:
- Customer contact & address MUST be complete
- Cannot process without customer details
- Must specify transporter for company delivery
- Gate pass required for self delivery

---

#### STEP 9: TRANSPORT DEPARTMENT
**Action**: Manage Deliveries

**Workflow**:

**9A. Approve Transport Requests**
- Reviews requests from Sales
- Checks transport cost
- **APPROVE** or **REJECT with Demand**

**9B. Manage Company Vehicles**
- Fleet management
- Assign vehicles to jobs
- Track vehicle status:
  - `available`
  - `assigned`
  - `in_transit`
  - `maintenance`

**9C. Handle Part Load Orders**
- Receives orders from Dispatch
- Fills driver details:
  - Driver name
  - Driver contact
  - Vehicle number
  - Company name
- Sends to Watchman

**9D. Update Delivery Status**
- `pending` → `assigned` → `in_transit` → `delivered`

**9E. After Delivery (Part Load)**
- Fill delivery details:
  - LR Number
  - Loading Date
  - Unloading Date
  - Actual Delivery Date

**9F. Vehicle Return**
- When vehicle returns to site
- Intimate Watchman
- Watchman checks in vehicle
- Vehicle status → `available`

**Conditions**:
- Must approve/reject transport requests
- Cannot deliver without vehicle assignment
- Must update status at each stage
- Part load requires complete delivery details

---

#### STEP 10: WATCHMAN DEPARTMENT
**Action**: Gate Security & Verification

**Workflow**:

**10A. Self Delivery Verification**
1. Customer arrives with vehicle
2. Watchman verifies:
   - Customer identity
   - Vehicle number
   - Gate pass details
3. **Send In** (for loading):
   - Takes photo of vehicle entering
   - Status: `entered_for_pickup`
4. After loading in Dispatch:
   - Status: `loaded`
5. **Release** (after loading):
   - Takes photo of loaded vehicle
   - Verifies customer again
   - Status: `verified` → `completed`

**10B. Part Load Verification**
1. Transport sends driver details
2. Driver arrives with vehicle
3. Watchman verifies:
   - Driver identity
   - Vehicle number
   - Company name
4. Send in for loading
5. After loading → Verify & Release

**10C. Company Vehicle Returns**
1. Receives intimation from Transport
2. Vehicle arrives back at site
3. Checks in vehicle
4. Updates vehicle status to `available`

**10D. Guest Management**
- Check-in visitors
- Verify identity
- Track entry/exit times
- Maintain visitor log

**Conditions**:
- Must verify identity before entry
- Photos required for verification
- Cannot release without proper verification
- Must match customer/driver details

---


## 4. DEPARTMENT-WISE DETAILED OPERATIONS

### PRODUCTION DEPARTMENT

**Main Functions**:
1. Create Production Orders
2. Track order status
3. Monitor material requirements

**Key Actions**:
- **Create Order**: Product name, category (RCM/BCM), quantity, materials
- **View Orders**: Filter by status
- **Track Progress**: Monitor through entire cycle

**Status Flow**:
```
pending_materials → materials_requested → materials_allocated → completed
```

**Important Notes**:
- Cannot modify order after creation
- Materials list is locked
- Quantity determines number of machines to produce

---

### PURCHASE DEPARTMENT

**Main Functions**:
1. Review production material requirements
2. Check store inventory
3. Purchase missing materials
4. Request finance approval

**Key Actions**:

**Accept Order**:
- Review material requirements
- Send to store for verification

**Handle Insufficient Stock**:
- Receive shortage list from store
- Add unit costs for each material
- Add extra materials if needed
- Select payment terms
- Send to Finance

**Important Fields**:
- **Original Requirements**: Locked, cannot change
- **Shortage Materials**: What needs to be purchased
- **Extra Materials**: Additional items
- **Unit Cost**: Price per unit (MUST fill)
- **Payment Terms**: Full payment / Partial payment

**Conditions**:
- Cannot send to Finance with ₹0 amounts
- All materials must have unit costs
- Original quantities cannot be changed

---

### STORE DEPARTMENT

**Main Functions**:
1. Manage inventory
2. Verify stock availability
3. Allocate materials to production
4. Receive purchased materials

**Key Actions**:

**Check Stock Availability**:
- Receives request from Purchase
- Checks each material in inventory
- **Sufficient**: Allocate & send to Assembly
- **Insufficient**: Send shortage list back to Purchase

**Receive Purchase**:
- After Finance approval
- Verify materials received
- **Allocation Logic**:
  - Shortage materials → Reserved for production
  - Extra materials → General inventory

**Inventory Management**:
- Add new items
- Update quantities
- Track stock levels
- Bulk import from Excel

**Important Notes**:
- Allocated materials are reserved
- Cannot be used for other orders
- Excess materials available for future use

---

### ASSEMBLY DEPARTMENT

**Main Functions**:
1. Manufacture products
2. Track assembly progress
3. Handle rework orders

**Key Actions**:

**Start Assembly**:
- Receive orders with materials allocated
- Update status to `in_progress`
- Track progress percentage (0-100%)

**Complete Assembly**:
- Mark as `completed`
- Send to Showroom for testing

**Handle Rework**:
- Receive failed machines from Showroom
- Fix issues
- Send back for re-testing

**Status Options**:
- `pending`: Not started
- `in_progress`: Currently working
- `paused`: Temporarily stopped
- `completed`: Finished
- `rework`: Fixing failed machines
- `sent_to_showroom`: Passed testing

**Conditions**:
- Progress must be 0-100%
- Cannot skip to completed without progress
- Must handle rework orders promptly

---

### FINANCE DEPARTMENT

**Main Functions**:
1. Approve purchase expenses
2. Verify sales payments
3. Track revenue & expenses
4. Generate financial reports

**Key Actions**:

**Approve Purchase Orders**:
- Review material costs
- Check payment terms
- Approve or Reject
- Creates expense transaction

**Verify Sales Payments**:
- Review payment details
- Check cash denominations (if cash)
- Verify UTR numbers (if online)
- Approve or Reject
- Updates payment status

**Dashboard Metrics**:
- Total Revenue
- Total Expenses
- Net Profit
- Pending Approvals

**Payment Verification Details**:
- **Cash**: Denomination breakdown
- **Online**: UTR number
- **Split**: Multiple payment methods

**Conditions**:
- Must verify all payment details
- Cannot approve without proper documentation
- Rejection removes payment transaction

**Invoice Generation**:

**Final Invoice (Tax Invoice)**:
- Generated for completed sales orders
- Available in Sales Bills tab
- Click "Download Invoice" button
- Opens in new window for printing
- Contains:
  - Company details with GSTIN
  - Customer billing and shipping details
  - Product description with accessories
  - Quantity and unit rate
  - GST breakdown (CGST 9% + SGST 9%)
  - Total amount with tax
  - Bank account details
  - Declaration and terms

**GST Calculation Method**:
- Uses **reverse GST calculation**
- Final amount (entered) = GST-inclusive amount
- System calculates:
  1. Base Amount (Taxable Value) = Final Amount ÷ 1.18
  2. CGST @ 9% = Base Amount × 0.09
  3. SGST @ 9% = Base Amount × 0.09
  4. Total = Base Amount + CGST + SGST

**Invoice Types**:

**1. Proforma Invoice** (Sales Department):
- Quotation/estimate for customer
- Before payment completion
- Shows expected amounts
- Used for customer approval

**2. Final Invoice/Tax Invoice** (Finance Department):
- Official invoice after payment
- For completed transactions
- Legal document for GST compliance
- Used for accounting and tax filing

**Invoice Updates**:
- Reflects latest order values
- Delivery type changes updated automatically
- Transport cost additions reflected
- Amount modifications shown correctly
- No caching issues - always current data

**Compliance Features**:
- GSTIN displayed (27AAACA6767K1ZN)
- HSN/SAC code included (84749000)
- State code shown (Maharashtra - 27)
- GST breakdown for tax filing
- Proper invoice numbering
- Computer-generated declaration

**Printing & Export**:
- Opens in new browser window
- Print-ready format
- Can save as PDF
- Professional layout
- Company letterhead format

**Important Notes**:
- Invoice generation uses current frontend values
- Any updates to delivery type or amounts are immediately reflected
- GST calculated backwards from final amount
- Ensures compliance with GST regulations
- Amount in words for legal clarity
- Bank details for payment processing

---

### SHOWROOM DEPARTMENT

**Main Functions**:
1. Test completed products
2. Display products for sale
3. Send failed products to rework

**Key Actions**:

**Receive from Assembly**:
- Gets completed orders
- Creates test record for each machine

**Individual Machine Testing**:
- Test each machine separately
- Assign machine number (M001, M002...)
- Add engine number (optional)
- Mark as PASS or FAIL
- Add notes

**Process Results**:
- **All Pass**: Add to showroom display
- **All Fail**: Send entire lot to rework
- **Mixed**: Pass to display, Fail to rework

**Display Management**:
- Track displayed products
- Monitor machine breakdown
- Available for sales

**Conditions**:
- MUST test every machine
- Cannot skip testing
- Failed machines MUST go to rework
- Passed machines immediately available

---


### SALES DEPARTMENT

**Main Functions**:
1. Sell showroom products
2. Process payments
3. Handle delivery arrangements
4. Manage customer relationships

**Key Actions**:

**Create Sales Order**:
- Select product from showroom
- Enter customer details (Name, Contact, Address, Email)
- Set quantity
- Calculate total amount
- Apply discount (if any)
- Choose delivery type
- Select payment method

**Delivery Types**:
1. **Self Delivery**: Customer picks up
   - No transport cost
   - Customer brings vehicle
   - Gate pass issued

2. **Company Delivery**: Company vehicle delivers
   - Transport cost calculated
   - Requires transport approval
   - Company vehicle assigned

3. **Part Load**: Shared transport
   - Transport cost calculated
   - Requires transport approval
   - Third-party transporter

4. **Free Delivery**: No charge delivery
   - Company bears cost
   - Requires Admin approval
   - Company vehicle used

**Payment Processing**:

**Full Payment**:
- Customer pays complete amount
- Status: `completed`
- Ready for dispatch

**Partial Payment**:
- Customer pays partial amount
- Status: `partial`
- Sent to Finance for verification
- After Finance approval → Dispatch

**Finance Bypass**:
- No payment at time of sale
- Requires Admin/Management approval
- Must provide reason
- Set payment due date

**Coupon Application**:
- Apply discount coupon
- Requires Admin/Management approval
- Creates approval request
- Admin reviews and decides

**Transport Cost Handling**:
- For Company/Part Load/Free delivery
- Calculate transport cost
- Enter origin, destination, distance
- Send to Transport for approval
- Transport can approve or reject with demand

**Change Delivery Type After Payment**:
- If customer paid for self delivery
- Later wants company delivery
- Add transport cost
- Payment status → `partial`
- Requires transport approval

**Sales Targets**:
- Monthly targets set by Admin
- Track achievement percentage
- View personal dashboard
- Monitor performance

**Conditions**:
- Customer details MUST be complete
- Payment method required
- Delivery type must be selected
- Transport approval needed for company/part load
- Cannot dispatch without payment approval

**Invoice Generation**:

**Proforma Invoice**:
- Generated for sales orders
- Click "Download Invoice" button
- Opens in new window for printing
- Contains:
  - Company details (ALANKAR ENGINEERING EQUIPMENTS)
  - Customer details (Name, Address, GSTIN)
  - Product details with accessories
  - Quantity and pricing
  - GST breakdown (9% CGST + 9% SGST)
  - Bank details for payment
  - Total amount in words

**GST Calculation**:
- Invoice uses **GST-inclusive pricing**
- Final amount entered = Amount with GST included
- System calculates backwards:
  - Base Amount = Final Amount ÷ 1.18
  - CGST (9%) = Base Amount × 0.09
  - SGST (9%) = Base Amount × 0.09
  - Total = Base Amount + CGST + SGST (equals Final Amount)

**Example**:
- Final Amount (GST inclusive): ₹118,000
- Base Amount (Taxable Value): ₹100,000
- CGST @ 9%: ₹9,000
- SGST @ 9%: ₹9,000
- Total: ₹118,000 ✓

**Invoice Features**:
- Professional format matching company standards
- Includes HSN/SAC code (84749000)
- Payment terms displayed
- Delivery method shown
- Computer-generated, no signature required
- Ready for printing/PDF export

**Important Notes**:
- Invoice reflects current order values
- Any changes to delivery type or amount are immediately reflected
- GST breakdown shown separately for compliance
- Amount in words for clarity
- Bank details included for payment reference

---

### DISPATCH DEPARTMENT

**Main Functions**:
1. Prepare orders for delivery
2. Coordinate with Transport/Watchman
3. Manage loading operations
4. Track dispatch status

**Key Actions**:

**Process Orders**:
- Receive from Sales (payment completed)
- Verify customer details
- Check delivery type

**Self Delivery Process**:
1. Verify customer contact & address
2. Create gate pass
3. Status: `ready_for_load`
4. Wait for customer vehicle
5. Customer arrives → `entered_for_pickup`
6. Load products → `loaded`
7. Send to Watchman for release

**Company Delivery Process**:
1. Verify customer details
2. Enter transporter name
3. Enter vehicle number
4. Create transport job
5. Status: `ready_for_load`
6. Load products → `loaded`
7. Send to Transport

**Part Load Process**:
1. Similar to company delivery
2. Transport fills driver details
3. Load products
4. Send to Watchman for verification
5. After delivery, Transport fills LR details

**Loading Queues**:
- **Self Delivery Queue**: Customers waiting for loading
- **Part Load Queue**: Part load orders ready
- **Company Vehicle Queue**: Company deliveries ready

**Conditions**:
- Customer details MUST be complete
- Cannot process without contact & address
- Must specify transporter for company delivery
- Gate pass required for self delivery
- Must update status at each stage

---

### TRANSPORT DEPARTMENT

**Main Functions**:
1. Approve transport requests
2. Manage company vehicles
3. Assign deliveries
4. Track delivery status
5. Handle part load logistics

**Key Actions**:

**Approve Transport Requests**:
- Review from Sales
- Check transport cost
- **Approve**: Order confirmed
- **Reject with Demand**: Specify required amount
  - Sales can accept or renegotiate

**Fleet Management**:
- Add/Edit/Delete vehicles
- Track vehicle status
- Assign drivers
- Monitor availability

**Vehicle Status**:
- `available`: Ready for assignment
- `assigned`: Assigned to job
- `in_transit`: Currently delivering
- `maintenance`: Under repair

**Assign Deliveries**:
- Select available vehicle
- Assign to transport job
- Update status to `assigned`
- Send for loading

**Update Delivery Status**:
- `pending` → `assigned` → `in_transit` → `delivered`
- Track real-time progress

**Part Load Handling**:
- Receive from Dispatch
- Fill driver details:
  - Driver name
  - Driver contact
  - Vehicle number
  - Company name
- Send to Watchman
- After delivery, fill:
  - LR Number
  - Loading Date
  - Unloading Date
  - Actual Delivery Date

**Vehicle Return**:
- When vehicle returns
- Intimate Watchman
- Watchman checks in
- Status → `available`

**Conditions**:
- Must approve/reject all requests
- Cannot deliver without vehicle
- Must update status at each stage
- Part load requires complete details
- Vehicle must be available for assignment

---


### WATCHMAN DEPARTMENT

**Main Functions**:
1. Gate security & verification
2. Manage customer pickups
3. Verify part load deliveries
4. Check in company vehicles
5. Visitor management

**Key Actions**:

**Self Delivery Verification**:

**Step 1: Customer Arrives**
- Customer comes with vehicle
- Watchman checks gate pass
- Verifies customer identity
- Checks vehicle number

**Step 2: Send In for Loading**
- Take photo of vehicle entering
- Status: `entered_for_pickup`
- Customer goes to loading area

**Step 3: After Loading (Dispatch)**
- Dispatch loads products
- Status: `loaded`
- Customer returns to gate

**Step 4: Release**
- Verify customer identity again
- Take photo of loaded vehicle
- Check products loaded
- Release vehicle
- Status: `verified` → `completed`

**Part Load Verification**:
- Receive driver details from Transport
- Driver arrives with vehicle
- Verify driver identity
- Check vehicle number
- Send in for loading
- After loading → Verify & Release

**Company Vehicle Check-in**:
- Receive intimation from Transport
- Vehicle returns to site
- Check in vehicle
- Update status to `available`

**Guest Management**:
- Check-in visitors
- Verify ID proof
- Record entry time
- Track meeting person
- Check-out when leaving
- Maintain visitor log

**Identity Verification**:
- Check customer name
- Verify contact number
- Match vehicle number
- Confirm gate pass details

**Photo Requirements**:
- **Send In Photo**: Vehicle entering
- **After Loading Photo**: Loaded vehicle leaving

**Conditions**:
- MUST verify identity before entry
- Photos required for verification
- Cannot release without proper verification
- Must match customer/driver details
- Identity mismatch → Reject entry

---

### HR DEPARTMENT

**Main Functions**:
1. Employee management
2. Attendance tracking
3. Leave management
4. Payroll processing
5. Recruitment
6. Tour intimations

**Key Actions**:

**Employee Management**:
- Add new employees
- Update employee details
- Manage departments & designations
- Track joining dates
- Set salary (daily/monthly/hourly)
- Assign managers
- Upload employee photos (for face recognition)

**Attendance Tracking**:
- Record daily attendance
- Mark status: Present, Absent, Late, Half Day
- Track check-in/check-out times
- Calculate hours worked
- View attendance summary

**Leave Management**:

**Leave Types**:
- Casual Leave (12 days/year)
- Sick Leave (12 days/year)
- Earned Leave (21 days/year)
- Maternity/Paternity Leave

**Leave Approval Flow**:

**Regular Employees**:
1. Employee requests leave
2. Manager approves/rejects
3. HR gives final approval
4. Status: `pending` → `manager_approved` → `approved`

**HR/Manager Employees**:
1. Employee requests leave
2. Goes directly to Management
3. Management approves/rejects
4. Status: `pending` → `approved`

**Payroll Processing**:

**Salary Types**:
- **Daily**: Salary per day × Days worked
- **Monthly**: Fixed monthly salary
- **Hourly**: Hourly rate × Hours worked

**Generate Payroll**:
- Select employee
- Set pay period (start/end date)
- Enter working days & attended days
- Calculate:
  - Gross Salary
  - Allowances
  - Deductions
  - Net Salary
- Generate payslip (printable)

**Process Payment**:
- Mark as `paid`
- Record payment date

**Recruitment**:
- Post job openings
- Receive applications
- Schedule interviews
- Track candidate status
- Maintain candidate pool

**Tour Intimations**:
- Employees request business trips
- Enter destination, dates, purpose
- Estimated cost & advance required
- Management approves
- HR gives final approval

**Conditions**:
- Leave balance tracked automatically
- Cannot approve leave without manager approval (for regular employees)
- Payroll requires attendance data
- Tour requires management approval first

---

### RECEPTION DEPARTMENT

**Main Functions**:
1. View guest/visitor information
2. Monitor scheduled visits
3. Track visitor status

**Key Actions**:
- View all guests
- Filter by date/status
- View today's visitors
- Check guest details
- Monitor check-in/check-out

**Access Level**:
- **READ-ONLY** access
- Cannot create/edit guests
- Guest management done by Watchman

**Conditions**:
- Can only view information
- Cannot modify any data
- Helps in visitor coordination

---


## 5. COMPLETE SALES & DELIVERY WORKFLOWS

### WORKFLOW 1: SELF DELIVERY (Customer Pickup)

```
SALES → DISPATCH → WATCHMAN → CUSTOMER
```

**Step-by-Step**:

1. **Sales Creates Order**
   - Customer details entered
   - Delivery type: "Self Delivery"
   - Payment processed (full or partial)
   - If partial → Finance approves
   - Status: `confirmed`

2. **Sales Sends to Dispatch**
   - Click "Send to Dispatch"
   - Can enter driver details (optional)
   - Gate pass created automatically

3. **Dispatch Processes**
   - Verifies customer details
   - Status: `ready_for_load`
   - Waits for customer vehicle

4. **Customer Arrives at Gate**
   - Watchman verifies identity
   - Checks gate pass
   - Takes photo of vehicle
   - Sends in for loading
   - Status: `entered_for_pickup`

5. **Dispatch Loads Products**
   - Loads products in customer vehicle
   - Marks as `loaded`

6. **Watchman Releases**
   - Customer returns to gate
   - Watchman verifies again
   - Takes photo of loaded vehicle
   - Releases vehicle
   - Status: `completed`

**Conditions**:
- Customer MUST have contact & address
- Payment must be approved
- Identity verification required twice
- Photos mandatory

---

### WORKFLOW 2: COMPANY DELIVERY

```
SALES → TRANSPORT APPROVAL → DISPATCH → TRANSPORT → WATCHMAN → DELIVERY
```

**Step-by-Step**:

1. **Sales Creates Order**
   - Customer details entered
   - Delivery type: "Company Delivery"
   - Calculate transport cost
   - Payment processed
   - Status: `pending_transport_approval`

2. **Transport Reviews**
   - Checks transport cost
   - **Option A: Approve**
     - Status: `confirmed`
     - Proceeds to dispatch
   - **Option B: Reject with Demand**
     - Specifies required amount
     - Sent back to Sales

3. **Sales Handles Rejection**
   - **Option A: Accept Demand**
     - Updates transport cost
     - Payment status → `partial`
     - Customer pays additional amount
     - Finance approves
     - Proceeds to dispatch
   - **Option B: Renegotiate**
     - Proposes different amount
     - Sent back to Transport
   - **Option C: Modify Order**
     - Changes delivery type or cancels

4. **Dispatch Processes**
   - Verifies customer details
   - Enters transporter name & vehicle
   - Creates transport job
   - Status: `ready_for_load`

5. **Dispatch Loads**
   - Loads products in company vehicle
   - Status: `loaded`
   - Sends to Transport

6. **Transport Delivers**
   - Assigns vehicle
   - Updates status: `in_transit`
   - Delivers to customer
   - Updates status: `delivered`
   - Status: `completed`

7. **Vehicle Returns**
   - Transport intimates Watchman
   - Watchman checks in vehicle
   - Vehicle status: `available`

**Conditions**:
- Transport approval required
- Must handle rejection properly
- Additional payment if cost increased
- Vehicle must be available
- Must update status at each stage

---

### WORKFLOW 3: PART LOAD DELIVERY

```
SALES → TRANSPORT APPROVAL → DISPATCH → TRANSPORT → WATCHMAN → DELIVERY → TRANSPORT (LR Details)
```

**Step-by-Step**:

1. **Sales Creates Order**
   - Delivery type: "Part Load"
   - Calculate transport cost
   - Payment processed
   - Status: `pending_transport_approval`

2. **Transport Approves**
   - Reviews and approves
   - Status: `confirmed`

3. **Dispatch Processes**
   - Creates transport job
   - Status: `ready_for_load`

4. **Transport Fills Driver Details**
   - Driver name
   - Driver contact
   - Vehicle number
   - Company name (transporter)
   - Sends to Watchman

5. **Driver Arrives at Gate**
   - Watchman verifies driver
   - Sends in for loading
   - Status: `entered_for_pickup`

6. **Dispatch Loads**
   - Loads products
   - Status: `loaded`

7. **Watchman Releases**
   - Verifies driver
   - Releases vehicle
   - Status: `verified`

8. **Transport Delivers**
   - Updates status: `in_transit`
   - Delivers to customer
   - Status: `delivered`

9. **Transport Fills After-Delivery Details**
   - LR Number
   - Loading Date
   - Unloading Date
   - Actual Delivery Date
   - Status: `completed`

**Conditions**:
- Transport approval required
- Driver details mandatory
- Watchman verification required
- LR details must be filled after delivery
- All dates must be provided

---

### WORKFLOW 4: FREE DELIVERY

```
SALES → ADMIN APPROVAL → DISPATCH → TRANSPORT → DELIVERY
```

**Step-by-Step**:

1. **Sales Creates Order**
   - Delivery type: "Free Delivery"
   - Transport cost: ₹0
   - Creates approval request
   - Sent to Admin/Management

2. **Admin Approves**
   - Reviews request
   - Approves or rejects
   - If approved → Status: `confirmed`

3. **Rest of Process**
   - Same as Company Delivery
   - No transport cost charged
   - Company bears the cost

**Conditions**:
- Requires Admin/Management approval
- No charge to customer
- Company vehicle used
- Must have valid reason

---


## 6. SPECIAL WORKFLOWS & CONDITIONS

### WORKFLOW: CHANGE DELIVERY TYPE AFTER PAYMENT

**Scenario**: Customer paid for self delivery, now wants company delivery

**Step-by-Step**:

1. **Initial Order**
   - Delivery type: Self Delivery
   - Payment: Completed (₹100,000)
   - Status: `completed`

2. **Customer Changes Mind**
   - Wants company delivery instead
   - Sales calculates transport cost (₹5,000)

3. **Sales Changes Delivery Type**
   - Updates to "Company Delivery"
   - Adds transport cost
   - Final amount: ₹105,000
   - Amount paid: ₹100,000
   - Balance: ₹5,000
   - Payment status: `partial`
   - Order status: `pending_transport_approval`

4. **Transport Approves**
   - Reviews transport cost
   - Approves or rejects with demand

5. **Customer Pays Balance**
   - Pays additional ₹5,000
   - Sent to Finance for approval

6. **Finance Approves**
   - Verifies payment
   - Payment status: `completed`

7. **Proceeds to Dispatch**
   - Normal company delivery process

**Conditions**:
- Can only change if payment completed
- Must add transport cost
- Requires transport approval
- Customer must pay additional amount
- Finance must verify additional payment

---

### WORKFLOW: COUPON/DISCOUNT APPLICATION

**Step-by-Step**:

1. **Sales Applies Coupon**
   - Enter coupon code
   - Enter discount amount
   - Provide reason
   - Creates approval request
   - Sent to Admin/Management

2. **Admin Reviews**
   - Checks coupon validity
   - Reviews discount amount
   - Checks customer details
   - **Approve** or **Reject**

3. **If Approved**
   - Discount applied
   - Final amount reduced
   - Order proceeds normally

4. **If Rejected**
   - Discount not applied
   - Sales notified
   - Must proceed without discount

**Conditions**:
- Requires Admin/Management approval
- Must provide valid reason
- Cannot proceed without approval
- Discount affects final amount

---

### WORKFLOW: FINANCE BYPASS (No Payment)

**Scenario**: Customer wants to take product without immediate payment

**Step-by-Step**:

1. **Sales Creates Order**
   - Normal order creation
   - No payment processed
   - Selects "Finance Bypass"
   - Provides reason
   - Sets payment due date
   - Creates approval request

2. **Admin/Management Reviews**
   - Checks customer creditworthiness
   - Reviews reason
   - Checks due date
   - **Approve** or **Reject**

3. **If Approved**
   - Order confirmed without payment
   - Payment status: `pending`
   - Can proceed to dispatch
   - Payment tracked separately

4. **If Rejected**
   - Cannot proceed without payment
   - Customer must pay

**Conditions**:
- Requires Admin/Management approval
- Must provide valid reason
- Must set payment due date
- High-risk transaction
- Tracked separately

---

### WORKFLOW: REWORK PROCESS

**Scenario**: Machines fail testing in showroom

**Step-by-Step**:

1. **Showroom Tests Machines**
   - Tests each machine individually
   - Some machines fail

2. **Create Rework Order**
   - Failed machines grouped
   - Rework order created
   - Sent to Assembly
   - Status: `pending`

3. **Assembly Fixes Issues**
   - Receives rework order
   - Fixes failed machines
   - Updates status: `in_progress`
   - Completes fixes
   - Status: `completed`

4. **Return to Showroom**
   - Machines sent back for re-testing
   - Machine status: `pending`
   - Showroom tests again

5. **Re-testing**
   - Test fixed machines
   - **Pass**: Add to showroom display
   - **Fail**: Create new rework order

**Conditions**:
- Failed machines MUST go to rework
- Cannot skip rework process
- Must re-test after rework
- Passed machines immediately available
- Original lot tracking maintained

---

### WORKFLOW: PARTIAL STOCK ALLOCATION

**Scenario**: Store has some materials but not all

**Step-by-Step**:

1. **Purchase Sends to Store**
   - Requests stock check
   - Materials list provided

2. **Store Checks Inventory**
   - Material A: Available (100 units)
   - Material B: Insufficient (need 50, have 20)
   - Material C: Not available (need 30, have 0)

3. **Store Allocates Available**
   - Allocates Material A (100 units)
   - Allocates Material B (20 units)
   - Status: `partially_allocated`

4. **Shortage List Created**
   - Material B: Need 30 more
   - Material C: Need 30
   - Sent back to Purchase

5. **Purchase Buys Shortage**
   - Adds unit costs
   - Sends to Finance
   - After approval → Store receives

6. **Store Completes Allocation**
   - Receives purchased materials
   - Allocates remaining:
     - Material B: 30 units
     - Material C: 30 units
   - Status: `store_allocated`
   - Sends to Assembly

**Conditions**:
- Partial allocation allowed
- Shortage must be purchased
- Cannot proceed to assembly until complete
- Original requirements tracked

---


## 7. STATUS REFERENCE GUIDE

### Production Order Status

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `pending_materials` | Waiting for materials | Purchase to process |
| `materials_requested` | Purchase accepted | Store to check stock |
| `partially_allocated` | Some materials allocated | Purchase to buy shortage |
| `materials_allocated` | All materials ready | Assembly to start |
| `completed` | Production finished | - |

---

### Purchase Order Status

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `pending_request` | Just created | Purchase to accept |
| `pending_store_check` | Sent to store | Store to verify stock |
| `insufficient_stock` | Stock not available | Purchase to buy materials |
| `partially_allocated` | Some stock available | Purchase to buy shortage |
| `pending_finance_approval` | Waiting for finance | Finance to approve |
| `finance_approved` | Finance approved | Store to receive materials |
| `finance_rejected` | Finance rejected | Purchase to revise |
| `store_allocated` | Materials allocated | Assembly can start |

---

### Assembly Order Status

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `pending` | Not started | Assembly to start |
| `in_progress` | Currently assembling | Assembly to continue |
| `paused` | Temporarily stopped | Assembly to resume |
| `completed` | Assembly finished | Showroom to test |
| `rework` | Failed testing | Assembly to fix |
| `partially_completed` | Some passed, some failed | Mixed handling |
| `sent_to_showroom` | All passed testing | Available for sale |

---

### Machine Test Result Status

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `pending` | Not tested yet | Showroom to test |
| `pass` | Passed testing | Add to showroom |
| `fail` | Failed testing | Send to rework |

---

### Sales Order Status

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `pending` | Just created | Process payment |
| `pending_transport_approval` | Waiting for transport | Transport to approve |
| `confirmed` | Order confirmed | Send to dispatch |
| `delivered` | Delivered to customer | Completed |
| `cancelled` | Order cancelled | - |

---

### Payment Status

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `pending` | No payment yet | Customer to pay |
| `partial` | Partial payment | Finance to verify |
| `pending_finance_approval` | Waiting for finance | Finance to approve |
| `completed` | Fully paid | Can dispatch |

---

### Dispatch Request Status

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `pending` | Just received | Dispatch to process |
| `customer_details_required` | Missing details | Sales to provide |
| `ready_for_load` | Ready for loading | Wait for vehicle |
| `entered_for_pickup` | Vehicle entered | Dispatch to load |
| `loaded` | Products loaded | Watchman to release |
| `ready_for_pickup` | Ready for pickup | Customer to arrive |
| `in_transit` | Being delivered | Transport to deliver |
| `completed` | Delivered | - |
| `cancelled` | Cancelled | - |

---

### Transport Job Status

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `pending` | Not assigned | Transport to assign |
| `assigned` | Vehicle assigned | Start delivery |
| `in_transit` | Currently delivering | Complete delivery |
| `delivered` | Delivered | Update status |
| `cancelled` | Cancelled | - |

---

### Gate Pass Status

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `pending` | Waiting for customer | Customer to arrive |
| `verified` | Customer verified | Released |
| `released` | Vehicle released | Completed |

---

### Vehicle Status

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `available` | Ready for use | Can assign |
| `assigned` | Assigned to job | Deliver |
| `in_transit` | Currently delivering | Complete delivery |
| `maintenance` | Under repair | Fix and return |
| `out_of_service` | Not usable | - |

---

### Leave Status

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `pending` | Waiting for approval | Manager to approve |
| `manager_approved` | Manager approved | HR to approve |
| `approved` | Fully approved | Employee can take leave |
| `rejected` | Rejected | Cannot take leave |
| `manager_rejected` | Manager rejected | Cannot proceed |

---

### Guest Status

| Status | Meaning | Next Action |
|--------|---------|-------------|
| `scheduled` | Visit scheduled | Wait for arrival |
| `checked_in` | Guest arrived | Meeting in progress |
| `checked_out` | Guest left | Completed |
| `cancelled` | Visit cancelled | - |

---


## 8. COMMON ISSUES & SOLUTIONS

### Issue 1: Cannot Send to Finance - ₹0 Amount

**Problem**: Purchase cannot send order to Finance

**Cause**: Materials have ₹0 unit cost

**Solution**:
1. Go to Purchase Order
2. Fill unit cost for EACH material
3. Check extra materials also have costs
4. Ensure no material has ₹0 cost
5. Then send to Finance

---

### Issue 2: Customer Details Required

**Problem**: Dispatch cannot process order

**Cause**: Missing customer contact or address

**Solution**:
1. Go to Dispatch
2. Click "Update Customer Details"
3. Fill contact number
4. Fill complete address
5. Save and process

---

### Issue 3: Identity Mismatch at Gate

**Problem**: Watchman cannot verify customer

**Cause**: Customer name/vehicle doesn't match gate pass

**Solution**:
1. Verify customer identity carefully
2. Check gate pass details
3. Match vehicle number
4. If mismatch → Reject entry
5. Contact Dispatch for clarification

---

### Issue 4: Payment Not Approved

**Problem**: Order stuck in Finance

**Cause**: Payment details incomplete or incorrect

**Solution**:
1. Check payment method
2. For cash: Verify denomination breakdown
3. For online: Check UTR number
4. For split: Verify all payment methods
5. Finance to approve after verification

---

### Issue 5: Transport Rejection

**Problem**: Transport rejects with higher demand

**Cause**: Transport cost too low

**Solution**:
**Option A**: Accept Demand
- Update transport cost
- Customer pays additional amount
- Finance approves
- Proceed to dispatch

**Option B**: Renegotiate
- Propose different amount
- Send back to Transport
- Wait for response

**Option C**: Modify Order
- Change delivery type
- Or cancel order

---

### Issue 6: Machine Testing Incomplete

**Problem**: Cannot process assembly order

**Cause**: Some machines not tested

**Solution**:
1. Go to Showroom
2. View machine list
3. Test ALL pending machines
4. Mark each as Pass or Fail
5. Then process order

---

### Issue 7: Rework Order Not Visible

**Problem**: Assembly cannot see rework order

**Cause**: Status not updated correctly

**Solution**:
1. Check Rework Orders tab
2. Filter by status: Pending
3. Start rework
4. Update status to In Progress
5. Complete and send back

---

### Issue 8: Vehicle Not Available

**Problem**: Cannot assign delivery

**Cause**: All vehicles assigned or in maintenance

**Solution**:
1. Check vehicle status
2. Wait for vehicle to return
3. Or use external transporter
4. Update vehicle status after return

---

### Issue 9: Leave Not Approved

**Problem**: Leave request stuck

**Cause**: Waiting for manager approval

**Solution**:
**For Regular Employees**:
1. Manager must approve first
2. Then HR approves
3. Two-level approval required

**For HR/Manager Employees**:
1. Goes directly to Management
2. Management approves
3. Single-level approval

---

### Issue 10: Partial Payment Stuck

**Problem**: Order not proceeding after partial payment

**Cause**: Finance approval pending

**Solution**:
1. Wait for Finance to verify
2. Finance checks payment details
3. Finance approves
4. Then can proceed to dispatch

---


## 9. BEST PRACTICES

### For All Users

1. **Always Fill Complete Information**
   - Don't leave required fields empty
   - Provide accurate data
   - Double-check before submitting

2. **Update Status Promptly**
   - Update status as soon as action completed
   - Don't delay status updates
   - Keeps everyone informed

3. **Verify Before Approving**
   - Check all details carefully
   - Verify amounts and quantities
   - Ensure accuracy

4. **Communicate Issues**
   - Report problems immediately
   - Don't wait for issues to escalate
   - Use notes field for clarifications

5. **Track Your Work**
   - Monitor pending tasks
   - Check dashboard regularly
   - Complete tasks on time

---

### For Production Department

1. **Accurate Material Lists**
   - List all required materials
   - Specify correct quantities
   - Include all components

2. **Choose Correct Category**
   - RCM or BCM
   - Affects entire production flow
   - Cannot change later

3. **Realistic Quantities**
   - Based on capacity
   - Consider material availability
   - Plan ahead

---

### For Purchase Department

1. **Always Fill Unit Costs**
   - Never leave costs as ₹0
   - Get accurate quotes
   - Include all charges

2. **Verify Store Feedback**
   - Check shortage list carefully
   - Confirm quantities needed
   - Don't over-order

3. **Choose Correct Payment Terms**
   - Full payment or partial
   - Based on vendor terms
   - Affects finance approval

---

### For Store Department

1. **Accurate Stock Checks**
   - Count carefully
   - Don't estimate
   - Verify before allocating

2. **Proper Allocation**
   - Reserve for specific orders
   - Don't mix allocations
   - Track carefully

3. **Timely Updates**
   - Update inventory immediately
   - Record all movements
   - Maintain accuracy

---

### For Assembly Department

1. **Track Progress Accurately**
   - Update percentage regularly
   - Don't jump to 100% suddenly
   - Realistic progress tracking

2. **Quality Focus**
   - Ensure proper assembly
   - Check quality at each stage
   - Reduce rework

3. **Handle Rework Promptly**
   - Fix issues quickly
   - Don't delay rework orders
   - Maintain quality standards

---

### For Showroom Department

1. **Test Every Machine**
   - Individual testing mandatory
   - Don't skip any machine
   - Thorough testing

2. **Accurate Test Results**
   - Mark correctly as Pass/Fail
   - Add detailed notes
   - Record engine numbers

3. **Proper Segregation**
   - Separate passed and failed
   - Send failed to rework immediately
   - Display passed machines

---

### For Sales Department

1. **Complete Customer Details**
   - Full name, contact, address
   - Verify before submitting
   - Accurate information

2. **Clear Delivery Type**
   - Explain options to customer
   - Choose correctly
   - Cannot change easily later

3. **Accurate Payment Recording**
   - Record exact amounts
   - Specify payment method
   - Keep proper documentation

4. **Transport Cost Calculation**
   - Calculate accurately
   - Consider distance and vehicle type
   - Get transport approval

---

### For Dispatch Department

1. **Verify Customer Details**
   - Check contact and address
   - Confirm before processing
   - Update if missing

2. **Proper Loading**
   - Load carefully
   - Secure products
   - Update status immediately

3. **Coordinate with Transport/Watchman**
   - Clear communication
   - Timely updates
   - Track progress

---

### For Transport Department

1. **Fair Cost Assessment**
   - Realistic transport costs
   - Consider all factors
   - Don't overcharge

2. **Vehicle Maintenance**
   - Keep vehicles in good condition
   - Regular maintenance
   - Update status accurately

3. **Timely Deliveries**
   - Plan routes efficiently
   - Update status at each stage
   - Complete deliveries on time

4. **Complete Documentation**
   - Fill all LR details
   - Record dates accurately
   - Maintain proper records

---

### For Watchman Department

1. **Strict Verification**
   - Always verify identity
   - Check all details
   - Don't skip verification

2. **Proper Documentation**
   - Take clear photos
   - Record entry/exit times
   - Maintain gate pass records

3. **Security First**
   - Don't compromise security
   - Report suspicious activity
   - Follow protocols

---

### For Finance Department

1. **Thorough Verification**
   - Check all payment details
   - Verify amounts
   - Ensure accuracy

2. **Timely Approvals**
   - Don't delay approvals
   - Process requests promptly
   - Clear communication if issues

3. **Proper Documentation**
   - Maintain transaction records
   - Track all payments
   - Generate reports regularly

---

### For HR Department

1. **Accurate Employee Records**
   - Keep data updated
   - Verify information
   - Maintain confidentiality

2. **Fair Leave Management**
   - Process requests fairly
   - Check leave balance
   - Timely approvals

3. **Accurate Payroll**
   - Verify attendance data
   - Calculate correctly
   - Process on time

---


## 10. QUICK REFERENCE - KEY POINTS

### Production Flow Summary

```
1. Production creates order (RCM/BCM + Materials)
2. Purchase accepts → Store checks stock
3. If insufficient → Purchase buys → Finance approves
4. Store receives & allocates → Assembly manufactures
5. Showroom tests each machine individually
6. Passed machines → Display, Failed → Rework
7. Sales sells → Payment processed
8. Dispatch prepares → Transport/Watchman handles
9. Delivery completed
```

---

### Critical Rules

1. **Cannot skip testing** - Every machine must be tested
2. **Cannot send to Finance with ₹0** - All costs must be filled
3. **Cannot dispatch without payment approval** - Finance must verify
4. **Cannot release without verification** - Watchman must verify identity
5. **Cannot change original requirements** - Material quantities locked
6. **Cannot proceed without customer details** - Contact & address mandatory
7. **Failed machines must go to rework** - No exceptions
8. **Two-level approval for regular employees** - Manager then HR
9. **Transport approval required** - For company/part load delivery
10. **Photos mandatory at gate** - Entry and exit photos required

---

### Important Conditions

**Production**:
- Category must be RCM or BCM
- Materials list cannot be empty
- Quantity must be > 0

**Purchase**:
- Unit costs mandatory
- Cannot modify original quantities
- Payment terms required

**Store**:
- Must verify before allocating
- Shortage materials reserved for production
- Extra materials to general inventory

**Assembly**:
- Progress 0-100%
- Cannot skip to completed
- Rework orders must be handled

**Showroom**:
- Individual machine testing mandatory
- Pass/Fail for each machine
- Mixed results handled separately

**Sales**:
- Customer details complete
- Payment method required
- Delivery type must be selected
- Transport approval for company/part load

**Dispatch**:
- Customer contact & address mandatory
- Gate pass for self delivery
- Transporter details for company delivery

**Transport**:
- Must approve/reject requests
- Vehicle must be available
- Status updates at each stage
- LR details for part load

**Watchman**:
- Identity verification mandatory
- Photos required
- Cannot skip verification
- Match all details

**Finance**:
- Verify all payment details
- Check documentation
- Timely approvals

**HR**:
- Leave balance tracking
- Two-level approval for regular employees
- Accurate payroll calculation

---

### Status Progression Examples

**Production Order**:
```
pending_materials → materials_requested → materials_allocated → completed
```

**Purchase Order**:
```
pending_request → pending_store_check → insufficient_stock → 
pending_finance_approval → finance_approved → store_allocated
```

**Assembly Order**:
```
pending → in_progress → completed → sent_to_showroom
```

**Sales Order**:
```
pending → pending_transport_approval → confirmed → delivered
```

**Dispatch Request**:
```
pending → ready_for_load → entered_for_pickup → loaded → completed
```

---

### Contact Points Between Departments

**Production ↔ Purchase**:
- Production creates order
- Purchase receives material requirements

**Purchase ↔ Store**:
- Purchase sends for stock check
- Store sends shortage list back

**Purchase ↔ Finance**:
- Purchase requests approval
- Finance approves/rejects

**Store ↔ Assembly**:
- Store allocates materials
- Assembly starts manufacturing

**Assembly ↔ Showroom**:
- Assembly sends completed products
- Showroom sends failed machines back

**Showroom ↔ Sales**:
- Showroom displays products
- Sales sells to customers

**Sales ↔ Finance**:
- Sales sends payment for verification
- Finance approves payment

**Sales ↔ Transport**:
- Sales requests transport approval
- Transport approves/rejects with demand

**Sales ↔ Dispatch**:
- Sales sends confirmed orders
- Dispatch prepares for delivery

**Dispatch ↔ Transport**:
- Dispatch creates transport jobs
- Transport assigns vehicles

**Dispatch ↔ Watchman**:
- Dispatch creates gate passes
- Watchman verifies and releases

**Transport ↔ Watchman**:
- Transport intimates vehicle return
- Watchman checks in vehicle

---

## 11. DEVELOPMENT & SUPPORT TOOLS

### AI-Powered Development Tools

If you encounter any issues or need to make changes to the system, the following AI-powered tools are available for developers:

#### **1. Cursor**
- **Type**: AI-powered code editor
- **Use Case**: Code generation, debugging, refactoring
- **Features**: 
  - Intelligent code completion
  - Natural language to code conversion
  - Multi-file editing
  - Context-aware suggestions
- **Best For**: Complex code changes, new feature development

#### **2. Windsurf**
- **Type**: AI development assistant
- **Use Case**: Code understanding, documentation, testing
- **Features**:
  - Code explanation
  - Test generation
  - Documentation creation
  - Bug detection
- **Best For**: Understanding existing code, writing tests

#### **3. Kiro**
- **Type**: AI IDE assistant
- **Use Case**: Full-stack development, system integration
- **Features**:
  - Multi-language support
  - System architecture understanding
  - API integration
  - Database query optimization
- **Best For**: System-wide changes, architecture decisions

#### **4. Cline**
- **Type**: AI coding assistant
- **Use Case**: Code review, optimization, best practices
- **Features**:
  - Code quality analysis
  - Performance optimization
  - Security vulnerability detection
  - Best practice recommendations
- **Best For**: Code review, optimization

#### **5. GitHub Copilot**
- **Type**: AI pair programmer (VS Code Extension)
- **Use Case**: Real-time code suggestions, autocomplete
- **Features**:
  - Line-by-line code completion
  - Function generation from comments
  - Multiple language support
  - Context-aware suggestions
- **Installation**: VS Code Extensions → Search "GitHub Copilot"
- **Best For**: Daily coding, quick implementations

#### **6. Zencoder (VS Code Extension)**
- **Type**: AI code assistant extension
- **Use Case**: Code generation, refactoring, documentation
- **Features**:
  - Smart code completion
  - Refactoring suggestions
  - Code documentation
  - Error detection
- **Installation**: VS Code Extensions → Search "Zencoder"
- **Best For**: Code quality improvement, documentation

#### **7. Blackbox (VS Code Extension)**
- **Type**: AI coding assistant extension
- **Use Case**: Code search, generation, debugging
- **Features**:
  - Code search across millions of repositories
  - Instant code generation
  - Bug fixing suggestions
  - Code explanation
- **Installation**: VS Code Extensions → Search "Blackbox AI"
- **Best For**: Finding code examples, quick solutions

---

### When to Use Which Tool

**For Quick Fixes**:
- GitHub Copilot (inline suggestions)
- Blackbox (code search and examples)

**For Complex Features**:
- Cursor (full feature development)
- Kiro (system-wide changes)

**For Code Quality**:
- Cline (code review)
- Zencoder (refactoring)

**For Understanding Code**:
- Windsurf (code explanation)
- Blackbox (code examples)

---

### Installation Guide

**VS Code Extensions**:
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for extension name
4. Click Install
5. Reload VS Code

**Standalone Tools**:
- Download from official websites
- Follow installation instructions
- Configure with your project

---

### Best Practices for Using AI Tools

1. **Always Review Generated Code**
   - Don't blindly accept suggestions
   - Understand what the code does
   - Test thoroughly

2. **Provide Clear Context**
   - Describe what you want clearly
   - Provide relevant code context
   - Specify requirements

3. **Use for Learning**
   - Ask for explanations
   - Understand the logic
   - Learn best practices

4. **Combine Tools**
   - Use multiple tools for different tasks
   - Leverage strengths of each
   - Cross-verify suggestions

5. **Security First**
   - Review security implications
   - Don't expose sensitive data
   - Follow security best practices

---

**Note**: These AI tools are powerful assistants but should be used responsibly. Always review, test, and understand the code they generate before deploying to production.

