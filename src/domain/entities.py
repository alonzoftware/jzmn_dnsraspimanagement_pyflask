from dataclasses import dataclass

@dataclass
class User:
    id: str
    username: str
    password_hash: str
    is_active: bool = True
    role: str = 'user'
    last_login: str = None
    language: str = 'en'      # UI language preference: 'en' | 'es'
    theme: str = 'system'     # UI theme preference: 'system' | 'light' | 'dark'
