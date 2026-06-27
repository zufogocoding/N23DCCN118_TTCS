import os

# Database Configuration
# If DATABASE_URL is set in environment (e.g. inside Docker), use it.
# Otherwise (e.g. running seed script on host), default to the host port 5433 mapping.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://krock_on_socks:TrongTuanQuynnhTTCS@localhost:5433/soundclown?schema=public"
)

# Implicit ALS Model Hyperparameters (Tuned parameters will override these)
ALS_FACTORS = int(os.getenv("ALS_FACTORS", "20"))
ALS_REGULARIZATION = float(os.getenv("ALS_REGULARIZATION", "0.1"))
ALS_ALPHA = float(os.getenv("ALS_ALPHA", "40.0"))
ALS_ITERATIONS = int(os.getenv("ALS_ITERATIONS", "15"))

# Port and Host
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
