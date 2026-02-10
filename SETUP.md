# Wave Laundry Backend Setup

## Prerequisites

- Node.js 18+
- MySQL 8.0+

## Installation Steps

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Update the database credentials:
     ```env
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=your_mysql_password
     DB_NAME=wave_laundry
     DB_PORT=3306
     PORT=3000
     NODE_ENV=development
     ```

3. **Create Database Schema**
   ```bash
   mysql -u root -p < schema.sql
   ```
   Or manually run the SQL commands in your MySQL client.

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   Server will run on `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /api/health` - Server status

### Users CRUD
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Frontend Integration

To connect the frontend (Expo app) to this backend:

### 1. Update API Base URL
In your frontend code, set the API base URL:
```typescript
const API_BASE_URL = 'http://localhost:3000/api'; // Development
// const API_BASE_URL = 'https://your-production-url/api'; // Production
```

### 2. Make API Calls
Example user creation:
```typescript
const createUser = async (userData) => {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  return response.json();
};
```

### 3. Handle CORS
The backend is configured with CORS enabled for all origins in development. Update `src/server.ts` if you need to restrict origins for production:
```typescript
app.use(cors({
  origin: 'https://your-frontend-url.com',
  credentials: true,
}));
```

## Database Schema

### users table
- `id` - Primary key (auto-increment)
- `name` - User full name
- `email` - User email (unique)
- `phone` - User phone number (optional)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### orders table (example)
- `id` - Primary key
- `user_id` - Foreign key to users
- `order_date` - Order timestamp
- `status` - Order status (pending, processing, completed, cancelled)
- `total_amount` - Order total
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## Troubleshooting

### Database Connection Error
- Verify MySQL is running
- Check DB credentials in `.env`
- Ensure database `wave_laundry` exists

### Port Already in Use
Change the `PORT` in `.env` file or kill the process using port 3000.

### Module Not Found Errors
```bash
npm install
```

## Build for Production

1. **Build TypeScript**
   ```bash
   npm run build
   ```

2. **Start Production Server**
   ```bash
   npm start
   ```

## Notes

- The backend uses TypeScript with strict type checking
- All endpoints return JSON responses with consistent structure
- Error handling includes proper HTTP status codes
- Database uses MySQL connection pooling for better performance
