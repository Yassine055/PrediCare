import os
import subprocess

port = os.environ.get("PORT", "8000")
subprocess.run([
    "uvicorn", "api.main:app",
    "--host", "0.0.0.0",
    "--port", str(port)
])