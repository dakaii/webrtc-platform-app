#!/bin/bash

echo "🚀 Setting up WebRTC Platform..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📄 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. Please edit it with your configuration."
fi

# Setup Backend
echo "🔧 Setting up NestJS Backend..."
cd backend
npm install
echo "✅ Backend dependencies installed"

# Setup Signaling Server
echo "🦀 Setting up Rust Signaling Server..."
cd ../signaling
cargo check
echo "✅ Rust signaling server dependencies checked"

# Setup Frontend
if [ -d "../frontend" ]; then
    echo "🎨 Setting up Vue.js Frontend..."
    cd ../frontend
    npm install
    echo "✅ Frontend dependencies installed"
fi

cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Start PostgreSQL: docker-compose up postgres -d"
echo "3. Run migrations: cd backend && npm run migration:up"
echo "4. Start backend: cd backend && npm run start:dev"
echo "5. Start signaling: cd signaling && JWT_SECRET=dev-super-secret-jwt-key-change-in-production RUST_LOG=info cargo run --release"
echo "6. Start frontend: cd frontend && npm run dev"
echo ""
echo "Services will be available at:"
echo "- Frontend: http://localhost:8080"
echo "- Backend API: http://localhost:4000"
echo "- Signaling Server: ws://localhost:9000"
echo ""
