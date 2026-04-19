from typing import Optional
from src.application.interfaces import UserRepositoryInterface
from src.domain.entities import User

class InMemoryUserRepository(UserRepositoryInterface):
    def __init__(self):
        # Seed with a default user for demonstration
        self.users = {
            "admin": User(id="1", username="admin", password_hash="admin123")
        }

    def get_by_username(self, username: str) -> Optional[User]:
        return self.users.get(username)
