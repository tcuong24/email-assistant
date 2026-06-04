import builtins
import datetime
import threading
from dotenv import load_dotenv

# Override built-in print to include GMT+7 timestamps
_original_print = builtins.print
def timestamped_print(*args, **kwargs):
    vn_tz = datetime.timezone(datetime.timedelta(hours=7))
    timestamp = datetime.datetime.now(vn_tz).strftime("[%Y-%m-%d %H:%M:%S]")
    if args:
        _original_print(f"{timestamp} {args[0]}", *args[1:], **kwargs)
    else:
        _original_print(timestamp, **kwargs)
builtins.print = timestamped_print

load_dotenv() # Load variables from .env


import uvicorn
from fastapi import FastAPI
from consumer import start_consumer

app = FastAPI(title="AI Service")

@app.get("/health")
def health():
    return {"status": "UP"}

if __name__ == "__main__":
    # Chạy Kafka consumer trên thread riêng
    t = threading.Thread(target=start_consumer, daemon=True)
    t.start()

    uvicorn.run(app, host="0.0.0.0", port=8085)