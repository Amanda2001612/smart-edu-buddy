# SmartEduBuddy Backend

A professional, enterprise-grade Node.js backend for SmartEduBuddy - an educational robot that helps children learn by answering their questions using Google's Gemini AI and providing audio responses.

## 📋 Project Structure

```
smart-edu-bridge/
├── src/
│   ├── config/              # Configuration management
│   │   └── config.js        # Centralized app configuration
│   ├── controllers/         # Request handlers
│   │   └── chatController.js
│   ├── services/            # Business logic
│   │   ├── aiService.js     # Google Gemini API interactions
│   │   └── audioService.js  # Text-to-speech handling
│   ├── routes/              # API route definitions
│   │   └── chatRoutes.js
│   ├── middleware/          # Express middleware
│   │   ├── errorMiddleware.js
│   │   └── requestMiddleware.js
│   ├── utils/               # Utility functions
│   │   ├── logger.js        # Logging utility
│   │   └── errorHandler.js  # Error handling utilities
│   ├── constants/           # Application constants
│   │   └── messages.js      # Messages and status codes
│   └── app.js               # Express app configuration
├── tests/                   # Test files (unit & integration)
├── logs/                    # Application logs
├── .env                     # Environment variables (git ignored)
├── .gitignore               # Git ignore rules
├── package.json             # Project dependencies
├── server.js                # Application entry point
└── README.md                # Project documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smart-edu-bridge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   PORT=3000
   HOST=localhost
   
   # Google Gemini API Configuration
   AI_API_KEY=your_gemini_api_key_here
   
   # CORS Configuration
   CORS_ORIGIN=*
   
   # Logging
   LOG_LEVEL=info
   LOG_FORMAT=json
   ```

4. **Start the server**
   ```bash
   npm start
   ```

   The server will start on `http://localhost:3000`

## 📝 API Endpoints

### Health Check
- **GET** `/api/health`
  - Returns the health status of the backend
  - Response: `{ success: true, message: "..." }`

### Chat with AI
- **POST** `/api/chat`
  - Process a question and get AI response with audio
  - Request Body:
    ```json
    {
      "question": "What is a black hole?"
    }
    ```
  - Response:
    ```json
    {
      "success": true,
      "data": {
        "text": "A black hole is a region in space...",
        "audioUrl": "https://...",
        "timestamp": "2024-01-01T12:00:00.000Z"
      }
    }
    ```

## 🏗️ Architecture

### MVC Pattern
- **Models**: Data structures (services contain business logic)
- **Views**: API Responses (JSON)
- **Controllers**: Handle HTTP requests and orchestrate services

### Service Layer
- `AIService`: Handles Google Gemini API interactions
- `AudioService`: Manages text-to-speech conversion

### Error Handling
- Centralized error handling with custom `AppError` class
- Structured error responses
- Global error middleware

### Logging
- Structured JSON logging
- File-based and console output
- Configurable log levels (DEBUG, INFO, WARN, ERROR)

## 📦 Dependencies

- **express**: Web framework
- **cors**: Cross-Origin Resource Sharing
- **dotenv**: Environment variable management
- **multer**: File upload handling
- **axios**: HTTP client
- **google-tts-api**: Text-to-speech conversion

## 🔧 Configuration

All configuration is centralized in `src/config/config.js`. Key settings:

- **API Keys**: Loaded from environment variables
- **CORS**: Configurable origin, methods, and headers
- **Logging**: Level and format configuration
- **Upload**: File size and type limits

## 📚 Development

### Code Structure Best Practices

1. **Separation of Concerns**: Each module has a single responsibility
2. **Error Handling**: Custom errors with proper status codes
3. **Logging**: Comprehensive logging for debugging
4. **Configuration**: Externalized configuration management
5. **Validation**: Input validation at service level
6. **Constants**: Centralized constants for maintainability

### Adding New Features

1. Create service in `src/services/`
2. Create controller in `src/controllers/`
3. Add routes in `src/routes/`
4. Update configuration if needed in `src/config/config.js`

## 🧪 Testing

Tests should be added in the `tests/` directory. Run tests with:
```bash
npm test
```

## 📊 Monitoring

- Check application logs in the `logs/` directory
- Monitor performance using the request logging middleware
- Use health check endpoint for uptime monitoring

## 🚨 Error Handling

The application uses standardized error responses:

```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400,
  "details": {
    "field": "value"
  }
}
```

## 🔐 Security

- Environment variables for sensitive data
- CORS configuration for safe cross-origin requests
- Input validation
- Request size limits

## 📝 License

MIT

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Commit with clear messages
4. Push to the repository
5. Create a Pull Request

## 📞 Support

For issues or questions, please create an issue in the repository.
