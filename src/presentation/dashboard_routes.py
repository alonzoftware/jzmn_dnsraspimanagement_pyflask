from flask import Blueprint, render_template, session, redirect, url_for, request, jsonify
from src.infrastructure.sqlite_repository import SQLiteUserRepository
from src.domain.entities import User
import uuid

dashboard_bp = Blueprint('dashboard', __name__)
user_repo = SQLiteUserRepository(db_path='dns_raspi.db')

def admin_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get('role') not in ('admin', 'sadmin'):
            return redirect(url_for('dashboard.dashboard'))
        return f(*args, **kwargs)
    return decorated_function

@dashboard_bp.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@dashboard_bp.route('/top-talkers')
def top_talkers():
    return render_template('top_talkers.html')

@dashboard_bp.route('/check-internet')
def check_internet():
    return render_template('check_internet.html')

@dashboard_bp.route('/dns-cache')
def dns_cache():
    if session.get('role') not in ('admin', 'sadmin'):
        return redirect(url_for('dashboard.dashboard'))
    return render_template('dns_cache.html')

@dashboard_bp.route('/response-policy')
def response_policy():
    if session.get('role') not in ('admin', 'sadmin'):
        return redirect(url_for('dashboard.dashboard'))
    return render_template('response_policy.html')

@dashboard_bp.route('/compare-performance')
def compare_performance():
    return render_template('compare_performance.html')

@dashboard_bp.route('/system-users')
@admin_required
def system_users():
    users = user_repo.get_all()
    return render_template('system_users.html', users=users)

@dashboard_bp.route('/api/users', methods=['POST'])
@admin_required
def add_user():
    data = request.json
    if user_repo.get_by_username(data['username']):
        return jsonify({'error': 'User already exists'}), 400
        
    if data.get('role') == 'sadmin' and session.get('role') != 'sadmin':
        return jsonify({'error': 'Only Super Admins can assign the SAdmin role'}), 403
        
    new_user = User(
        id=str(uuid.uuid4()),
        username=data['username'],
        password_hash=data['password'],
        is_active=True,
        role=data['role']
    )
    user_repo.add_user(new_user)
    return jsonify({'success': True})

@dashboard_bp.route('/api/users/<username>', methods=['PUT'])
@admin_required
def edit_user(username):
    data = request.json
    user = user_repo.get_by_username(username)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    if user.role == 'sadmin' and session.get('role') != 'sadmin':
        return jsonify({'error': 'Only Super Admins can modify Super Admin accounts'}), 403
        
    if user.role == 'admin' and session.get('role') == 'admin' and user.username != session.get('username'):
        return jsonify({'error': 'Admins cannot modify other Admin accounts'}), 403
        
    if 'username' in data and data['username'] != username:
        if user_repo.get_by_username(data['username']):
            return jsonify({'error': 'Username already exists'}), 400
        user.username = data['username']
        
    if 'role' in data:
        if data['role'] == 'sadmin' and session.get('role') != 'sadmin':
            return jsonify({'error': 'Only Super Admins can assign the SAdmin role'}), 403
        user.role = data['role']
    if 'password' in data and data['password']:
        user.password_hash = data['password']
        
    user_repo.update_user(user)
    return jsonify({'success': True})

@dashboard_bp.route('/api/users/change-password', methods=['POST'])
def change_own_password():
    if not session.get('username'):
        return jsonify({'error': 'Not authenticated'}), 401
    data = request.json
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    if not current_password or not new_password:
        return jsonify({'error': 'All fields are required'}), 400
    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400
    user = user_repo.get_by_username(session['username'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user.password_hash != current_password:
        return jsonify({'error': 'Current password is incorrect'}), 403
    user.password_hash = new_password
    user_repo.update_user(user)
    return jsonify({'success': True})

@dashboard_bp.route('/api/users/<username>', methods=['DELETE'])
@admin_required
def delete_user(username):
    if username == 'admin':
        return jsonify({'error': 'Cannot delete default admin'}), 400
    user = user_repo.get_by_username(username)
    if user:
        if user.role == 'sadmin' and session.get('role') != 'sadmin':
            return jsonify({'error': 'Only Super Admins can delete Super Admin accounts'}), 403
        if user.role == 'admin' and session.get('role') == 'admin' and user.username != session.get('username'):
            return jsonify({'error': 'Admins cannot delete other Admin accounts'}), 403
            
    user_repo.delete_user(username)
    return jsonify({'success': True})