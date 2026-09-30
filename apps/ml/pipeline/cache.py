import time
from typing import Dict, Any, Optional

class PredictionCache:
    """
    In-memory TTL cache to satisfy production guardrails:
    Never re-run heavy inference on every HTTP request.
    """
    def __init__(self, ttl_seconds: int = 600):
        self.ttl = ttl_seconds
        self._cache: Dict[str, Dict[str, Any]] = {}

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        clean_key = key.strip().upper()
        if clean_key in self._cache:
            entry = self._cache[clean_key]
            if time.time() - entry["cached_at"] < self.ttl:
                return entry["data"]
            else:
                del self._cache[clean_key]
        return None

    def set(self, key: str, data: Dict[str, Any]) -> None:
        clean_key = key.strip().upper()
        self._cache[clean_key] = {
            "cached_at": time.time(),
            "data": data,
        }

prediction_cache = PredictionCache(ttl_seconds=900)  # 15 minutes TTL
