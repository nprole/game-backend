# MongoDB Auth Setup Guide

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
   ```

## Database Setup

1. **Start MongoDB**
   ```bash
   # Windows
   net start MongoDB
   
   # macOS/Linux
   sudo systemctl start mongod
   ```

2. **Verify Connection**
   - MongoDB should be running on `localhost:27017`
   - The application will automatically create the database `game-app`

## API Endpoints

### Authentication
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login with username/password
- `GET /auth/profile` - Get user profile (requires JWT token)

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

- ✅ User registration with email/username validation
- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ MongoDB integration with Mongoose
- ✅ User profile management
- ✅ CORS configuration for frontend
- ✅ Environment variable configuration

## Security Features

- Passwords are hashed using bcrypt (salt rounds: 10)
- JWT tokens expire after 60 minutes
- Unique constraints on username and email
- Input validation and error handling 