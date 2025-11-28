"""
Centralized Migration Manager
Automatically runs all database migrations when the application starts
"""
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class MigrationManager:
    """Manages all database migrations for the ERP system"""
    
    def __init__(self, app=None, db=None):
        """
        Initialize the migration manager
        
        Args:
            app: Flask application instance
            db: SQLAlchemy database instance
        """
        self.app = app
        self.db = db
        self.engine = None
        
        if app:
            self.init_app(app, db)
    
    def init_app(self, app, db):
        """Initialize with Flask app"""
        self.app = app
        self.db = db
        
        # Get database URI from app config
        database_uri = app.config.get('SQLALCHEMY_DATABASE_URI')
        if database_uri:
            self.engine = create_engine(database_uri)
    
    def column_exists(self, connection, table_name: str, column_name: str) -> bool:
        """Check if a column exists in a table"""
        query = text(
            """
            SELECT COUNT(*) AS cnt
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = :table
              AND COLUMN_NAME = :col
            """
        )
        res = connection.execute(query, {"table": table_name, "col": column_name}).scalar()
        return int(res or 0) > 0
    
    def table_exists(self, connection, table_name: str) -> bool:
        """Check if a table exists"""
        query = text(
            """
            SELECT COUNT(*) AS cnt
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = :table
            """
        )
        res = connection.execute(query, {"table": table_name}).scalar()
        return int(res or 0) > 0
    
    def run_sales_migration(self, connection):
        """Create sales tables"""
        print("🔄 Running sales migration...")
        
        create_sales_order_table = """
        CREATE TABLE IF NOT EXISTS sales_order (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_number VARCHAR(50) UNIQUE NOT NULL,
            customer_name VARCHAR(200) NOT NULL,
            customer_contact VARCHAR(100),
            customer_email VARCHAR(200),
            customer_address VARCHAR(400),
            showroom_product_id INT NOT NULL,
            quantity INT DEFAULT 1,
            unit_price FLOAT NOT NULL,
            total_amount FLOAT NOT NULL,
            discount_amount FLOAT DEFAULT 0.0,
            final_amount FLOAT NOT NULL,
            payment_method VARCHAR(50) NOT NULL,
            payment_status VARCHAR(50) DEFAULT 'pending',
            order_status VARCHAR(50) DEFAULT 'pending',
            sales_person VARCHAR(100) NOT NULL,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (showroom_product_id) REFERENCES showroom_product(id)
        );
        """
        
        create_customer_table = """
        CREATE TABLE IF NOT EXISTS customer (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            contact VARCHAR(100),
            email VARCHAR(200),
            address VARCHAR(400),
            customer_type VARCHAR(50) DEFAULT 'retail',
            credit_limit FLOAT DEFAULT 0.0,
            current_balance FLOAT DEFAULT 0.0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        );
        """
        
        create_sales_transaction_table = """
        CREATE TABLE IF NOT EXISTS sales_transaction (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sales_order_id INT NOT NULL,
            transaction_type VARCHAR(50) NOT NULL,
            amount FLOAT NOT NULL,
            payment_method VARCHAR(50) NOT NULL,
            reference_number VARCHAR(100),
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sales_order_id) REFERENCES sales_order(id)
        );
        """
        
        create_sales_target_table_sql = """
        CREATE TABLE IF NOT EXISTS sales_target (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sales_person VARCHAR(100) NOT NULL,
            year INT NOT NULL,
            month INT NOT NULL COMMENT '1-12',
            target_amount FLOAT NOT NULL COMMENT 'Monthly target amount',
            assignment_type VARCHAR(50) DEFAULT 'manual' COMMENT 'manual, formula, historical',
            assigned_by VARCHAR(100),
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_sales_target (sales_person, year, month),
            INDEX idx_sales_person (sales_person),
            INDEX idx_year_month (year, month)
        );
        """
        
        try:
            connection.execute(text(create_sales_order_table))
            connection.commit()
            
            # Add additional columns if they don't exist
            if not self.column_exists(connection, 'sales_order', 'coupon_code'):
                connection.execute(text("ALTER TABLE sales_order ADD COLUMN coupon_code VARCHAR(50) NULL"))
                connection.commit()
            
            if not self.column_exists(connection, 'sales_order', 'finance_bypass'):
                connection.execute(text("ALTER TABLE sales_order ADD COLUMN finance_bypass BOOLEAN DEFAULT FALSE"))
                connection.commit()
            
            if not self.column_exists(connection, 'sales_order', 'bypass_reason'):
                connection.execute(text("ALTER TABLE sales_order ADD COLUMN bypass_reason TEXT NULL"))
                connection.commit()
            
            if not self.column_exists(connection, 'sales_order', 'bypassed_at'):
                connection.execute(text("ALTER TABLE sales_order ADD COLUMN bypassed_at DATETIME NULL"))
                connection.commit()
            
            if not self.column_exists(connection, 'sales_order', 'payment_due_date'):
                connection.execute(text("ALTER TABLE sales_order ADD COLUMN payment_due_date DATE NULL"))
                connection.commit()
            
            connection.execute(text(create_customer_table))
            connection.commit()
            
            connection.execute(text(create_sales_transaction_table))
            connection.commit()
            
            connection.execute(text(create_sales_target_table_sql))
            connection.commit()
            
            print("✅ Sales tables created successfully!")
            return True
        except Exception as e:
            print(f"⚠️ Sales migration error: {e}")
            return False
    
    def run_hr_migration(self, connection):
        """Create HR tables"""
        print("🔄 Running HR migration...")
        
        create_employees_table = """
        CREATE TABLE IF NOT EXISTS employees (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id VARCHAR(20) UNIQUE NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            phone VARCHAR(20),
            date_of_birth DATE,
            gender VARCHAR(20),
            address TEXT,
            department VARCHAR(100) NOT NULL,
            designation VARCHAR(100) NOT NULL,
            joining_date DATE NOT NULL,
            salary_type enum('daily','monthly','hourly'),
            salary FLOAT NOT NULL,
            status VARCHAR(20) DEFAULT 'active',
            photo TEXT,
            face_encoding LONGTEXT,
            manager_id INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (manager_id) REFERENCES employees(id)
        );
        """

        create_attendance_table = """
        CREATE TABLE IF NOT EXISTS attendance (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT NOT NULL,
            name VARCHAR(100),
            date DATE NOT NULL,
            check_in_time TIME,
            check_out_time TIME,
            status ENUM('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY') DEFAULT 'PRESENT',
            hours_worked FLOAT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id)
        );
        """

        create_leaves_table = """
        CREATE TABLE IF NOT EXISTS leaves (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT NOT NULL,
            name VARCHAR(100),
            leave_type ENUM('CASUAL', 'SICK', 'EARNED', 'MATERNITY', 'PATERNITY') NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            days_requested FLOAT NOT NULL,
            reason TEXT,
            status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
            approved_by INT,
            approved_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id),
            FOREIGN KEY (approved_by) REFERENCES employees(id)
        );
        """

        create_payrolls_table = """
        CREATE TABLE IF NOT EXISTS payrolls (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT NOT NULL,
            name VARCHAR(100),
            pay_period_start DATE NOT NULL,
            pay_period_end DATE NOT NULL,
            salary_type ENUM('DAILY','MONTHLY','HOURLY') DEFAULT 'MONTHLY',
            monthly_salary FLOAT NOT NULL,
            allowances FLOAT DEFAULT 0,
            deductions FLOAT DEFAULT 0,
            gross_salary FLOAT NOT NULL,
            net_salary FLOAT NOT NULL,
            payment_date DATE,
            status VARCHAR(20) DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id)
        );
        """

        create_job_postings_table = """
        CREATE TABLE IF NOT EXISTS job_postings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            department VARCHAR(100) NOT NULL,
            location VARCHAR(100),
            employment_type VARCHAR(50),
            experience_level VARCHAR(50),
            salary_range VARCHAR(100),
            description TEXT NOT NULL,
            requirements TEXT,
            responsibilities TEXT,
            status ENUM('OPEN', 'CLOSED', 'FILLED') DEFAULT 'OPEN',
            posted_by INT,
            application_deadline DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (posted_by) REFERENCES employees(id)
        );
        """

        create_job_applications_table = """
        CREATE TABLE IF NOT EXISTS job_applications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            job_posting_id INT NOT NULL,
            candidate_id INT,
            applicant_name VARCHAR(200) NOT NULL,
            applicant_email VARCHAR(255) NOT NULL,
            applicant_phone VARCHAR(20),
            resume_path VARCHAR(500),
            cover_letter TEXT,
            experience_years FLOAT,
            current_salary FLOAT,
            expected_salary FLOAT,
            availability_date DATE,
            status ENUM('submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'interviewed', 'offered', 'accepted', 'rejected', 'withdrawn') DEFAULT 'submitted',
            notes TEXT,
            reviewed_by INT,
            reviewed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (job_posting_id) REFERENCES job_postings(id),
            FOREIGN KEY (reviewed_by) REFERENCES employees(id)
        );
        """

        create_interviews_table = """
        CREATE TABLE IF NOT EXISTS interviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            job_application_id INT NOT NULL,
            interview_type VARCHAR(50),
            scheduled_date DATE NOT NULL,
            scheduled_time TIME NOT NULL,
            duration_minutes INT DEFAULT 60,
            interviewers VARCHAR(500),
            location VARCHAR(200),
            status ENUM('scheduled', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
            feedback TEXT,
            rating FLOAT,
            decision VARCHAR(50),
            conducted_by INT,
            conducted_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (job_application_id) REFERENCES job_applications(id),
            FOREIGN KEY (conducted_by) REFERENCES employees(id)
        );
        """

        create_candidates_table = """
        CREATE TABLE IF NOT EXISTS candidates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            phone VARCHAR(20),
            skills TEXT,
            experience_years FLOAT,
            current_position VARCHAR(200),
            current_company VARCHAR(200),
            location VARCHAR(100),
            resume_path VARCHAR(500),
            source VARCHAR(100),
            status VARCHAR(50) DEFAULT 'active',
            notes TEXT,
            added_by INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (added_by) REFERENCES employees(id)
        );
        """
        
        try:
            connection.execute(text(create_employees_table))
            connection.commit()
            
            connection.execute(text(create_attendance_table))
            connection.commit()
            
            connection.execute(text(create_leaves_table))
            connection.commit()
            
            connection.execute(text(create_payrolls_table))
            connection.commit()
            
            connection.execute(text(create_job_postings_table))
            connection.commit()
            
            connection.execute(text(create_job_applications_table))
            connection.commit()
            
            connection.execute(text(create_interviews_table))
            connection.commit()
            
            connection.execute(text(create_candidates_table))
            connection.commit()
            
            print("✅ HR tables created successfully!")
            return True
        except Exception as e:
            print(f"⚠️ HR migration error: {e}")
            return False
    
    def run_tour_intimation_migration(self, connection):
        """Create tour intimations table"""
        print("🔄 Running tour intimation migration...")
        
        create_tour_intimations_table = """
        CREATE TABLE IF NOT EXISTS tour_intimations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            employee_id INT NOT NULL,
            employee_name VARCHAR(200) NOT NULL,
            tour_purpose VARCHAR(500) NOT NULL,
            destination VARCHAR(200) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            duration_days INT NOT NULL,
            estimated_cost FLOAT,
            advance_required FLOAT DEFAULT 0,
            travel_mode VARCHAR(50),
            accommodation_required BOOLEAN DEFAULT FALSE,
            remarks TEXT,
            status ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
            approved_by INT,
            approved_at DATETIME,
            rejection_reason TEXT,
            actual_cost FLOAT,
            completion_remarks TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (employee_id) REFERENCES employees(id),
            FOREIGN KEY (approved_by) REFERENCES employees(id),
            INDEX idx_employee (employee_id),
            INDEX idx_status (status),
            INDEX idx_start_date (start_date)
        );
        """
        
        try:
            if not self.table_exists(connection, 'tour_intimations'):
                connection.execute(text(create_tour_intimations_table))
                connection.commit()
                print("✅ Tour intimations table created successfully!")
            else:
                print("✅ Tour intimations table already exists!")
            
            return True
        except Exception as e:
            print(f"⚠️ Tour intimation migration error: {e}")
            return False
    
    def run_dispatch_migration(self, connection):
        """Update dispatch tables"""
        print("🔄 Running dispatch migration...")
        
        try:
            # Add columns if they don't exist
            if self.table_exists(connection, 'dispatch_request'):
                if not self.column_exists(connection, 'dispatch_request', 'sales_order_id'):
                    connection.execute(text("ALTER TABLE dispatch_request ADD COLUMN sales_order_id INT"))
                    connection.commit()
                
                if not self.column_exists(connection, 'dispatch_request', 'party_email'):
                    connection.execute(text("ALTER TABLE dispatch_request ADD COLUMN party_email VARCHAR(200)"))
                    connection.commit()
                
                if not self.column_exists(connection, 'dispatch_request', 'quantity'):
                    connection.execute(text("ALTER TABLE dispatch_request ADD COLUMN quantity INT DEFAULT 1"))
                    connection.commit()
                
                if not self.column_exists(connection, 'dispatch_request', 'dispatch_notes'):
                    connection.execute(text("ALTER TABLE dispatch_request ADD COLUMN dispatch_notes TEXT"))
                    connection.commit()
                
                if not self.column_exists(connection, 'dispatch_request', 'updated_at'):
                    connection.execute(text("ALTER TABLE dispatch_request ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"))
                    connection.commit()

                # Add photo columns to gate_pass table for watchman capture
                if not self.column_exists(connection, 'gate_pass', 'send_in_photo'):
                    connection.execute(text("ALTER TABLE gate_pass ADD COLUMN send_in_photo VARCHAR(500) NULL"))
                    connection.commit()

                if not self.column_exists(connection, 'gate_pass', 'after_loading_photo'):
                    connection.execute(text("ALTER TABLE gate_pass ADD COLUMN after_loading_photo VARCHAR(500) NULL"))
                    connection.commit()
                
                print("✅ Dispatch tables updated successfully!")
            else:
                print("ℹ️ dispatch_request table doesn't exist yet, skipping dispatch migration")
            
            return True
        except Exception as e:
            print(f"⚠️ Dispatch migration error: {e}")
            return False
    
    def run_fleet_migration(self, connection):
        """Create fleet tables"""
        print("🔄 Running fleet migration...")
        
        create_vehicle_table = """
        CREATE TABLE IF NOT EXISTS vehicle (
          id INT NOT NULL AUTO_INCREMENT,
          vehicle_number VARCHAR(100) NOT NULL UNIQUE,
          vehicle_type VARCHAR(50) NOT NULL,
          driver_name VARCHAR(200) NOT NULL,
          driver_contact VARCHAR(100),
          capacity VARCHAR(100),
          status VARCHAR(50) DEFAULT 'available',
          current_location VARCHAR(200),
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          INDEX idx_vehicle_status (status),
          INDEX idx_vehicle_number (vehicle_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
        
        create_transport_job_table = """
        CREATE TABLE IF NOT EXISTS transport_job (
          id INT NOT NULL AUTO_INCREMENT,
          dispatch_request_id INT NOT NULL,
          transporter_name VARCHAR(200),
          vehicle_no VARCHAR(100),
          status VARCHAR(50) DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          INDEX idx_transport_status (status),
          INDEX idx_transport_dispatch (dispatch_request_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """
        
        try:
            connection.execute(text(create_vehicle_table))
            connection.commit()
            
            connection.execute(text(create_transport_job_table))
            connection.commit()
            
            print("✅ Fleet tables created successfully!")
            return True
        except Exception as e:
            print(f"⚠️ Fleet migration error: {e}")
            return False
    
    def run_guest_list_migration(self, connection):
        """Create guest list table"""
        print("🔄 Running guest list migration...")
        
        create_guest_list_table = """
        CREATE TABLE IF NOT EXISTS guest_list (
            id INT AUTO_INCREMENT PRIMARY KEY,
            guest_name VARCHAR(255) NOT NULL,
            guest_contact VARCHAR(20),
            guest_email VARCHAR(255),
            guest_company VARCHAR(255),
            meeting_person VARCHAR(255) NOT NULL,
            meeting_person_department VARCHAR(100),
            meeting_person_contact VARCHAR(20),
            visit_date DATE NOT NULL,
            visit_time TIME,
            purpose VARCHAR(500) NOT NULL,
            in_time DATETIME,
            out_time DATETIME,
            vehicle_number VARCHAR(50),
            id_proof_type VARCHAR(50),
            id_proof_number VARCHAR(100),
            visitor_photo_path VARCHAR(500),
            status ENUM('scheduled', 'checked_in', 'checked_out', 'cancelled') DEFAULT 'scheduled',
            notes TEXT,
            created_by VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_guest_name (guest_name),
            INDEX idx_meeting_person (meeting_person),
            INDEX idx_visit_date (visit_date),
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        
        try:
            connection.execute(text(create_guest_list_table))
            connection.commit()
            
            print("✅ Guest list table created successfully!")
            return True
        except Exception as e:
            print(f"⚠️ Guest list migration error: {e}")
            return False
    
    def run_audit_trail_migration(self, connection):
        """Create or update audit trail table with all modules"""
        print("🔄 Running audit trail migration...")
        
        create_audit_trail_table = """
        CREATE TABLE IF NOT EXISTS audit_trail (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            username VARCHAR(100),
            user_ip VARCHAR(45),
            user_agent TEXT,
            action ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 
                       'EXPORT', 'IMPORT', 'APPROVE', 'REJECT', 'SUBMIT', 
                       'CANCEL', 'RESTORE') NOT NULL,
            module ENUM('AUTH', 'HR', 'PRODUCTION', 'PURCHASE', 'INVENTORY', 
                       'SHOWROOM', 'FINANCE', 'SALES', 'TRANSPORT', 'SECURITY',
                       'GATE_ENTRY', 'GUEST_LIST', 'APPROVAL', 'ADMIN') NOT NULL,
            resource_type VARCHAR(100) NOT NULL,
            resource_id VARCHAR(100),
            resource_name VARCHAR(255),
            description TEXT NOT NULL,
            old_values JSON,
            new_values JSON,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            session_id VARCHAR(255),
            request_id VARCHAR(100),
            INDEX idx_user_id (user_id),
            INDEX idx_module (module),
            INDEX idx_action (action),
            INDEX idx_timestamp (timestamp),
            INDEX idx_resource (resource_type, resource_id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """
        
        try:
            # Check if table exists
            if not self.table_exists(connection, 'audit_trail'):
                # Create the table with all modules
                connection.execute(text(create_audit_trail_table))
                connection.commit()
                print("✅ Audit trail table created successfully!")
            else:
                # Table exists, check if SECURITY module is in the enum
                result = connection.execute(text("""
                    SELECT COLUMN_TYPE 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = 'audit_trail' 
                    AND COLUMN_NAME = 'module'
                """))
                current_enum = result.fetchone()
                
                if current_enum and 'SECURITY' not in current_enum[0]:
                    print("   Adding SECURITY module to audit_trail enum...")
                    connection.execute(text("""
                        ALTER TABLE audit_trail 
                        MODIFY COLUMN module ENUM(
                            'AUTH', 'HR', 'PRODUCTION', 'PURCHASE', 'INVENTORY', 
                            'SHOWROOM', 'FINANCE', 'SALES', 'TRANSPORT', 'SECURITY',
                            'GATE_ENTRY', 'GUEST_LIST', 'APPROVAL', 'ADMIN'
                        ) NOT NULL
                    """))
                    connection.commit()
                    print("✅ SECURITY module added to audit_trail!")
                else:
                    print("✅ Audit trail table already up to date!")
            
            return True
        except Exception as e:
            print(f"⚠️ Audit trail migration error: {e}")
            return False
    
    def run_password_reset_migration(self, connection):
        """Fix password reset tokens table"""
        print("🔄 Running password reset tokens migration...")
        
        try:
            # Check if table exists
            if self.table_exists(connection, 'password_reset_tokens'):
                # Delete invalid records with null user_id
                print("   Cleaning up invalid password reset tokens...")
                connection.execute(text("""
                    DELETE FROM password_reset_tokens WHERE user_id IS NULL
                """))
                connection.commit()
                print("✅ Password reset tokens cleaned up!")
            
            return True
        except Exception as e:
            print(f"⚠️ Password reset migration error: {e}")
            return False
    
    def run_purchase_order_migration(self, connection):
        """Add extra_materials and payment_terms columns to purchase_order table"""
        print("🔄 Running purchase order migration...")
        
        try:
            # Check if table exists
            if self.table_exists(connection, 'purchase_order'):
                # Add extra_materials column if it doesn't exist
                if not self.column_exists(connection, 'purchase_order', 'extra_materials'):
                    print("   Adding extra_materials column to purchase_order table...")
                    connection.execute(text("""
                        ALTER TABLE purchase_order 
                        ADD COLUMN extra_materials TEXT NULL
                    """))
                    connection.commit()
                    print("✅ extra_materials column added successfully!")
                else:
                    print("✅ extra_materials column already exists!")
                
                # Add payment_terms column if it doesn't exist
                if not self.column_exists(connection, 'purchase_order', 'payment_terms'):
                    print("   Adding payment_terms column to purchase_order table...")
                    connection.execute(text("""
                        ALTER TABLE purchase_order 
                        ADD COLUMN payment_terms VARCHAR(50) DEFAULT 'full_payment'
                    """))
                    connection.commit()
                    print("✅ payment_terms column added successfully!")
                else:
                    print("✅ payment_terms column already exists!")
            else:
                print("ℹ️ purchase_order table doesn't exist yet, skipping migration")
            
            return True
        except Exception as e:
            print(f"⚠️ Purchase order migration error: {e}")
            return False

    def run_rework_system_migration(self, connection):
        """Create rework system tables and add required columns"""
        print("🔄 Running rework system migration...")
        
        try:
            # Create machine_test_result table
            create_machine_test_result_table = """
            CREATE TABLE IF NOT EXISTS machine_test_result (
                id INT AUTO_INCREMENT PRIMARY KEY,
                assembly_order_id INT NOT NULL,
                machine_number VARCHAR(50) NOT NULL,
                engine_number VARCHAR(50) NULL,
                test_result VARCHAR(10) NOT NULL DEFAULT 'pending',
                tested_at DATETIME NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_in_rework BOOLEAN DEFAULT FALSE,
                rework_order_id INT NULL,
                original_lot_id INT NULL,
                INDEX idx_assembly_order (assembly_order_id),
                INDEX idx_test_result (test_result),
                INDEX idx_rework_order (rework_order_id),
                INDEX idx_original_lot (original_lot_id),
                FOREIGN KEY (assembly_order_id) REFERENCES assembly_order(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """
            
            if not self.table_exists(connection, 'machine_test_result'):
                print("   Creating machine_test_result table...")
                connection.execute(text(create_machine_test_result_table))
                connection.commit()
                print("✅ machine_test_result table created successfully!")
            else:
                print("✅ machine_test_result table already exists!")
            
            # Create rework_order table
            create_rework_order_table = """
            CREATE TABLE IF NOT EXISTS rework_order (
                id INT AUTO_INCREMENT PRIMARY KEY,
                original_assembly_order_id INT NOT NULL,
                product_name VARCHAR(200) NOT NULL,
                failed_machine_count INT NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                started_at DATETIME NULL,
                completed_at DATETIME NULL,
                notes TEXT,
                INDEX idx_original_assembly (original_assembly_order_id),
                INDEX idx_status (status),
                FOREIGN KEY (original_assembly_order_id) REFERENCES assembly_order(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """
            
            if not self.table_exists(connection, 'rework_order'):
                print("   Creating rework_order table...")
                connection.execute(text(create_rework_order_table))
                connection.commit()
                print("✅ rework_order table created successfully!")
            else:
                print("✅ rework_order table already exists!")
                
                # Add started_at column if it doesn't exist
                if not self.column_exists(connection, 'rework_order', 'started_at'):
                    print("   Adding started_at column to existing rework_order table...")
                    connection.execute(text("""
                        ALTER TABLE rework_order 
                        ADD COLUMN started_at DATETIME NULL
                    """))
                    connection.commit()
                    print("✅ started_at column added to rework_order successfully!")
            
            # Add rework tracking columns to machine_test_result table (if table exists but columns don't)
            if self.table_exists(connection, 'machine_test_result'):
                # Add is_in_rework column if it doesn't exist
                if not self.column_exists(connection, 'machine_test_result', 'is_in_rework'):
                    print("   Adding is_in_rework column to existing machine_test_result table...")
                    connection.execute(text("""
                        ALTER TABLE machine_test_result 
                        ADD COLUMN is_in_rework BOOLEAN DEFAULT FALSE
                    """))
                    connection.commit()
                    print("✅ is_in_rework column added successfully!")
                
                # Add rework_order_id column if it doesn't exist
                if not self.column_exists(connection, 'machine_test_result', 'rework_order_id'):
                    print("   Adding rework_order_id column to existing machine_test_result table...")
                    connection.execute(text("""
                        ALTER TABLE machine_test_result 
                        ADD COLUMN rework_order_id INT NULL,
                        ADD INDEX idx_rework_order (rework_order_id)
                    """))
                    connection.commit()
                    print("✅ rework_order_id column added successfully!")
                
                # Add original_lot_id column if it doesn't exist
                if not self.column_exists(connection, 'machine_test_result', 'original_lot_id'):
                    print("   Adding original_lot_id column to existing machine_test_result table...")
                    connection.execute(text("""
                        ALTER TABLE machine_test_result 
                        ADD COLUMN original_lot_id INT NULL,
                        ADD INDEX idx_original_lot (original_lot_id)
                    """))
                    connection.commit()
                    print("✅ original_lot_id column added successfully!")
                
                print("✅ All rework tracking columns verified in machine_test_result table!")
            
            # Add quantity column to showroom_product table
            if self.table_exists(connection, 'showroom_product'):
                if not self.column_exists(connection, 'showroom_product', 'quantity'):
                    print("   Adding quantity column to showroom_product table...")
                    connection.execute(text("""
                        ALTER TABLE showroom_product 
                        ADD COLUMN quantity INT DEFAULT 1
                    """))
                    connection.commit()
                    print("✅ quantity column added to showroom_product successfully!")
                else:
                    print("✅ quantity column already exists in showroom_product!")
            else:
                print("ℹ️ showroom_product table doesn't exist yet, skipping showroom product migration")
            
            print("✅ Rework system migration completed successfully!")
            return True
        except Exception as e:
            print(f"⚠️ Rework system migration error: {e}")
            return False
    
    def run_transport_details_migration(self, connection):
        """Add transport details columns to sales_order table"""
        print("🔄 Running transport details migration...")
        
        try:
            if self.table_exists(connection, 'sales_order'):
                # Add transport detail columns if they don't exist
                columns_to_add = [
                    ("origin", "VARCHAR(200)"),
                    ("destination", "VARCHAR(200)"),
                    ("distance", "VARCHAR(50)"),
                    ("vehicle_type", "VARCHAR(100)")
                ]
                
                for column_name, column_type in columns_to_add:
                    if not self.column_exists(connection, 'sales_order', column_name):
                        print(f"   Adding {column_name} column to sales_order table...")
                        connection.execute(text(f"""
                            ALTER TABLE sales_order 
                            ADD COLUMN {column_name} {column_type}
                        """))
                        connection.commit()
                        print(f"✅ {column_name} column added successfully!")
                    else:
                        print(f"✅ {column_name} column already exists!")
                
                print("✅ Transport details migration completed successfully!")
            else:
                print("ℹ️ sales_order table doesn't exist yet, skipping transport details migration")
            
            return True
        except Exception as e:
            print(f"⚠️ Transport details migration error: {e}")
            return False
    
    def run_payment_details_migration(self, connection):
        """Add payment details columns to sales_transaction table"""
        print("🔄 Running payment details migration...")
        
        try:
            if self.table_exists(connection, 'sales_transaction'):
                # Add payment detail columns if they don't exist
                columns_to_add = [
                    ("utr_number", "VARCHAR(100)"),
                    ("cash_denominations", "TEXT"),
                    ("split_payment_details", "TEXT")
                ]
                
                for column_name, column_type in columns_to_add:
                    if not self.column_exists(connection, 'sales_transaction', column_name):
                        print(f"   Adding {column_name} column to sales_transaction table...")
                        connection.execute(text(f"""
                            ALTER TABLE sales_transaction 
                            ADD COLUMN {column_name} {column_type}
                        """))
                        connection.commit()
                        print(f"✅ {column_name} column added successfully!")
                    else:
                        print(f"✅ {column_name} column already exists!")
                
                print("✅ Payment details migration completed successfully!")
            else:
                print("ℹ️ sales_transaction table doesn't exist yet, skipping payment details migration")
            
            return True
        except Exception as e:
            print(f"⚠️ Payment details migration error: {e}")
            return False
    
    def run_manager_approval_migration(self, connection):
        """Add manager approval fields to leaves table"""
        print("🔄 Running manager approval migration...")
        
        try:
            if self.table_exists(connection, 'leaves'):
                # Add manager approval columns if they don't exist
                columns_to_add = [
                    ("manager_approved_by", "INT"),
                    ("manager_approved_at", "DATETIME"),
                    ("manager_notes", "TEXT")
                ]
                
                for column_name, column_type in columns_to_add:
                    if not self.column_exists(connection, 'leaves', column_name):
                        print(f"   Adding {column_name} column to leaves table...")
                        connection.execute(text(f"""
                            ALTER TABLE leaves 
                            ADD COLUMN {column_name} {column_type}
                        """))
                        connection.commit()
                        print(f"✅ {column_name} column added successfully!")
                    else:
                        print(f"✅ {column_name} column already exists!")
                
                # Update enum to include new statuses
                print("   Updating leave status enum...")
                try:
                    connection.execute(text("""
                        ALTER TABLE leaves 
                        MODIFY COLUMN status ENUM('PENDING', 'MANAGER_APPROVED', 'APPROVED', 'REJECTED', 'MANAGER_REJECTED') 
                        DEFAULT 'PENDING'
                    """))
                    connection.commit()
                    print("✅ Leave status enum updated successfully!")
                except Exception as enum_error:
                    print(f"ℹ️ Enum update skipped (may already be updated): {enum_error}")
                
                print("✅ Manager approval migration completed successfully!")
            else:
                print("ℹ️ leaves table doesn't exist yet, skipping manager approval migration")
            
            return True
        except Exception as e:
            print(f"⚠️ Manager approval migration error: {e}")
            return False
    
    def run_tour_management_approval_migration(self, connection):
        """Add management approval fields to tour_intimations table"""
        print("🔄 Running tour management approval migration...")
        
        try:
            if self.table_exists(connection, 'tour_intimations'):
                # Add management approval columns if they don't exist
                columns_to_add = [
                    ("management_approved_by", "INT"),
                    ("management_approved_at", "DATETIME"),
                    ("management_notes", "TEXT")
                ]
                
                for column_name, column_type in columns_to_add:
                    if not self.column_exists(connection, 'tour_intimations', column_name):
                        print(f"   Adding {column_name} column to tour_intimations table...")
                        connection.execute(text(f"""
                            ALTER TABLE tour_intimations 
                            ADD COLUMN {column_name} {column_type}
                        """))
                        connection.commit()
                        print(f"✅ {column_name} column added successfully!")
                    else:
                        print(f"✅ {column_name} column already exists!")
                
                # Update enum to include new statuses
                print("   Updating tour status enum...")
                try:
                    connection.execute(text("""
                        ALTER TABLE tour_intimations 
                        MODIFY COLUMN status ENUM('PENDING', 'MANAGEMENT_APPROVED', 'APPROVED', 'REJECTED', 'MANAGEMENT_REJECTED', 'COMPLETED', 'CANCELLED') 
                        DEFAULT 'PENDING'
                    """))
                    connection.commit()
                    print("✅ Tour status enum updated successfully!")
                except Exception as enum_error:
                    print(f"ℹ️ Enum update skipped (may already be updated): {enum_error}")
                
                print("✅ Tour management approval migration completed successfully!")
            else:
                print("ℹ️ tour_intimations table doesn't exist yet, skipping tour management approval migration")
            
            return True
        except Exception as e:
            print(f"⚠️ Tour management approval migration error: {e}")
            return False
    
    def run_leave_approved_by_fix_migration(self, connection):
        """Fix leave approved_by foreign key constraint - make it nullable"""
        print("🔄 Running leave approved_by constraint fix migration...")
        
        try:
            if self.table_exists(connection, 'leaves'):
                # Check if foreign key constraint exists
                result = connection.execute(text("""
                    SELECT CONSTRAINT_NAME 
                    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = 'leaves'
                    AND COLUMN_NAME = 'approved_by'
                    AND REFERENCED_TABLE_NAME IS NOT NULL
                """))
                
                constraint = result.fetchone()
                
                if constraint:
                    constraint_name = constraint[0]
                    print(f"   Found foreign key constraint: {constraint_name}")
                    
                    # Drop the foreign key constraint
                    print(f"   Dropping foreign key constraint {constraint_name}...")
                    connection.execute(text(f"ALTER TABLE leaves DROP FOREIGN KEY {constraint_name}"))
                    connection.commit()
                    print("✅ Foreign key constraint dropped!")
                else:
                    print("ℹ️ No foreign key constraint found on approved_by")
                
                # Make approved_by nullable
                print("   Making approved_by column nullable...")
                connection.execute(text("""
                    ALTER TABLE leaves 
                    MODIFY COLUMN approved_by INTEGER NULL
                """))
                connection.commit()
                print("✅ approved_by column is now nullable!")
                
                print("✅ Leave approved_by constraint fix completed successfully!")
                print("   HR users can now approve leaves without employee records")
            else:
                print("ℹ️ leaves table doesn't exist yet, skipping leave approved_by fix migration")
            
            return True
        except Exception as e:
            print(f"⚠️ Leave approved_by fix migration error: {e}")
            return False
    
    def run_all_migrations(self):
        """Run all migrations in the correct order"""
        print("\n" + "=" * 60)
        print("🚀 Starting Automatic Database Migrations")
        print("=" * 60 + "\n")
        
        if not self.engine:
            print("❌ Database engine not initialized")
            return False
        
        try:
            with self.engine.connect() as connection:
                # Run migrations in order (respecting dependencies)
                self.run_audit_trail_migration(connection)  # Run first to ensure audit table exists
                self.run_password_reset_migration(connection)  # Clean up invalid password reset tokens
                self.run_sales_migration(connection)
                self.run_hr_migration(connection)
                self.run_tour_intimation_migration(connection)  # Add tour intimations table
                self.run_dispatch_migration(connection)
                self.run_fleet_migration(connection)
                self.run_guest_list_migration(connection)
                self.run_purchase_order_migration(connection)  # Add extra_materials column
                self.run_rework_system_migration(connection)  # Add rework system tables and columns
                self.run_transport_details_migration(connection)  # Add transport details columns to sales_order
                self.run_payment_details_migration(connection)  # Add payment details columns to sales_transaction
                self.run_manager_approval_migration(connection)  # Add manager approval fields to leaves table
                self.run_tour_management_approval_migration(connection)  # Add management approval fields to tour_intimations table
                self.run_leave_approved_by_fix_migration(connection)  # Fix leave approved_by constraint to allow HR users without employee records
                
                print("\n" + "=" * 60)
                print("✅ All migrations completed successfully!")
                print("=" * 60 + "\n")
                return True
                
        except Exception as e:
            print(f"\n❌ Migration error: {e}")
            import traceback
            traceback.print_exc()
            return False


# Global instance
migration_manager = MigrationManager()


def init_migrations(app, db):
    """
    Initialize and run all migrations
    
    Args:
        app: Flask application instance
        db: SQLAlchemy database instance
    
    Returns:
        bool: True if migrations completed successfully
    """
    migration_manager.init_app(app, db)
    return migration_manager.run_all_migrations()