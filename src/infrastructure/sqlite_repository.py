import sqlite3
import os
from typing import Optional
from src.application.interfaces import UserRepositoryInterface
from src.domain.entities import User

class SQLiteUserRepository(UserRepositoryInterface):
    def __init__(self, db_path: str = 'users.db'):
        self.db_path = db_path
        self._initialize_db()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _initialize_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT 1
                )
            ''')
            conn.commit()

    def get_by_username(self, username: str) -> Optional[User]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, username, password_hash, is_active FROM users WHERE username = ?', (username,))
            row = cursor.fetchone()
            
            if row:
                return User(
                    id=row['id'],
                    username=row['username'],
                    password_hash=row['password_hash'],
                    is_active=bool(row['is_active'])
                )
        return None

    def add_user(self, user: User) -> None:
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'INSERT INTO users (id, username, password_hash, is_active) VALUES (?, ?, ?, ?)',
                    (user.id, user.username, user.password_hash, user.is_active)
                )
                conn.commit()
        except sqlite3.IntegrityError:
            # User already exists
            pass
