# Telegram Clone - Full Stack Messaging Application

A complete Telegram-like messaging application built with modern web technologies, featuring real-time messaging, file sharing, voice/video calls, and more.

## Features

### Core Messaging
- ✅ Real-time messaging with Socket.io
- ✅ Private and group chats
- ✅ Message editing and deletion
- ✅ Message reactions with emojis
- ✅ Reply to messages
- ✅ Forward messages
- ✅ Message search
- ✅ Typing indicators
- ✅ Read receipts

### File Sharing
- ✅ Image, video, audio, and document sharing
- ✅ Automatic thumbnail generation
- ✅ File preview
- ✅ Multiple file upload
- ✅ Download files

### User Features
- ✅ User authentication (login/register)
- ✅ User profiles with avatars
- ✅ Online/offline status
- ✅ Last seen timestamp
- ✅ Contact management
- ✅ User search
- ✅ Block/unblock users

### Chat Management
- ✅ Create private chats
- ✅ Create group chats
- ✅ Add/remove group members
- ✅ Admin roles and permissions
- ✅ Chat archiving
- ✅ Mute notifications
- ✅ Pin chats
- ✅ Delete chats

### Advanced Features
- ✅ Voice and video calling (WebRTC)
- ✅ Dark/light theme
- ✅ Multi-language support
- ✅ Desktop notifications
- ✅ Message encryption ready
- ✅ Mobile responsive design
- ✅ Infinite scroll for messages
- ✅ Unread message counter

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.io** - Real-time communication
- **PostgreSQL** - Database
- **Sequelize** - ORM
- **JWT** - Authentication
- **Multer** - File uploads
- **Sharp** - Image processing
- **bcryptjs** - Password hashing

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Redux Toolkit** - State management
- **Material-UI (MUI)** - UI components
- **Socket.io Client** - Real-time client
- **React Router** - Routing
- **React Hook Form** - Form handling
- **Axios** - HTTP client
- **date-fns** - Date formatting

## Installation

### Prerequisites
- Node.js 16+ 
- PostgreSQL 12+
- npm or yarn

### Database Setup

1. Install PostgreSQL if not already installed
2. Create a database:
```sql
CREATE DATABASE telegram_clone;
```

### Environment Configuration

1. Configure backend environment variables in `server/.env`:
```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/telegram_clone
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
NODE_ENV=development
UPLOAD_DIR=uploads
MAX_FILE_SIZE=104857600
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,video/mp4,application/pdf,application/zip
```

2. Configure frontend environment variables in `client/.env` (optional):
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### Installation Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd telegram-clone
```

2. Install dependencies:
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Run database migrations:
```bash
cd server
npm run migrate
```

4. Start the application:

**Development mode (from root directory):**
```bash
npm run dev
```

This will start both the backend server (port 5000) and frontend development server (port 3000).

**Production mode:**
```bash
# Build frontend
cd client
npm run build

# Start server
cd ../server
npm start
```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Register a new account or login with existing credentials
3. Start chatting!

### Default Ports
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api`
- Socket.io: `http://localhost:5000`

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token

### User Endpoints
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update user profile
- `POST /api/users/me/avatar` - Upload avatar
- `GET /api/users/search` - Search users
- `GET /api/users/:userId` - Get user by ID
- `GET /api/users/contacts` - Get user contacts
- `POST /api/users/contacts` - Add contact

### Chat Endpoints
- `GET /api/chats` - Get user's chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/:chatId` - Get chat details
- `PUT /api/chats/:chatId` - Update chat
- `DELETE /api/chats/:chatId` - Delete chat
- `POST /api/chats/:chatId/members` - Add members
- `DELETE /api/chats/:chatId/members/:userId` - Remove member

### Message Endpoints
- `GET /api/messages/chat/:chatId` - Get chat messages
- `POST /api/messages` - Send message
- `PUT /api/messages/:messageId` - Edit message
- `DELETE /api/messages/:messageId` - Delete message
- `POST /api/messages/:messageId/reactions` - Add reaction
- `POST /api/messages/:messageId/forward` - Forward message

### File Endpoints
- `POST /api/files/upload` - Upload single file
- `POST /api/files/upload-multiple` - Upload multiple files
- `GET /api/files/:fileId` - Get file info
- `GET /api/files/:fileId/download` - Download file
- `DELETE /api/files/:fileId` - Delete file

## Socket Events

### Client to Server
- `join_chat` - Join a chat room
- `leave_chat` - Leave a chat room
- `send_message` - Send a message
- `typing` - Send typing indicator
- `mark_read` - Mark message as read
- `edit_message` - Edit a message
- `delete_message` - Delete a message
- `add_reaction` - Add reaction to message

### Server to Client
- `new_message` - Receive new message
- `message_edited` - Message was edited
- `message_deleted` - Message was deleted
- `user_typing` - User is typing
- `message_read` - Message read receipt
- `user_status_changed` - User online/offline status

## Project Structure

```
telegram-clone/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   ├── store/        # Redux store
│   │   ├── types/        # TypeScript types
│   │   └── App.tsx       # Main app component
│   └── package.json
├── server/                # Node.js backend
│   ├── config/           # Configuration files
│   ├── middleware/       # Express middleware
│   ├── models/          # Sequelize models
│   ├── routes/          # API routes
│   ├── socket/          # Socket.io handlers
│   ├── uploads/         # File uploads directory
│   ├── index.js         # Server entry point
│   └── package.json
└── README.md
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- File type validation
- SQL injection prevention with Sequelize ORM
- XSS protection with helmet
- CORS configuration
- Input validation and sanitization

## Performance Optimizations

- Message pagination and infinite scroll
- Image thumbnail generation
- File compression
- Database indexing
- Connection pooling
- Lazy loading of components
- Redux state optimization
- WebSocket connection management

## Testing

```bash
# Run frontend tests
cd client
npm test

# Run backend tests
cd server
npm test
```

## Deployment

### Using Docker

```bash
# Build and run with docker-compose
docker-compose up -d
```

### Manual Deployment

1. Build the frontend:
```bash
cd client
npm run build
```

2. Set production environment variables
3. Start the server:
```bash
cd server
NODE_ENV=production npm start
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Inspired by Telegram's excellent messaging platform
- Built with modern web technologies
- Thanks to all open-source contributors

## Support

For support, email support@example.com or open an issue in the repository.