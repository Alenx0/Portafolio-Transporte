# =================================================================
# APLICACIÓN FLASK PARA TRANSPORTE UNIÓN SALAZAR
# Versión 10.2 - Login Insensible a Mayúsculas
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
# 2. DEFINICIÓN DE MODELOS
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

@app.route('/')
def index(): return render_template('index.html')
@app.route('/acceso')
def users_page(): return render_template('users.html')

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({"success": False, "message": "Faltan datos."}), 400
    
    # Guardamos el nombre de usuario siempre en minúsculas
    username = data.get('username').lower()

    if User.query.filter_by(username=username).first():
        return jsonify({"success": False, "message": "El nombre de usuario ya existe."}), 409
    
    new_user = User(username=username)
    new_user.set_password(data.get('password'))
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"success": True, "message": "¡Usuario registrado!"}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    # ***** CAMBIO IMPORTANTE AQUÍ *****
    # Convertimos el username a minúsculas antes de buscar en la BD
    username = data.get('username').lower()
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.check_password(data.get('password')):
        return jsonify({"success": False, "message": "Usuario o contraseña incorrectos."}), 401
    
    user_data = {
        "username": user.username, "role": user.role, "shift_type": user.shift_type,
        "shift_start_date": user.shift_start_date.isoformat() if user.shift_start_date else None
    }
    return jsonify({"success": True, "message": "¡Login exitoso!", "user": user_data}), 200

# ... (El resto del archivo app.py permanece sin cambios) ...

@app.route('/api/user/shift', methods=['GET', 'POST'])
def handle_shift():
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
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first_or_404()
    if WorkPeriod.query.filter_by(user_id=user.id, status='activo').first():
        return jsonify({"success": False, "message": "Ya existe un período de trabajo activo."}), 409
    new_period = WorkPeriod(
        patente=data.get('patente'), rut=data.get('rut'), trip_origin=data.get('trip_origin'),
        trip_destination=data.get('trip_destination'), initial_amount=data.get('initial_amount'), worker=user
    )
    db.session.add(new_period)
    db.session.commit()
    return jsonify({"success": True, "message": "Período de trabajo iniciado.", "period": new_period.to_dict()}), 201

@app.route('/api/work_periods/history', methods=['GET'])
def get_work_period_history():
    username = request.args.get('username')
    user = User.query.filter_by(username=username).first_or_404()
    closed_periods = WorkPeriod.query.filter_by(user_id=user.id, status='cerrado').order_by(WorkPeriod.id.desc()).all()
    history_list = []
    for period in closed_periods:
        period_data = period.to_dict()
        period_data['expenses'] = [expense.to_dict() for expense in period.expenses]
        history_list.append(period_data)
    return jsonify({"success": True, "history": history_list})

@app.route('/api/expense_data', methods=['GET'])
def get_expense_data():
    user = User.query.filter_by(username=request.args.get('username')).first_or_404()
    active_period = WorkPeriod.query.filter_by(user_id=user.id, status='activo').first()
    if not active_period: return jsonify({"success": True, "active_period": None, "expenses": []})
    expenses = [expense.to_dict() for expense in active_period.expenses]
    return jsonify({"success": True, "active_period": active_period.to_dict(), "expenses": expenses})

@app.route('/api/expenses', methods=['POST'])
def add_expense():
    data = request.get_json()
    work_period = WorkPeriod.query.get_or_404(data.get('period_id'))
    if work_period.status == 'cerrado': return jsonify({"success": False, "message": "No se puede añadir gastos a un período cerrado."}), 403
    new_expense = Expense(category=data.get('category'), amount=data.get('amount'), notes=data.get('notes'), period=work_period)
    db.session.add(new_expense)
    db.session.commit()
    return jsonify({"success": True, "message": "Gasto añadido correctamente.", "expense": new_expense.to_dict()}), 201

@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    expense = Expense.query.get_or_404(expense_id)
    if expense.period.status == 'cerrado':
        return jsonify({"success": False, "message": "No se pueden eliminar gastos de un período cerrado."}), 403
    db.session.delete(expense)
    db.session.commit()
    return jsonify({"success": True, "message": "Gasto eliminado correctamente."})

@app.route('/api/work_periods/<int:period_id>/close', methods=['POST'])
def close_work_period(period_id):
    period = WorkPeriod.query.get_or_404(period_id)
    period.status = 'cerrado'
    db.session.commit()
    return jsonify({"success": True, "message": "El período de trabajo ha sido cerrado."})

@app.route('/api/admin/conductores', methods=['GET'])
def get_conductores():
    conductores = User.query.filter_by(role='conductor').all()
    return jsonify({"success": True, "conductores": [c.to_dict() for c in conductores]})

@app.route('/api/admin/conductor/<username>', methods=['PUT'])
def update_conductor(username):
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
    user = User.query.filter_by(username=username, role='conductor').first_or_404()
    schedule = []
    if user.shift_type and user.shift_start_date:
        schedule = calculate_shift_schedule(user.shift_start_date, user.shift_type)
    active_period = WorkPeriod.query.filter_by(user_id=user.id, status='activo').first()
    closed_periods = WorkPeriod.query.filter_by(user_id=user.id, status='cerrado').order_by(WorkPeriod.id.desc()).all()
    
    active_period_data = None
    if active_period:
        active_period_data = active_period.to_dict()
        active_period_data['expenses'] = [e.to_dict() for e in active_period.expenses]

    history_list = []
    for period in closed_periods:
        period_data = period.to_dict()
        period_data['expenses'] = [e.to_dict() for e in period.expenses]
        history_list.append(period_data)

    return jsonify({
        "success": True, "conductor": user.to_dict(), "schedule": schedule,
        "active_period": active_period_data, "history": history_list
    })

def calculate_shift_schedule(start_date, shift_type, num_days=365):
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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
