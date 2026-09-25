import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(dotenv_path)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "algorithmic_mirror")

logger = logging.getLogger("uvicorn")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    logger.info(f"Connecting to MongoDB at {MONGODB_URI}...")
    try:
        db_instance.client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
        db_instance.db = db_instance.client[DB_NAME]
        # Ping database to confirm connection
        await db_instance.client.admin.command('ping')
        logger.info(f"Successfully connected to MongoDB database: '{DB_NAME}'")
    except Exception as e:
        logger.warning(f"MongoDB connection failed: {e}. App will proceed, but DB persistent features require MongoDB service running.")

async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        logger.info("MongoDB connection closed.")

def get_database():
    return db_instance.db
