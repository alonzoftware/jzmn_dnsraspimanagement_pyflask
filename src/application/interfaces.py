from abc import ABC, abstractmethod
from typing import Optional
from src.domain.entities import User

class UserRepositoryInterface(ABC):
    @abstractmethod
    def get_by_username(self, username: str) -> Optional[User]:
        pass
