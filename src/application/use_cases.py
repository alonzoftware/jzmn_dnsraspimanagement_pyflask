from typing import Optional
from src.application.interfaces import UserRepositoryInterface
from src.domain.entities import User

from datetime import datetime

class AuthenticateUserUseCase:
    def __init__(self, user_repository: UserRepositoryInterface):
        self._user_repository = user_repository

    def execute(self, username: str, password: str) -> Optional[User]:
        user = self._user_repository.get_by_username(username)
        
        if user and self._verify_password(password, user.password_hash):
            user.last_login = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            self._user_repository.update_user(user)
            return user
        
        return None
    
    def _verify_password(self, password: str, password_hash: str) -> bool:
        # In a real application, use bcrypt or passlib.
        # For this demonstration, we'll do a simple match (not safe for production!).
        return password == password_hash
