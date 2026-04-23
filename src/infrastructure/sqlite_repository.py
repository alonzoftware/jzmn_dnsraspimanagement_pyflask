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
            # Add columns if they don't exist
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")
            except sqlite3.OperationalError:
                pass
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN last_login TEXT")
            except sqlite3.OperationalError:
                pass
            conn.commit()

    def get_by_username(self, username: str) -> Optional[User]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
            row = cursor.fetchone()
            
            if row:
                return User(
                    id=row['id'],
                    username=row['username'],
                    password_hash=row['password_hash'],
                    is_active=bool(row['is_active']),
                    role=row['role'],
                    last_login=row['last_login']
                )
        return None
        
    def get_all(self) -> list[User]:
        users = []
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users')
            for row in cursor.fetchall():
                users.append(User(
                    id=row['id'],
                    username=row['username'],
                    password_hash=row['password_hash'],
                    is_active=bool(row['is_active']),
                    role=row['role'],
                    last_login=row['last_login']
                ))
        return users

    def add_user(self, user: User) -> None:
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'INSERT INTO users (id, username, password_hash, is_active, role, last_login) VALUES (?, ?, ?, ?, ?, ?)',
                    (user.id, user.username, user.password_hash, user.is_active, user.role, user.last_login)
                )
                conn.commit()
        except sqlite3.IntegrityError:
            # User already exists
            pass
            
    def update_user(self, user: User) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'UPDATE users SET username = ?, password_hash = ?, is_active = ?, role = ?, last_login = ? WHERE id = ?',
                (user.username, user.password_hash, user.is_active, user.role, user.last_login, user.id)
            )
            conn.commit()
            
    def delete_user(self, username: str) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM users WHERE username = ?', (username,))
            conn.commit()
