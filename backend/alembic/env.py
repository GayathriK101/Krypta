# This file configures the Alembic database migration environment, imports models for autogeneration, and loads dynamic database settings.
import os
import sys
from logging.config import fileConfig
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

from alembic import context

# Add the parent directory of 'app' to python system path so app imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Load environment variables from a .env file
load_dotenv()

# Retrieve database connection URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/krypta")

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Overwrite the sqlalchemy.url option in alembic config with DATABASE_URL
config.set_main_option("sqlalchemy.url", DATABASE_URL)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import the database declarative Base and all models for autogenerate support
from app.database import Base
from app.models import User, Workspace, WorkspaceMember, Secret, AuditLog

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """
    Runs database migrations in 'offline' mode by generating SQL script output without establishing a live connection.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Runs database migrations in 'online' mode by establishing a connection to the active database and applying migrations.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

