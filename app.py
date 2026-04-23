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
        is_active=True,
        role='admin'
    )
    user_repo.add_user(admin_user)
else:
    admin_user = user_repo.get_by_username('admin')
    if admin_user.role != 'admin':
        admin_user.role = 'admin'
        user_repo.update_user(admin_user)

if not user_repo.get_by_username('user1'):
    user1 = User(
        id=str(uuid.uuid4()),
        username='user1',
        password_hash='user123',
        is_active=True,
        role='user'
    )
    user_repo.add_user(user1)

auth_use_case = AuthenticateUserUseCase(user_repo)

auth_bp = register_auth_routes(auth_use_case)

# Register Blueprints
from src.presentation.api_routes import api_bp
from src.presentation.dashboard_routes import dashboard_bp

app.register_blueprint(auth_bp)
app.register_blueprint(api_bp)
app.register_blueprint(dashboard_bp)

if __name__ == '__main__':
    app.run(debug=True)
