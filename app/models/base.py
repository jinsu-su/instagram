from sqlalchemy.orm import declarative_base
from sqlalchemy import Text, TypeDecorator
from app.utils.security import encrypt_token, decrypt_token

Base = declarative_base()

class EncryptedToken(TypeDecorator):
    """
    Automated encryption/decryption for tokens.
    Saves encrypted to DB, returns plain-text to code.
    """
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        # Don't double-encrypt if it already looks like a Fernet token
        if isinstance(value, str) and value.startswith("gAAAAA"):
            return value
        return encrypt_token(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        # If it doesn't look like an encrypted token, return as is
        if isinstance(value, str) and not value.startswith("gAAAAA"):
            return value

        decrypted = decrypt_token(value)
        return decrypted if decrypted else value






