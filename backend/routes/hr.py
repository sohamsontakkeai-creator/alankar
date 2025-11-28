from flask import Blueprint, request, jsonify
from services.hr_service import HRService
from services.audit_service import AuditService
from models import AuditAction, AuditModule
from utils.audit_middleware import audit_route, log_model_change
from datetime import datetime
import traceback

hr_bp = Blueprint('hr', __name__)

@hr_bp.route('/hr/health', methods=['GET'])
def hr_health_check():
    return jsonify({
        'status': 'HR module is running',
        'timestamp': datetime.now().isoformat()
    }), 200

@hr_bp.route('/hr/dashboard', methods=['GET'])
def get_hr_dashboard():
    try:
        data = HRService.get_dashboard_data()
        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Employee endpoints
@hr_bp.route('/hr/employees', methods=['GET'])
def get_employees():
    department = request.args.get('department')
    status = request.args.get('status')
    try:
        employees = HRService.get_employees(department, status)
        return jsonify(employees), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/employees/<int:employee_id>', methods=['GET'])
def get_employee(employee_id):
    try:
        employee = HRService.get_employee(employee_id)
        return jsonify(employee), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/employees', methods=['POST'])
def create_employee():
    data = request.get_json()
    try:
        employee = HRService.create_employee(data)
        
        # Create audit log for employee creation
        try:
            user_email = request.headers.get('X-User-Email', 'hr')
            emp_name = employee.get('full_name', 'Unknown')
            emp_id_str = employee.get('employee_id', 'N/A')
            department = employee.get('department', 'N/A')
            designation = employee.get('designation', 'N/A')
            
            description = f"HR created new employee - Name: {emp_name}, ID: {emp_id_str}, Department: {department}, Designation: {designation}"
            
            print(f"[AUDIT] Creating HR employee creation audit log: {description}")
            
            AuditService.log_activity(
                action=AuditAction.CREATE,
                module=AuditModule.HR,
                resource_type='employee',
                resource_id=str(employee.get('id', '')),
                description=description,
                username=user_email,
                new_values={
                    'employee_name': emp_name,
                    'employee_id': emp_id_str,
                    'department': department,
                    'designation': designation,
                    'email': employee.get('email', 'N/A')
                }
            )
            print(f"[AUDIT] HR employee creation audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create HR employee creation audit log: {audit_error}")
            traceback.print_exc()
        
        return jsonify(employee), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/employees/<int:employee_id>', methods=['PUT'])
def update_employee(employee_id):
    data = request.get_json()
    try:
        employee = HRService.update_employee(employee_id, data)
        
        # Create audit log for employee update
        try:
            user_email = request.headers.get('X-User-Email', 'hr')
            emp_name = employee.get('full_name', 'Unknown')
            emp_id_str = employee.get('employee_id', 'N/A')
            department = employee.get('department', 'N/A')
            
            # Determine what was updated
            updated_fields = []
            if 'full_name' in data:
                updated_fields.append('name')
            if 'email' in data:
                updated_fields.append('email')
            if 'phone' in data:
                updated_fields.append('phone')
            if 'department' in data:
                updated_fields.append('department')
            if 'designation' in data:
                updated_fields.append('designation')
            if 'salary' in data:
                updated_fields.append('salary')
            if 'status' in data:
                updated_fields.append('status')
            
            fields_str = ', '.join(updated_fields) if updated_fields else 'details'
            
            description = f"HR updated employee {fields_str} - Employee: {emp_name}, ID: {emp_id_str}, Department: {department}"
            
            print(f"[AUDIT] Creating HR employee update audit log: {description}")
            
            AuditService.log_activity(
                action=AuditAction.UPDATE,
                module=AuditModule.HR,
                resource_type='employee',
                resource_id=str(employee_id),
                description=description,
                username=user_email,
                new_values={
                    'employee_name': emp_name,
                    'employee_id': emp_id_str,
                    'department': department,
                    'updated_fields': updated_fields
                }
            )
            print(f"[AUDIT] HR employee update audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create HR employee update audit log: {audit_error}")
            traceback.print_exc()
        
        return jsonify(employee), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/employees/<int:employee_id>', methods=['DELETE'])
def delete_employee(employee_id):
    try:
        # Get employee details before deletion
        from models import Employee
        employee_obj = Employee.query.get(employee_id)
        
        result = HRService.delete_employee(employee_id)
        
        # Create audit log for employee deletion
        try:
            if employee_obj:
                user_email = request.headers.get('X-User-Email', 'hr')
                emp_name = employee_obj.full_name or 'Unknown'
                emp_id_str = employee_obj.employee_id or 'N/A'
                department = employee_obj.department or 'N/A'
                
                description = f"HR deleted employee - Name: {emp_name}, ID: {emp_id_str}, Department: {department}"
                
                print(f"[AUDIT] Creating HR employee deletion audit log: {description}")
                
                AuditService.log_activity(
                    action=AuditAction.DELETE,
                    module=AuditModule.HR,
                    resource_type='employee',
                    resource_id=str(employee_id),
                    description=description,
                    username=user_email,
                    old_values={
                        'employee_name': emp_name,
                        'employee_id': emp_id_str,
                        'department': department
                    }
                )
                print(f"[AUDIT] HR employee deletion audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create HR employee deletion audit log: {audit_error}")
            traceback.print_exc()
        
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Attendance endpoints
@hr_bp.route('/hr/employees/<int:employee_id>/attendance', methods=['POST'])
def record_attendance(employee_id):
    data = request.get_json()
    try:
        result = HRService.record_attendance(employee_id, data)
        
        # Create audit log for attendance recording
        try:
            from models import Employee
            employee_obj = Employee.query.get(employee_id)
            
            if employee_obj:
                user_email = request.headers.get('X-User-Email', 'hr')
                emp_name = employee_obj.full_name or 'Unknown'
                date = data.get('date', 'N/A')
                status = data.get('status', 'N/A')
                
                description = f"HR recorded attendance - Employee: {emp_name}, Date: {date}, Status: {status}"
                
                print(f"[AUDIT] Creating HR attendance recording audit log: {description}")
                
                AuditService.log_activity(
                    action=AuditAction.CREATE,
                    module=AuditModule.HR,
                    resource_type='attendance',
                    resource_id=str(employee_id),
                    description=description,
                    username=user_email,
                    new_values={
                        'employee_name': emp_name,
                        'date': date,
                        'status': status
                    }
                )
                print(f"[AUDIT] HR attendance recording audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create HR attendance recording audit log: {audit_error}")
            traceback.print_exc()
        
        return jsonify(result), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/employees/<int:employee_id>/attendance', methods=['GET'])
def get_employee_attendance(employee_id):
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    try:
        records = HRService.get_employee_attendance(employee_id, start_date, end_date)
        return jsonify(records), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/attendance', methods=['GET'])
def get_all_attendance():
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    try:
        records = HRService.get_all_attendance(start_date, end_date)
        return jsonify(records), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/attendance/summary', methods=['GET'])
def get_attendance_summary():
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    try:
        summary = HRService.get_attendance_summary(start_date, end_date)
        return jsonify(summary), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Leave endpoints
@hr_bp.route('/hr/employees/<int:employee_id>/leaves', methods=['POST'])
def create_leave_request(employee_id):
    data = request.get_json()
    try:
        leave = HRService.create_leave_request(employee_id, data)
        
        # Create audit log for leave request creation
        try:
            from models import Employee
            employee_obj = Employee.query.get(employee_id)
            
            if employee_obj:
                user_email = request.headers.get('X-User-Email', 'hr')
                emp_name = employee_obj.full_name or 'Unknown'
                leave_type = data.get('leave_type', 'N/A')
                start_date = data.get('start_date', 'N/A')
                end_date = data.get('end_date', 'N/A')
                reason = data.get('reason', '')
                
                description = f"HR created leave request - Employee: {emp_name}, Type: {leave_type}, Duration: {start_date} to {end_date}"
                if reason:
                    description += f", Reason: {reason}"
                
                print(f"[AUDIT] Creating HR leave request creation audit log: {description}")
                
                AuditService.log_activity(
                    action=AuditAction.CREATE,
                    module=AuditModule.HR,
                    resource_type='leave_request',
                    resource_id=str(leave.get('id', '')),
                    description=description,
                    username=user_email,
                    new_values={
                        'employee_name': emp_name,
                        'leave_type': leave_type,
                        'start_date': start_date,
                        'end_date': end_date,
                        'reason': reason
                    }
                )
                print(f"[AUDIT] HR leave request creation audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create HR leave request creation audit log: {audit_error}")
            traceback.print_exc()
        
        return jsonify(leave), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/leaves', methods=['GET', 'POST'])
def handle_leave_requests():
    """Handle both GET (list leaves) and POST (create leave request)"""
    if request.method == 'GET':
        employee_id = request.args.get('employeeId')
        status = request.args.get('status')
        try:
            leaves = HRService.get_leave_requests(employee_id, status)
            return jsonify(leaves), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        # Create leave request - employee can request their own leave
        data = request.get_json()
        employee_id = data.get('employeeId')
        
        if not employee_id:
            return jsonify({'error': 'employeeId is required'}), 400
        
        try:
            leave = HRService.create_leave_request(employee_id, data)
            
            # Create audit log for self-service leave request
            try:
                from models import Employee
                employee_obj = Employee.query.get(employee_id)
                
                if employee_obj:
                    emp_name = employee_obj.full_name or 'Unknown'
                    leave_type = data.get('leaveType', 'N/A')
                    start_date = data.get('startDate', 'N/A')
                    end_date = data.get('endDate', 'N/A')
                    reason = data.get('reason', '')
                    
                    description = f"Employee {emp_name} requested leave - Type: {leave_type}, Duration: {start_date} to {end_date}"
                    if reason:
                        description += f", Reason: {reason}"
                    
                    print(f"[AUDIT] Creating employee leave request audit log: {description}")
                    
                    AuditService.log_activity(
                        action=AuditAction.CREATE,
                        module=AuditModule.HR,
                        resource_type='leave_request',
                        resource_id=str(leave.get('id', '')),
                        description=description,
                        username=emp_name,
                        new_values={
                            'employee_name': emp_name,
                            'leave_type': leave_type,
                            'start_date': start_date,
                            'end_date': end_date,
                            'reason': reason
                        }
                    )
                    print(f"[AUDIT] Employee leave request audit log created successfully")
            except Exception as audit_error:
                print(f"[AUDIT ERROR] Failed to create employee leave request audit log: {audit_error}")
                import traceback
                traceback.print_exc()
            
            return jsonify(leave), 201
        except ValueError as ve:
            return jsonify({'error': str(ve)}), 404
        except Exception as e:
            return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/employees/on-leave', methods=['GET'])
def get_employees_on_leave():
    """Get list of employees currently on leave based on date"""
    date_str = request.args.get('date')
    try:
        employees_on_leave = HRService.get_employees_on_leave(date_str)
        return jsonify(employees_on_leave), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/leaves/<int:leave_id>/approve', methods=['PUT'])
def approve_leave_request(leave_id):
    data = request.get_json()
    approved = data.get('approved', True)
    approver_id = data.get('approverId')
    try:
        leave = HRService.approve_leave_request(leave_id, approved, approver_id)
        
        # Create audit log for leave approval/rejection
        try:
            user_email = request.headers.get('X-User-Email', 'hr')
            emp_name = leave.get('employee_name', 'Unknown')
            leave_type = leave.get('leave_type', 'N/A')
            start_date = leave.get('start_date', 'N/A')
            end_date = leave.get('end_date', 'N/A')
            days = leave.get('days', 0)
            reason = leave.get('reason', '')
            
            action_text = "approved" if approved else "rejected"
            action_type = AuditAction.APPROVE if approved else AuditAction.REJECT
            
            description = f"HR {action_text} leave request - Employee: {emp_name}, Type: {leave_type}, Duration: {start_date} to {end_date} ({days} days)"
            if reason:
                description += f", Reason: {reason}"
            
            print(f"[AUDIT] Creating HR leave {action_text} audit log: {description}")
            
            AuditService.log_activity(
                action=action_type,
                module=AuditModule.HR,
                resource_type='leave_request',
                resource_id=str(leave_id),
                description=description,
                username=user_email,
                new_values={
                    'employee_name': emp_name,
                    'leave_type': leave_type,
                    'start_date': start_date,
                    'end_date': end_date,
                    'days': days,
                    'approved': approved,
                    'status': leave.get('status')
                }
            )
            print(f"[AUDIT] HR leave {action_text} audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create HR leave approval audit log: {audit_error}")
            traceback.print_exc()
        
        return jsonify(leave), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/leaves/<int:leave_id>/manager-approve', methods=['PUT'])
def manager_approve_leave(leave_id):
    """Manager approves or rejects leave request"""
    data = request.get_json()
    manager_id = data.get('managerId')
    approved = data.get('approved', True)
    notes = data.get('notes')
    
    if not manager_id:
        return jsonify({'error': 'managerId is required'}), 400
    
    try:
        leave = HRService.approve_leave_as_manager(leave_id, manager_id, approved, notes)
        return jsonify(leave), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/leaves/my-team', methods=['GET'])
def get_my_team_leaves():
    """Get leave requests for manager's team"""
    manager_id = request.args.get('managerId')
    
    if not manager_id:
        return jsonify({'error': 'managerId is required'}), 400
    
    try:
        leaves = HRService.get_team_leave_requests(int(manager_id))
        return jsonify(leaves), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/leaves/management-pending', methods=['GET'])
def get_management_pending_leaves():
    """Get leave requests from HR and Manager employees that need management approval"""
    try:
        leaves = HRService.get_management_pending_leaves()
        return jsonify(leaves), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/leaves/<int:leave_id>/management-approve', methods=['PUT'])
def management_approve_leave(leave_id):
    """Management approves or rejects leave request from HR/Manager employees"""
    data = request.get_json()
    approved = data.get('approved', True)
    
    try:
        leave = HRService.approve_leave_by_management(leave_id, approved)
        return jsonify(leave), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/employees/<int:employee_id>/leave-balance', methods=['GET'])
def get_leave_balance(employee_id):
    try:
        balance = HRService.get_employee_leave_balance(employee_id)
        return jsonify(balance), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Payroll endpoints
@hr_bp.route('/hr/employees/<int:employee_id>/payrolls', methods=['GET'])
def get_employee_payrolls(employee_id):
    try:
        payrolls = HRService.get_employee_payrolls(employee_id)
        return jsonify(payrolls), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/employees/<int:employee_id>/payrolls', methods=['POST'])
def generate_payroll(employee_id):
    data = request.get_json() or {}
    try:
        payroll = HRService.generate_payroll(employee_id, data)
        
        # Create audit log for payroll generation
        try:
            user_name = data.get('generatedBy') or request.headers.get('X-User-Email', 'Unknown User')
            print(f"[DEBUG] Payroll generation - user_name from request: {user_name}")
            emp_name = payroll.get('employeeName') or payroll.get('employee_name', 'Unknown')
            
            # Extract month and year from pay period dates
            from datetime import datetime
            pay_period_start = payroll.get('payPeriodStart') or payroll.get('pay_period_start')
            if pay_period_start:
                try:
                    if isinstance(pay_period_start, str):
                        date_obj = datetime.fromisoformat(pay_period_start.replace('Z', '+00:00'))
                    else:
                        date_obj = pay_period_start
                    month = date_obj.strftime('%b')  # e.g., "Nov"
                    year = str(date_obj.year)
                except:
                    month = 'N/A'
                    year = 'N/A'
            else:
                month = 'N/A'
                year = 'N/A'
            
            gross_salary = payroll.get('grossSalary') or payroll.get('gross_salary', 0)
            net_salary = payroll.get('netSalary') or payroll.get('net_salary', 0)
            
            # Format amounts
            try:
                gross_str = f"₹{float(gross_salary):,.2f}"
                net_str = f"₹{float(net_salary):,.2f}"
            except:
                gross_str = str(gross_salary)
                net_str = str(net_salary)
            
            description = f"HR generated payroll - Employee: {emp_name}, Period: {month}/{year}, Gross: {gross_str}, Net: {net_str}"
            
            print(f"[AUDIT] Creating HR payroll generation audit log: {description}")
            
            AuditService.log_activity(
                action=AuditAction.CREATE,
                module=AuditModule.HR,
                resource_type='payroll',
                resource_id=str(payroll.get('id', employee_id)),
                description=description,
                username=user_name,
                new_values={
                    'employee_name': emp_name,
                    'employee_id': employee_id,
                    'month': month,
                    'year': year,
                    'gross_salary': gross_str,
                    'net_salary': net_str
                }
            )
            print(f"[AUDIT] HR payroll generation audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create HR payroll generation audit log: {audit_error}")
            traceback.print_exc()
        
        return jsonify(payroll), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/payrolls/<int:payroll_id>/process', methods=['PUT'])
def process_payroll(payroll_id):
    data = request.get_json() or {}
    try:
        print(f"[DEBUG] Processing payroll {payroll_id}")
        payroll = HRService.process_payroll(payroll_id)
        print(f"[DEBUG] Payroll processed successfully: {payroll}")
        
        # Create audit log for payroll processing
        try:
            user_name = data.get('processedBy') or request.headers.get('X-User-Email', 'Unknown User')
            print(f"[DEBUG] Payroll processing - user_name from request: {user_name}")
            emp_name = payroll.get('employeeName') or payroll.get('employee_name', 'Unknown')
            
            # Extract month and year from pay period dates
            from datetime import datetime
            pay_period_start = payroll.get('payPeriodStart') or payroll.get('pay_period_start')
            if pay_period_start:
                try:
                    if isinstance(pay_period_start, str):
                        date_obj = datetime.fromisoformat(pay_period_start.replace('Z', '+00:00'))
                    else:
                        date_obj = pay_period_start
                    month = date_obj.strftime('%b')  # e.g., "Nov"
                    year = str(date_obj.year)
                except:
                    month = 'N/A'
                    year = 'N/A'
            else:
                month = 'N/A'
                year = 'N/A'
            
            net_salary = payroll.get('netSalary') or payroll.get('net_salary', 0)
            
            # Format amount
            try:
                net_str = f"₹{float(net_salary):,.2f}"
            except:
                net_str = str(net_salary)
            
            description = f"HR processed payroll payment - Employee: {emp_name}, Period: {month}/{year}, Amount: {net_str}, Status: Paid"
            
            print(f"[AUDIT] Creating HR payroll processing audit log: {description}")
            
            AuditService.log_activity(
                action=AuditAction.UPDATE,
                module=AuditModule.HR,
                resource_type='payroll',
                resource_id=str(payroll_id),
                description=description,
                username=user_name,
                new_values={
                    'employee_name': emp_name,
                    'month': month,
                    'year': year,
                    'net_salary': net_str,
                    'status': 'paid'
                }
            )
            print(f"[AUDIT] HR payroll processing audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create HR payroll processing audit log: {audit_error}")
            traceback.print_exc()
        
        return jsonify(payroll), 200
    except ValueError as ve:
        print(f"[ERROR] ValueError in process_payroll: {ve}")
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        print(f"[ERROR] Exception in process_payroll: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/payrolls/<int:payroll_id>', methods=['PUT'])
def update_payroll(payroll_id):
    data = request.get_json()
    try:
        payroll = HRService.update_payroll(payroll_id, data)
        return jsonify(payroll), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/payrolls/<int:payroll_id>', methods=['DELETE'])
def delete_payroll(payroll_id):
    try:
        result = HRService.delete_payroll(payroll_id)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/payrolls', methods=['GET'])
def get_payrolls():
    try:
        payrolls = HRService.get_payrolls()
        return jsonify(payrolls), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/payrolls/<int:payroll_id>/payslip', methods=['GET'])
def download_payslip(payroll_id):
    try:
        from flask import Response, make_response

        # Generate HTML payslip
        payslip_html = HRService.generate_payslip(payroll_id)

        # Return HTML response that can be printed as PDF
        response = make_response(payslip_html)
        response.headers['Content-Type'] = 'text/html'
        response.headers['Content-Disposition'] = f'attachment; filename=payslip_{payroll_id}.html'
        return response

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/payrolls/export', methods=['GET'])
def export_payroll_report():
    try:
        from flask import make_response

        # Generate Excel report
        excel_buffer = HRService.export_payroll_report()

        # Return Excel response
        response = make_response(excel_buffer.getvalue())
        response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        response.headers['Content-Disposition'] = 'attachment; filename=payroll_report.xlsx'
        return response

    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Recruitment endpoints
@hr_bp.route('/hr/jobs', methods=['GET'])
def get_job_postings():
    status = request.args.get('status')
    try:
        jobs = HRService.get_job_postings(status)
        return jsonify(jobs), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/jobs', methods=['POST'])
def create_job_posting():
    data = request.get_json()
    try:
        job = HRService.create_job_posting(data)
        return jsonify(job), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/jobs/<int:job_id>/status', methods=['PUT'])
def update_job_status(job_id):
    data = request.get_json()
    status = data.get('status')
    try:
        job = HRService.update_job_status(job_id, status)
        return jsonify(job), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/job-postings', methods=['GET'])
def get_job_postings_alias():
    status = request.args.get('status')
    try:
        jobs = HRService.get_job_postings(status)
        return jsonify(jobs), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/job-postings', methods=['POST'])
def create_job_posting_alias():
    data = request.get_json()
    try:
        job = HRService.create_job_posting(data)
        return jsonify(job), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/job-postings/<int:job_id>', methods=['PUT'])
def update_job_posting_alias(job_id):
    data = request.get_json()
    try:
        job = HRService.update_job_posting(job_id, data)
        return jsonify(job), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/jobs/<int:job_id>', methods=['PUT'])
def update_job_posting(job_id):
    data = request.get_json()
    try:
        job = HRService.update_job_posting(job_id, data)
        return jsonify(job), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/jobs/<int:job_id>', methods=['DELETE'])
def delete_job_posting(job_id):
    try:
        result = HRService.delete_job_posting(job_id)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Job Application endpoints
@hr_bp.route('/hr/job-applications', methods=['GET'])
def get_job_applications():
    job_posting_id = request.args.get('jobPostingId')
    status = request.args.get('status')
    try:
        applications = HRService.get_job_applications(job_posting_id=job_posting_id, status=status)
        return jsonify(applications), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/job-applications', methods=['POST'])
def create_job_application():
    data = request.get_json()
    try:
        application = HRService.create_job_application(data)
        return jsonify(application), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/job-applications/<int:application_id>/status', methods=['PUT'])
def update_job_application_status(application_id):
    data = request.get_json()
    status = data.get('status')
    reviewer_id = data.get('reviewerId')
    try:
        application = HRService.update_job_application_status(application_id, status, reviewer_id)
        
        # Create audit log for job application status update
        try:
            user_email = request.headers.get('X-User-Email', 'hr')
            candidate_name = application.get('candidate_name', 'Unknown')
            job_title = application.get('job_title', 'N/A')
            
            # Map status to action
            if status in ['shortlisted', 'interview_scheduled']:
                action_type = AuditAction.APPROVE
                action_text = "shortlisted"
            elif status in ['rejected', 'withdrawn']:
                action_type = AuditAction.REJECT
                action_text = "rejected"
            elif status == 'hired':
                action_type = AuditAction.APPROVE
                action_text = "hired"
            else:
                action_type = AuditAction.UPDATE
                action_text = f"updated to {status}"
            
            description = f"HR {action_text} job application - Candidate: {candidate_name}, Position: {job_title}, Status: {status}"
            
            print(f"[AUDIT] Creating HR job application status audit log: {description}")
            
            AuditService.log_activity(
                action=action_type,
                module=AuditModule.HR,
                resource_type='job_application',
                resource_id=str(application_id),
                description=description,
                username=user_email,
                new_values={
                    'candidate_name': candidate_name,
                    'job_title': job_title,
                    'status': status,
                    'reviewer_id': reviewer_id
                }
            )
            print(f"[AUDIT] HR job application status audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create HR job application status audit log: {audit_error}")
            traceback.print_exc()
        
        return jsonify(application), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/job-applications/<int:application_id>', methods=['DELETE'])
def delete_job_application(application_id):
    try:
        result = HRService.delete_job_application(application_id)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Interview endpoints
@hr_bp.route('/hr/interviews', methods=['GET'])
def get_interviews():
    job_application_id = request.args.get('jobApplicationId')
    status = request.args.get('status')
    try:
        interviews = HRService.get_interviews(job_application_id, status)
        return jsonify(interviews), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/interviews', methods=['POST'])
def schedule_interview():
    data = request.get_json()
    try:
        interview = HRService.schedule_interview(data)
        return jsonify(interview), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/interviews/<int:interview_id>/status', methods=['PUT'])
def update_interview_status(interview_id):
    data = request.get_json()
    status = data.get('status')
    feedback = data.get('feedback')
    rating = data.get('rating')
    decision = data.get('decision')
    interviewer_id = data.get('interviewerId')
    try:
        interview = HRService.update_interview_status(interview_id, status, feedback, rating, decision, interviewer_id)
        
        # Create audit log for interview status update
        try:
            user_email = request.headers.get('X-User-Email', 'hr')
            candidate_name = interview.get('candidate_name', 'Unknown')
            job_title = interview.get('job_title', 'N/A')
            interview_date = interview.get('interview_date', 'N/A')
            
            # Determine action based on decision
            if decision == 'selected':
                action_type = AuditAction.APPROVE
                action_text = "selected candidate after interview"
            elif decision == 'rejected':
                action_type = AuditAction.REJECT
                action_text = "rejected candidate after interview"
            else:
                action_type = AuditAction.UPDATE
                action_text = f"updated interview status to {status}"
            
            description = f"HR {action_text} - Candidate: {candidate_name}, Position: {job_title}, Date: {interview_date}"
            if rating:
                description += f", Rating: {rating}/5"
            if decision:
                description += f", Decision: {decision}"
            
            print(f"[AUDIT] Creating HR interview status audit log: {description}")
            
            AuditService.log_activity(
                action=action_type,
                module=AuditModule.HR,
                resource_type='interview',
                resource_id=str(interview_id),
                description=description,
                username=user_email,
                new_values={
                    'candidate_name': candidate_name,
                    'job_title': job_title,
                    'interview_date': interview_date,
                    'status': status,
                    'rating': rating,
                    'decision': decision,
                    'feedback': feedback
                }
            )
            print(f"[AUDIT] HR interview status audit log created successfully")
        except Exception as audit_error:
            print(f"[AUDIT ERROR] Failed to create HR interview status audit log: {audit_error}")
            traceback.print_exc()
        
        return jsonify(interview), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/interviews/<int:interview_id>', methods=['DELETE'])
def delete_interview(interview_id):
    try:
        result = HRService.delete_interview(interview_id)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Candidate endpoints
@hr_bp.route('/hr/candidates', methods=['GET'])
def get_candidates():
    search = request.args.get('search')
    status = request.args.get('status')
    try:
        candidates = HRService.get_candidates(search, status)
        return jsonify(candidates), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/candidates', methods=['POST'])
def create_candidate():
    data = request.get_json()
    try:
        candidate = HRService.create_candidate(data)
        return jsonify(candidate), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/candidates/<int:candidate_id>', methods=['PUT'])
def update_candidate(candidate_id):
    data = request.get_json()
    try:
        candidate = HRService.update_candidate(candidate_id, data)
        return jsonify(candidate), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/candidates/<int:candidate_id>', methods=['DELETE'])
def delete_candidate(candidate_id):
    try:
        result = HRService.delete_candidate(candidate_id)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Tour Intimation endpoints
@hr_bp.route('/hr/tours', methods=['GET'])
def get_tour_intimations():
    """Get all tour intimations with optional filters"""
    try:
        employee_id = request.args.get('employee_id', type=int)
        status = request.args.get('status')
        tours = HRService.get_tour_intimations(employee_id=employee_id, status=status)
        return jsonify(tours), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/tours/<int:tour_id>', methods=['GET'])
def get_tour_intimation(tour_id):
    """Get a specific tour intimation"""
    try:
        tour = HRService.get_tour_intimation(tour_id)
        return jsonify(tour), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/tours', methods=['POST'])
def create_tour_intimation():
    """Create a new tour intimation"""
    data = request.get_json()
    try:
        tour = HRService.create_tour_intimation(data)
        
        # Log audit
        AuditService.log_activity(
            action=AuditAction.CREATE,
            module=AuditModule.HR,
            resource_type='TourIntimation',
            description=f"Created tour intimation for {data.get('employeeName')} to {data.get('destination')}",
            resource_id=tour['id'],
            resource_name=f"{data.get('employeeName')} - {data.get('destination')}"
        )
        
        return jsonify(tour), 201
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        print(f"Error creating tour intimation: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/tours/<int:tour_id>', methods=['PUT'])
def update_tour_intimation(tour_id):
    """Update a tour intimation"""
    data = request.get_json()
    try:
        tour = HRService.update_tour_intimation(tour_id, data)
        
        # Log audit
        AuditService.log_activity(
            action=AuditAction.UPDATE,
            module=AuditModule.HR,
            resource_type='TourIntimation',
            description=f"Updated tour intimation #{tour_id}",
            resource_id=tour_id
        )
        
        return jsonify(tour), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        print(f"Error updating tour intimation: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/tours/<int:tour_id>/approve', methods=['POST'])
def approve_tour_intimation(tour_id):
    """Approve a tour intimation"""
    data = request.get_json()
    try:
        approver_id = data.get('approverId')
        tour = HRService.approve_tour_intimation(tour_id, approver_id)
        
        # Log audit
        AuditService.log_activity(
            action=AuditAction.APPROVE,
            module=AuditModule.HR,
            resource_type='TourIntimation',
            description=f"Approved tour intimation #{tour_id}",
            resource_id=tour_id
        )
        
        return jsonify(tour), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        print(f"Error approving tour intimation: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/tours/<int:tour_id>/reject', methods=['POST'])
def reject_tour_intimation(tour_id):
    """Reject a tour intimation"""
    data = request.get_json()
    try:
        approver_id = data.get('approverId')
        reason = data.get('reason', '')
        tour = HRService.reject_tour_intimation(tour_id, approver_id, reason)
        
        # Log audit
        AuditService.log_activity(
            action=AuditAction.REJECT,
            module=AuditModule.HR,
            resource_type='TourIntimation',
            description=f"Rejected tour intimation #{tour_id}",
            resource_id=tour_id
        )
        
        return jsonify(tour), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        print(f"Error rejecting tour intimation: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/tours/<int:tour_id>/complete', methods=['POST'])
def complete_tour_intimation(tour_id):
    """Mark a tour as completed with actual expenses"""
    data = request.get_json()
    try:
        actual_cost = data.get('actualCost')
        completion_remarks = data.get('completionRemarks', '')
        tour = HRService.complete_tour_intimation(tour_id, actual_cost, completion_remarks)
        
        # Log audit
        AuditService.log_activity(
            action=AuditAction.UPDATE,
            module=AuditModule.HR,
            resource_type='TourIntimation',
            description=f"Completed tour intimation #{tour_id}",
            resource_id=tour_id
        )
        
        return jsonify(tour), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        print(f"Error completing tour intimation: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/tours/<int:tour_id>', methods=['DELETE'])
def delete_tour_intimation(tour_id):
    """Delete a tour intimation"""
    try:
        HRService.delete_tour_intimation(tour_id)
        
        # Log audit
        AuditService.log_activity(
            action=AuditAction.DELETE,
            module=AuditModule.HR,
            resource_type='TourIntimation',
            description=f"Deleted tour intimation #{tour_id}",
            resource_id=tour_id
        )
        
        return jsonify({'message': 'Tour intimation deleted successfully'}), 200
    except ValueError as ve:
        return jsonify({'error': str(ve)}), 404
    except Exception as e:
        print(f"Error deleting tour intimation: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/tours/management-pending', methods=['GET'])
def get_management_pending_tours():
    """Get tour intimations that need management approval"""
    try:
        tours = HRService.get_management_pending_tours()
        return jsonify(tours), 200
    except Exception as e:
        print(f"Error fetching management pending tours: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/hr/tours/<int:tour_id>/management-approve', methods=['PUT'])
def management_approve_tour(tour_id):
    """Management approves or rejects tour intimation"""
    data = request.get_json()
    approved = data.get('approved', True)
    notes = data.get('notes')
    
    try:
        tour = HRService.approve_tour_by_management(tour_id, approved, notes)
        
        # Log audit
        action_text = "approved" if approved else "rejected"
        AuditService.log_activity(
            action=AuditAction.APPROVE if approved else AuditAction.REJECT,
            module=AuditModule.HR,
            resource_type='TourIntimation',
            description=f"Management {action_text} tour intimation #{tour_id} for {tour.get('employeeName')} to {tour.get('destination')}",
            resource_id=tour_id
        )
        
        return jsonify(tour), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f"Error in management tour approval: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@hr_bp.route('/hr/tours/employees-on-tour', methods=['GET'])
def get_employees_on_tour():
    """Get employees currently on tour for a specific date"""
    try:
        date_str = request.args.get('date')  # Optional date parameter in YYYY-MM-DD format
        result = HRService.get_employees_on_tour(date_str)
        return jsonify(result), 200
    except Exception as e:
        print(f"Error fetching employees on tour: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
