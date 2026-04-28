
import asyncio
from sqlalchemy import text
import sys
import os

# Add the project root to sys.path to import app modules
sys.path.append(os.getcwd())

from app.database import engine

async def reset_payment_data():
    # Order matters due to foreign keys: payment_history references subscriptions
    commands = [
        "DELETE FROM payment_history;",
        "DELETE FROM subscriptions;"
    ]
    
    async with engine.begin() as conn:
        print("Starting payment data reset...")
        for cmd in commands:
            try:
                print(f"Executing: {cmd}")
                await conn.execute(text(cmd))
            except Exception as e:
                print(f"Error executing {cmd}: {e}")
        print("Commit successful.")

if __name__ == "__main__":
    try:
        asyncio.run(reset_payment_data())
        print("Payment and subscription data cleared successfully.")
    except Exception as e:
        print(f"Failed to reset data: {e}")
