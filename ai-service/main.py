import threading
from dotenv import load_dotenv
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