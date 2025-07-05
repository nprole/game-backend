# GEO Trivia Multiplayer Game Setup Guide

## Prerequisites

1. **MongoDB Installation**
   - Install MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
   - Or use MongoDB Atlas (cloud service)

2. **Environment Variables**
   Create a `.env` file in the root directory with:
   ```
   MONGODB_URI=mongodb://localhost:27017/game-app
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   PORT=3000
   REDIS_URL=redis://localhost:6379
   ```

3. **Redis Installation**
   - Install Redis Server from [redis.io](https://redis.io/download)
   - Or use Docker: `docker run -d -p 6379:6379 redis:alpine`

## Database Setup

1. **Start MongoDB**
   ```bash
   # Windows
   net start MongoDB
   
   # macOS/Linux
   sudo systemctl start mongod
   ```

2. **Start Redis**
   ```bash
   # Windows (if installed via MSI)
   redis-server
   
   # macOS/Linux
   sudo systemctl start redis
   
   # Or using Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

3. **Verify Connection**
   - MongoDB should be running on `localhost:27017`
   - Redis should be running on `localhost:6379`
   - The application will automatically create the database `game-app`

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login with username/password
- `GET /auth/profile` - Get user profile (requires JWT token)

### Game
- `GET /game/history` - Get user's game history (requires JWT token)
- `GET /game/stats` - Get user's game statistics (requires JWT token)
- `GET /game/:gameId` - Get specific game details (requires JWT token)

### WebSocket Events
- `connect` - Connect to game server (requires JWT token)
- `joinQueue` - Join matchmaking queue
- `leaveQueue` - Leave matchmaking queue
- `submitAnswer` - Submit answer during game round
- `gameStarted` - Game has started (received event)
- `nextRound` - Next round has started (received event)
- `gameFinished` - Game has finished (received event)

### Request Examples

**Register User:**
```json
POST /auth/register
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}
```

**Login:**
```json
POST /auth/login
{
  "username": "testuser",
  "password": "password123"
}
```

**Get Profile (with Authorization header):**
```
GET /auth/profile
Authorization: Bearer <jwt-token>
```

## Features

### Authentication
- ✅ User registration with email/username validation
- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ MongoDB integration with Mongoose
- ✅ User profile management
- ✅ CORS configuration for frontend
- ✅ Environment variable configuration

### Game Features
- ✅ Real-time multiplayer flag guessing game
- ✅ WebSocket-based communication with Socket.IO
- ✅ Redis-powered matchmaking system
- ✅ 10 rounds of flag trivia with multiple choice answers
- ✅ Scoring system with time bonuses
- ✅ Real-time game state synchronization
- ✅ Game history and statistics tracking

## Security Features

- Passwords are hashed using bcrypt (salt rounds: 10)
- JWT tokens expire after 60 minutes
- Unique constraints on username and email
- Input validation and error handling 