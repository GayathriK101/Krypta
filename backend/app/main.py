# This file initializes the FastAPI application and mounts the authentication, workspaces, and secrets routers.
from fastapi import FastAPI
from app.routers import users, workspaces, secrets

# Initialize the FastAPI application
app = FastAPI(
    title="Krypta Secret Manager API",
    description="Secure, isolated API to manage development, staging, and production environment secrets.",
    version="1.0.0"
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
