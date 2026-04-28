
import asyncio
from sqlalchemy import text
import sys
import os

sys.path.append(os.getcwd())

from app.database import engine

async def check_columns():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'subscriptions'"))
        columns = [row[0] for row in res.fetchall()]
        print(f"Columns: {columns}")

if __name__ == "__main__":
    asyncio.run(check_columns())
