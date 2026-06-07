# This file initializes the FastAPI application, configures CORS, and mounts all routers.
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import users, workspaces, secrets

# Initialize the FastAPI application
app = FastAPI(
    title="Krypta Secret Manager API",
    description="Secure, isolated API to manage development, staging, and production environment secrets.",
    version="1.0.0"
)

# Allow the Next.js frontend to communicate with the backend without CORS errors.
# Both localhost and 127.0.0.1 variants are included to cover all browser behaviors.
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the users/auth router under /api/v1
app.include_router(users.router, prefix="/api/v1")

# Register the workspaces router under /api/v1
app.include_router(workspaces.router, prefix="/api/v1")

# Register the secrets router under /api/v1
app.include_router(secrets.router, prefix="/api/v1")

@app.get("/")
def read_root():
    """
    Exposes a root health check endpoint that returns a simple welcome message to verify the API is up.
    """
    return {"message": "Welcome to Krypta Secret Manager API. Access docs at /docs"}
