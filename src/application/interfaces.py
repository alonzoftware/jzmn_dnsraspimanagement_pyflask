from abc import ABC, abstractmethod
from typing import Optional
from src.domain.entities import User

class UserRepositoryInterface(ABC):
    @abstractmethod
    def get_by_username(self, username: str) -> Optional[User]:
        pass
    
    @abstractmethod
    def get_all(self) -> list[User]:
        pass
        
    @abstractmethod
    def add_user(self, user: User) -> None:
        pass
        
    @abstractmethod
    def update_user(self, user: User) -> None:
        pass
        
    @abstractmethod
    def delete_user(self, username: str) -> None:
        pass
