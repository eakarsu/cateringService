#!/usr/bin/env bash
set -euo pipefail

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
fi

BACKEND_PORT="${BACKEND_PORT:-5001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
DB_NAME="catering_service"

echo "=========================================="
echo "  Catering Service AI Platform"
echo "=========================================="
echo ""

# Set default DATABASE_URL if not provided
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "==> DATABASE_URL not set, using default..."
  # Use current system username for PostgreSQL connection (common on macOS)
  DB_USER="${USER:-$(whoami)}"
  export DATABASE_URL="postgresql://${DB_USER}@localhost:5432/${DB_NAME}?schema=public"
fi
echo "DATABASE_URL: ${DATABASE_URL}"
echo ""

# Check if PostgreSQL is running
echo "==> Checking PostgreSQL status..."
if ! command -v psql &> /dev/null; then
  echo "WARNING: psql command not found. Assuming PostgreSQL is configured correctly."
else
  # Try to connect to PostgreSQL server (not specific database)
  if ! psql -h localhost -c "SELECT 1;" postgres >/dev/null 2>&1 && \
     ! psql -c "SELECT 1;" postgres >/dev/null 2>&1; then
    echo ""
    echo "ERROR: Cannot connect to PostgreSQL server."
    echo ""
    echo "Please start PostgreSQL:"
    echo "  macOS:  brew services start postgresql"
    echo "  Linux:  sudo systemctl start postgresql"
    echo ""
    exit 1
  fi
  echo "PostgreSQL server is running."

  # Create database if it doesn't exist
  echo ""
  echo "==> Ensuring database '${DB_NAME}' exists..."
  if ! psql -h localhost -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}" && \
     ! psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
    echo "Creating database '${DB_NAME}'..."
    createdb "${DB_NAME}" 2>/dev/null || createdb -h localhost "${DB_NAME}" 2>/dev/null || {
      echo "Could not create database automatically."
      echo "Please create it manually: createdb ${DB_NAME}"
      exit 1
    }
    echo "Database created successfully!"
  else
    echo "Database '${DB_NAME}' already exists."
  fi
fi

# Clean up processes on both ports
echo ""
echo "==> Cleaning up processes on ports ${BACKEND_PORT} and ${FRONTEND_PORT}..."
for PORT in ${BACKEND_PORT} ${FRONTEND_PORT}; do
  if lsof -ti tcp:"${PORT}" >/dev/null 2>&1; then
    echo "Found processes on port ${PORT}, killing them..."
    lsof -ti tcp:"${PORT}" | xargs kill -9 || true
    sleep 1
  fi
done
echo "Port cleanup complete."

# Backend setup
echo ""
echo "=========================================="
echo "  Setting up Backend"
echo "=========================================="

cd backend

# Update .env file with current DATABASE_URL
echo ""
echo "==> Updating backend .env file..."
if [ -f ".env" ]; then
  # Update DATABASE_URL in .env if it exists
  if grep -q "^DATABASE_URL=" .env; then
    sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env 2>/dev/null || \
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
  else
    echo "DATABASE_URL=\"${DATABASE_URL}\"" >> .env
  fi
else
  cat > .env << EOF
DATABASE_URL="${DATABASE_URL}"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
PORT=${BACKEND_PORT}
OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-}"
OPENROUTER_MODEL="${OPENROUTER_MODEL:-}"
EOF
fi
echo "Backend .env file updated."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo ""
  echo "==> Installing backend dependencies..."
  npm install
else
  echo ""
  echo "==> Backend dependencies already installed."
fi

# Generate Prisma client
echo ""
echo "==> Generating Prisma client..."
npx prisma generate

# Run database migrations
echo ""
echo "==> Running Prisma migrations..."
npx prisma db push || {
  echo "Migration failed. Trying to create initial schema..."
  npx prisma db push --force-reset
}

# Check if database has been seeded
echo ""
echo "==> Checking if database needs seeding..."
USER_COUNT=$(psql "${DATABASE_URL}" -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -d ' ' || echo "0")
if [ "${USER_COUNT}" = "0" ] || [ -z "${USER_COUNT}" ]; then
  echo "Database appears empty. Running seed..."
  npm run prisma:seed || node prisma/seed.js
else
  echo "Database already contains data (${USER_COUNT} users). Skipping seed."
fi

cd ..

# Frontend setup
echo ""
echo "=========================================="
echo "  Setting up Frontend"
echo "=========================================="

cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo ""
  echo "==> Installing frontend dependencies..."
  npm install
else
  echo ""
  echo "==> Frontend dependencies already installed."
fi

cd ..

# Start the application
echo ""
echo "=========================================="
echo "  Starting Catering Service AI Platform"
echo "=========================================="
echo ""
echo "Backend running at:  http://localhost:${BACKEND_PORT}"
echo "Frontend running at: http://localhost:${FRONTEND_PORT}"
echo ""
echo "Test credentials:"
echo "  Admin:   admin@cateringpro.com / password123"
echo "  Manager: sarah@cateringpro.com / password123"
echo "  Client:  john@smithwedding.com / password123"
echo "  Staff:   chef.alex@cateringpro.com / password123"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "==> Shutting down services..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  # Clean up any remaining processes on ports
  lsof -ti tcp:"${BACKEND_PORT}" | xargs kill -9 2>/dev/null || true
  lsof -ti tcp:"${FRONTEND_PORT}" | xargs kill -9 2>/dev/null || true
  echo "Services stopped."
  exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
echo "==> Starting backend server..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo "==> Waiting for backend to start..."
sleep 3

# Start frontend
echo "==> Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for both processes
wait
