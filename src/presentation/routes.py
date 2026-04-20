from flask import Blueprint, request, render_template, redirect, url_for, flash
from src.application.use_cases import AuthenticateUserUseCase

auth_bp = Blueprint('auth', __name__)

def register_auth_routes(authenticate_use_case: AuthenticateUserUseCase):
    @auth_bp.route('/', methods=['GET', 'POST'])
    def login():
        if request.method == 'POST':
            username = request.form.get('username')
            password = request.form.get('password')
            
            user = authenticate_use_case.execute(username, password)
            if user:
                # In a real app, you'd set a session here.
                flash('Login successful!', 'success')
                return redirect(url_for('dashboard.dashboard'))
            else:
                flash('Invalid username or password.', 'error')
                
        return render_template('login.html')

    return auth_bp
