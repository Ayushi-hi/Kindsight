from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client = AsyncIOMotorClient(settings.mongo_uri)
db = client[settings.mongo_db_name]

scans_collection = db["scans"]
predictions_collection = db["predictions"]
reports_collection = db["reports"]
chat_sessions_collection = db["chat_sessions"]
users_collection = db["users"]
