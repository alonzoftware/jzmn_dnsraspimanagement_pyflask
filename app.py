import os
from flask import Flask, redirect, url_for
from src.infrastructure.sqlite_repository import SQLiteUserRepository
from src.application.use_cases import AuthenticateUserUseCase
from src.presentation.routes import register_auth_routes
from src.domain.entities import User
import uuid

app = Flask(__name__)
# In a real app, this should be an environment variable
app.secret_key = os.environ.get('SECRET_KEY', 'dev_secret_key')

# Dependency Injection setup
user_repo = SQLiteUserRepository(db_path='dns_raspi.db')

# Ensure default admin user exists
if not user_repo.get_by_username('admin'):
    admin_user = User(
        id=str(uuid.uuid4()),
        username='admin',
        password_hash='admin', # Note: In a real application, this should be hashed
        is_active=True
    )
    user_repo.add_user(admin_user)

auth_use_case = AuthenticateUserUseCase(user_repo)

# Register Blueprints
auth_bp = register_auth_routes(auth_use_case)
app.register_blueprint(auth_bp)

@app.route('/dashboard')
def dashboard():
    # If not logged in, typically we'd redirect to login.
    return '<h1>DNS RaspberryPI Management Dashboard</h1><p>Welcome to the admin panel.</p><p><a href="/">Back to Login</a></p>'

if __name__ == '__main__':
    app.run(debug=True)
