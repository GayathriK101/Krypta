# This file sets up the SQLAlchemy database connection, session local factory, and declarative Base class.
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables from a .env file if present
load_dotenv()


# Retrieve database connection URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/krypta")

# Create the SQLAlchemy engine to interact with PostgreSQL
engine = create_engine(DATABASE_URL)

# Configure sessionmaker for creating local database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for SQLAlchemy models to inherit from
Base = declarative_base()

# Helper function to yield database sessions for requests and close them afterwards
def get_db():
    """
    Creates a new SQLAlchemy session, yields it to the request context, and closes it when the request is complete.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
