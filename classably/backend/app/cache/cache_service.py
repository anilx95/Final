import json

from app.cache.redis_client import redis_client


class CacheService:

    async def set_json(
        self,
        key: str,
        value,
        ttl: int = 300,
    ):
        await redis_client.setex(
            key,
            ttl,
            json.dumps(value),
        )

    async def get_json(
        self,
        key: str,
    ):
        value = await redis_client.get(key)

        if value is None:
            return None

        return json.loads(value)

    async def delete(
        self,
        key: str,
    ):
        await redis_client.delete(key)


cache_service = CacheService()