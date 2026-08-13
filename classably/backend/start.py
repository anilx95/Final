import os
import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import uvicorn

if __name__ == "__main__":
    port_str = os.getenv("PORT", "8000")
    try:
        port = int(port_str)
    except (ValueError, TypeError):
        port = 8000

    print(f"Starting ClassAbly Server on 0.0.0.0:{port}...")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        proxy_headers=True,
        forwarded_allow_ips="*",
        log_level="info",
    )
