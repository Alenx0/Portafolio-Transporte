# =================================================================
# APLICACIÓN FLASK PARA TRANSPORTE UNIÓN SALAZAR
# Versión 11.5 - API para Análisis de Rentabilidad Mensual
# =================================================================

from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import os
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, date, timezone
from decimal import Decimal
# Nuevas importaciones para el cálculo mensual
from collections import defaultdict
from dateutil.relativedelta import relativedelta

load_dotenv()

# -----------------------------------------------------------------
# 1. INICIALIZACIÓN Y CONFIGURACIÓN
# -----------------------------------------------------------------
app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://transporte_user:montana33@localhost:5432/transporte_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

db = SQLAlchemy(app)
migrate = Migrate(app, db)


# -----------------------------------------------------------------
# 2. DEFINICIÓN DE MODELOS (Sin cambios)
# -----------------------------------------------------------------
class User(db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='conductor')
    phone = db.Column(db.String(20), nullable=True)
    rut = db.Column(db.String(12), nullable=True, unique=True)
    shift_type = db.Column(db.String(10), nullable=True, default='7x7')
    shift_start_date = db.Column(db.Date, nullable=True, default=date.today)
    work_periods = db.relationship('WorkPeriod', backref='worker', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password): self.password_hash = generate_password_hash(password)
    def check_password(self, password): return check_password_hash(self.password_hash, password)
    def to_dict(self): return {"id": self.id, "username": self.username, "role": self.role, "phone": self.phone, "rut": self.rut}
    def __repr__(self): return f'<User {self.username}>'

class Client(db.Model):
    __tablename__ = 'client'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    contact_person = db.Column(db.String(120), nullable=True)
    contact_email = db.Column(db.String(120), nullable=True)
    contracts = db.relationship('ServiceContract', backref='client', lazy='dynamic')

    def __repr__(self):
        return f'<Client {self.name}>'

class ServiceContract(db.Model):
    __tablename__ = 'service_contract'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    start_date = db.Column(db.Date, nullable=False, default=date.today)
    end_date = db.Column(db.Date, nullable=True)
    total_revenue = db.Column(db.Numeric(12, 2), nullable=False) 
    status = db.Column(db.String(20), nullable=False, default='activo')
    client_id = db.Column(db.Integer, db.ForeignKey('client.id'), nullable=False)
    work_periods = db.relationship('WorkPeriod', backref='contract', lazy='dynamic')

    def __repr__(self):
        return f'<ServiceContract {self.name}>'

class WorkPeriod(db.Model):
    __tablename__ = 'work_period'
    id = db.Column(db.Integer, primary_key=True)
    start_date = db.Column(db.Date, nullable=False, default=date.today)
    status = db.Column(db.String(20), nullable=False, default='activo')
    patente = db.Column(db.String(10), nullable=False)
    rut = db.Column(db.String(12), nullable=False)
    trip_origin = db.Column(db.String(100), nullable=False)
    trip_destination = db.Column(db.String(100), nullable=False)
    initial_amount = db.Column(db.Numeric(10, 2), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    expenses = db.relationship('Expense', backref='period', lazy=True, cascade="all, delete-orphan")
    service_contract_id = db.Column(db.Integer, db.ForeignKey('service_contract.id'), nullable=True)
    
    def to_dict(self): 
        return {
            "id": self.id, "start_date": self.start_date.isoformat(), "status": self.status,
            "patente": self.patente, "rut": self.rut, "trip_origin": self.trip_origin,
            "trip_destination": self.trip_destination, "initial_amount": str(self.initial_amount)
        }

class Expense(db.Model):
    __tablename__ = 'expense'
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, default=date.today)
    category = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    notes = db.Column(db.Text, nullable=True)
    work_period_id = db.Column(db.Integer, db.ForeignKey('work_period.id'), nullable=False)
    def to_dict(self): return {"id": self.id, "date": self.date.isoformat(), "category": self.category, "amount": str(self.amount), "notes": self.notes}


# -----------------------------------------------------------------
# 3. RUTAS Y ENDPOINTS
# -----------------------------------------------------------------
@app.context_processor
def inject_current_year():
    return {'current_year': datetime.now(timezone.utc).year}

# --- Rutas de páginas ---
@app.route('/')
def index(): return render_template('index.html')
@app.route('/acceso')
def users_page(): return render_template('users.html')

# --- Rutas de API (sin cambios hasta la ruta de detalles de contrato) ---
@app.route('/api/register', methods=['POST'])
def register():
    # ... (código sin cambios)
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({"success": False, "message": "Faltan datos."}), 400
    username = data.get('username').lower()
    if User.query.filter(User.username.ilike(username)).first():
        return jsonify({"success": False, "message": "El nombre de usuario ya existe."}), 409
    new_user = User(username=username)
    new_user.set_password(data.get('password'))
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"success": True, "message": "¡Usuario registrado!"}), 201

@app.route('/api/login', methods=['POST'])
def login():
    # ... (código sin cambios)
    data = request.get_json()
    username = data.get('username')
    user = User.query.filter(User.username.ilike(username)).first()
    if not user or not user.check_password(data.get('password')):
        return jsonify({"success": False, "message": "Usuario o contraseña incorrectos."}), 401
    user_data = {
        "username": user.username, "role": user.role, "shift_type": user.shift_type,
        "shift_start_date": user.shift_start_date.isoformat() if user.shift_start_date else None
    }
    return jsonify({"success": True, "message": "¡Login exitoso!", "user": user_data}), 200

@app.route('/api/user/shift', methods=['GET', 'POST'])
def handle_shift():
    # ... (código sin cambios)
    if request.method == 'POST':
        data = request.get_json()
        user = User.query.filter_by(username=data.get('username')).first_or_404()
        user.shift_type = data.get('shift_type')
        user.shift_start_date = datetime.strptime(data.get('shift_start_date'), '%Y-%m-%d').date()
        db.session.commit()
        return jsonify({"success": True, "message": "Turno actualizado."})
    if request.method == 'GET':
        user = User.query.filter_by(username=request.args.get('username')).first_or_404()
        if not user.shift_type or not user.shift_start_date:
            return jsonify({"success": False, "message": "Turno no configurado."}), 400
        schedule = calculate_shift_schedule(user.shift_start_date, user.shift_type)
        return jsonify({"success": True, "schedule": schedule})

@app.route('/api/work_periods', methods=['POST'])
def create_work_period():
    # ... (código sin cambios)
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first_or_404()
    if WorkPeriod.query.filter_by(user_id=user.id, status='activo').first():
        return jsonify({"success": False, "message": "Ya existe un período de trabajo activo."}), 409
    new_period = WorkPeriod(
        patente=data.get('patente'), rut=data.get('rut'), trip_origin=data.get('trip_origin'),
        trip_destination=data.get('trip_destination'), initial_amount=data.get('initial_amount'), worker=user,
        service_contract_id=data.get('service_contract_id') 
    )
    db.session.add(new_period)
    db.session.commit()
    return jsonify({"success": True, "message": "Período de trabajo iniciado.", "period": new_period.to_dict()}), 201

@app.route('/api/work_periods/history', methods=['GET'])
def get_work_period_history():
    # ... (código sin cambios)
    username = request.args.get('username')
    user = User.query.filter_by(username=username).first_or_404()
    closed_periods = WorkPeriod.query.filter_by(user_id=user.id, status='cerrado').order_by(WorkPeriod.id.desc()).all()
    history_list = [{"expenses": [e.to_dict() for e in p.expenses], **p.to_dict()} for p in closed_periods]
    return jsonify({"success": True, "history": history_list})

@app.route('/api/expense_data', methods=['GET'])
def get_expense_data():
    # ... (código sin cambios)
    user = User.query.filter_by(username=request.args.get('username')).first_or_404()
    active_period = WorkPeriod.query.filter_by(user_id=user.id, status='activo').first()
    if not active_period: return jsonify({"success": True, "active_period": None, "expenses": []})
    expenses = [expense.to_dict() for expense in active_period.expenses]
    return jsonify({"success": True, "active_period": active_period.to_dict(), "expenses": expenses})

@app.route('/api/expenses', methods=['POST'])
def add_expense():
    # ... (código sin cambios)
    data = request.get_json()
    work_period = WorkPeriod.query.get_or_404(data.get('period_id'))
    if work_period.status == 'cerrado': return jsonify({"success": False, "message": "No se puede añadir gastos a un período cerrado."}), 403
    new_expense = Expense(category=data.get('category'), amount=data.get('amount'), notes=data.get('notes'), period=work_period)
    db.session.add(new_expense)
    db.session.commit()
    return jsonify({"success": True, "message": "Gasto añadido correctamente.", "expense": new_expense.to_dict()}), 201

@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    # ... (código sin cambios)
    expense = Expense.query.get_or_404(expense_id)
    if expense.period.status == 'cerrado':
        return jsonify({"success": False, "message": "No se pueden eliminar gastos de un período cerrado."}), 403
    db.session.delete(expense)
    db.session.commit()
    return jsonify({"success": True, "message": "Gasto eliminado correctamente."})

@app.route('/api/work_periods/<int:period_id>/close', methods=['POST'])
def close_work_period(period_id):
    # ... (código sin cambios)
    period = WorkPeriod.query.get_or_404(period_id)
    period.status = 'cerrado'
    db.session.commit()
    return jsonify({"success": True, "message": "El período de trabajo ha sido cerrado."})

@app.route('/api/admin/conductores', methods=['GET'])
def get_conductores():
    # ... (código sin cambios)
    conductores = User.query.filter_by(role='conductor').all()
    return jsonify({"success": True, "conductores": [c.to_dict() for c in conductores]})

@app.route('/api/admin/conductor/<username>', methods=['PUT'])
def update_conductor(username):
    # ... (código sin cambios)
    user = User.query.filter_by(username=username, role='conductor').first_or_404()
    data = request.get_json()
    if 'rut' in data and data.get('rut'):
        existing_rut = User.query.filter(User.rut == data['rut'], User.id != user.id).first()
        if existing_rut:
            return jsonify({"success": False, "message": "El RUT ya está en uso por otro usuario."}), 409
    user.phone = data.get('phone', user.phone)
    user.rut = data.get('rut', user.rut)
    db.session.commit()
    return jsonify({"success": True, "message": "Datos del conductor actualizados.", "conductor": user.to_dict()})

@app.route('/api/admin/conductor_details/<username>', methods=['GET'])
def get_conductor_details(username):
    # ... (código sin cambios)
    user = User.query.filter_by(username=username, role='conductor').first_or_404()
    schedule = []
    if user.shift_type and user.shift_start_date:
        schedule = calculate_shift_schedule(user.shift_start_date, user.shift_type)
    active_period = WorkPeriod.query.filter_by(user_id=user.id, status='activo').first()
    active_period_data = None
    if active_period:
        active_period_data = active_period.to_dict()
        active_period_data['expenses'] = [e.to_dict() for e in active_period.expenses]
    closed_periods = WorkPeriod.query.filter_by(user_id=user.id, status='cerrado').order_by(WorkPeriod.id.desc()).all()
    history_list = [{"expenses": [e.to_dict() for e in p.expenses], **p.to_dict()} for p in closed_periods]
    return jsonify({
        "success": True, "conductor": user.to_dict(), "schedule": schedule,
        "active_period": active_period_data, "history": history_list
    })

@app.route('/api/admin/user/<username>/set-password', methods=['POST'])
def set_user_password(username):
    # ... (código sin cambios)
    user = User.query.filter(User.username.ilike(username)).first()
    if not user:
        return jsonify({"success": False, "message": "Usuario no encontrado."}), 404
    data = request.get_json()
    new_password = data.get('password')
    if not new_password:
        return jsonify({"success": False, "message": "No se proporcionó una nueva contraseña."}), 400
    user.set_password(new_password)
    db.session.commit()
    return jsonify({"success": True, "message": f"La contraseña para el usuario '{user.username}' ha sido actualizada."}), 200

@app.route('/api/admin/clients', methods=['POST'])
def create_client():
    # ... (código sin cambios)
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({"success": False, "message": "El nombre del cliente es obligatorio."}), 400
    if Client.query.filter_by(name=data['name']).first():
        return jsonify({"success": False, "message": "Un cliente con ese nombre ya existe."}), 409
    new_client = Client(name=data['name'], contact_person=data.get('contact_person'), contact_email=data.get('contact_email'))
    db.session.add(new_client)
    db.session.commit()
    return jsonify({"success": True, "message": "Cliente creado exitosamente.", "client": {"id": new_client.id, "name": new_client.name}}), 201

@app.route('/api/admin/clients', methods=['GET'])
def get_clients():
    # ... (código sin cambios)
    all_clients = Client.query.order_by(Client.name).all()
    clients_list = [{"id": client.id, "name": client.name} for client in all_clients]
    return jsonify({"success": True, "clients": clients_list})

@app.route('/api/admin/contracts', methods=['POST'])
def create_contract():
    # ... (código sin cambios)
    data = request.get_json()
    required_fields = ['name', 'total_revenue', 'client_id', 'start_date']
    if not all(field in data for field in required_fields):
        return jsonify({"success": False, "message": "Faltan datos obligatorios."}), 400
    client = Client.query.get(data['client_id'])
    if not client:
        return jsonify({"success": False, "message": "El cliente especificado no existe."}), 404
    new_contract = ServiceContract(
        name=data['name'], total_revenue=data['total_revenue'],
        start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date(),
        end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None,
        status=data.get('status', 'activo'), client_id=data['client_id']
    )
    db.session.add(new_contract)
    db.session.commit()
    return jsonify({"success": True, "message": "Contrato creado exitosamente."}), 201

@app.route('/api/admin/contracts', methods=['GET'])
def get_contracts():
    # ... (código sin cambios)
    contracts_with_clients = db.session.query(ServiceContract, Client.name).join(Client, ServiceContract.client_id == Client.id).order_by(ServiceContract.start_date.desc()).all()
    contracts_list = []
    for contract, client_name in contracts_with_clients:
        contracts_list.append({
            "id": contract.id, "name": contract.name, "start_date": contract.start_date.isoformat(),
            "end_date": contract.end_date.isoformat() if contract.end_date else None,
            "total_revenue": str(contract.total_revenue), "status": contract.status,
            "client_id": contract.client_id, "client_name": client_name
        })
    return jsonify({"success": True, "contracts": contracts_list})

@app.route('/api/contracts/active', methods=['GET'])
def get_active_contracts():
    # ... (código sin cambios)
    active_contracts = ServiceContract.query.filter_by(status='activo').order_by(ServiceContract.name).all()
    contracts_list = [{"id": contract.id, "name": contract.name} for contract in active_contracts]
    return jsonify({"success": True, "contracts": contracts_list})

# ***** INICIO: RUTA DE DETALLES DE CONTRATO MODIFICADA *****
@app.route('/api/admin/contracts/<int:contract_id>', methods=['GET'])
def get_contract_details(contract_id):
    """
    Obtiene los detalles de un contrato, con un desglose de rentabilidad MES A MES.
    """
    contract_data = db.session.query(
        ServiceContract, Client.name
    ).join(Client, ServiceContract.client_id == Client.id).filter(ServiceContract.id == contract_id).first()

    if not contract_data:
        return jsonify({"success": False, "message": "Contrato no encontrado."}), 404

    contract, client_name = contract_data

    end_date = contract.end_date or date.today()
    num_months = (end_date.year - contract.start_date.year) * 12 + (end_date.month - contract.start_date.month) + 1
    monthly_revenue = contract.total_revenue / num_months if num_months > 0 else Decimal(0)

    monthly_breakdown = defaultdict(lambda: {'driver_expenses': Decimal(0)})

    for period in contract.work_periods:
        for expense in period.expenses:
            month_key = expense.date.strftime('%Y-%m')
            monthly_breakdown[month_key]['driver_expenses'] += expense.amount
    
    formatted_breakdown = []
    grand_total_expenses = Decimal(0)
    
    current_month_start = contract.start_date.replace(day=1)
    end_month_start = end_date.replace(day=1)
    
    temp_date = current_month_start
    while temp_date <= end_month_start:
        month_key = temp_date.strftime('%Y-%m')
        month_data = monthly_breakdown[month_key]
        
        driver_expenses = month_data['driver_expenses']
        profit = monthly_revenue - driver_expenses
        grand_total_expenses += driver_expenses

        formatted_breakdown.append({
            "month": temp_date.strftime('%B %Y').capitalize(), # Formato "Agosto 2025"
            "revenue": str(monthly_revenue),
            "driver_expenses": str(driver_expenses),
            "profit": str(profit)
        })
        temp_date += relativedelta(months=1)

    grand_total_profit = contract.total_revenue - grand_total_expenses
    grand_total_margin = (grand_total_profit / contract.total_revenue * 100) if contract.total_revenue > 0 else 0

    details = {
        "id": contract.id,
        "name": contract.name,
        "client_name": client_name,
        "monthly_breakdown": formatted_breakdown,
        "grand_totals": {
            "total_revenue": str(contract.total_revenue),
            "total_expenses": str(grand_total_expenses),
            "total_profit": str(grand_total_profit),
            "total_margin": f"{grand_total_margin:.2f}"
        }
    }

    return jsonify({"success": True, "details": details})
# ***** FIN: RUTA DE DETALLES DE CONTRATO MODIFICADA *****


# --- Funciones de Ayuda ---
def calculate_shift_schedule(start_date, shift_type, num_days=365):
    # ... (código existente sin cambios)
    try:
        work_days, off_days = map(int, shift_type.split('x'))
        cycle_length = work_days + off_days
    except (ValueError, AttributeError):
        return []
    schedule = []
    today = date.today()
    for i in range(num_days):
        current_day = today + timedelta(days=i)
        days_since_start = (current_day - start_date).days
        day_in_cycle = days_since_start % cycle_length
        status = "work" if 0 <= day_in_cycle < work_days else "off"
        schedule.append({"date": current_day.isoformat(), "status": status})
    return schedule

# -----------------------------------------------------------------
# 4. EJECUCIÓN DE LA APLICACIÓN
# -----------------------------------------------------------------
if __name__ == '__main__':
    app.run(debug=True, port=5000)
