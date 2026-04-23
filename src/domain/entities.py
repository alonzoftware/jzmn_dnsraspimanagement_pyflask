from dataclasses import dataclass

@dataclass
class User:
    id: str
    username: str
    password_hash: str
    is_active: bool = True
    role: str = 'user'
    last_login: str = None
