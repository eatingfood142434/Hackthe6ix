# HackThe6ix Backend Server

A clean, well-structured Express.js server with Vellum AI workflow and GitHub API integrations.

## 🏗️ Project Structure

```
server/
├── middleware/
│   ├── auth.js              # API key validation middleware
│   └── errorHandler.js      # Global error handling middleware
├── routes/
│   ├── github.js           # GitHub API integration routes
│   ├── health.js           # Health check endpoints
│   └── vellum.js           # Vellum AI workflow routes
├── .env.example            # Environment variables template
├── index.js                # Main server entry point
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys and configuration
   ```

3. **Start the server:**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 8080) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `API_KEY` | API key for protected routes | Yes |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) | No |
| `VELLUM_API_KEY` | Vellum AI API key | Yes (for Vellum routes) |
| `VELLUM_API_URL` | Vellum API base URL | No |
| `GITHUB_TOKEN` | GitHub Personal Access Token | Yes (for GitHub routes) |

### Security Features

- **Helmet.js**: Security headers
- **CORS**: Configurable cross-origin requests
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **API Key Authentication**: Protected routes require valid API key
- **Request Logging**: Morgan middleware for HTTP request logging

## 📡 API Endpoints

### Health Check
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health check with service status

### Vellum AI Integration
All Vellum routes require API key authentication.

- `POST /api/vellum/execute` - Execute a Vellum workflow
- `GET /api/vellum/execution/:executionId` - Get execution status
- `GET /api/vellum/workflows` - List available workflows

#### Example: Execute Vellum Workflow
```bash
curl -X POST http://localhost:8080/api/vellum/execute \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "your-workflow-id",
    "inputs": {
      "input_key": "input_value"
    },
    "metadata": {
      "user_id": "123"
    }
  }'
```

### GitHub API Integration
All GitHub routes require API key authentication.

- `GET /api/github/repo/:owner/:repo` - Get repository information
- `GET /api/github/repo/:owner/:repo/contents/:path?` - Get repository contents
- `PUT /api/github/repo/:owner/:repo/contents/:path` - Create/update file
- `GET /api/github/repo/:owner/:repo/issues` - Get repository issues
- `POST /api/github/repo/:owner/:repo/issues` - Create new issue

#### Example: Get Repository Info
```bash
curl -X GET http://localhost:8080/api/github/repo/octocat/Hello-World \
  -H "x-api-key: your-api-key"
```

#### Example: Create GitHub Issue
```bash
curl -X POST http://localhost:8080/api/github/repo/owner/repo/issues \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Bug report",
    "body": "Description of the issue",
    "labels": ["bug", "priority-high"]
  }'
```

## 🔐 Authentication

Protected routes require an API key provided via:
- Header: `x-api-key: your-api-key`
- Authorization header: `Authorization: Bearer your-api-key`

## 🛠️ Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-restart
- `npm test` - Run tests (not implemented yet)

### Adding New Routes

1. Create a new route file in `routes/`
2. Import and use in `index.js`
3. Add authentication middleware if needed

Example:
```javascript
// routes/newFeature.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'New feature endpoint' });
});

module.exports = router;

// index.js
const newFeatureRoutes = require('./routes/newFeature');
app.use('/api/new-feature', validateApiKey, newFeatureRoutes);
```

## 🔍 Error Handling

The server includes comprehensive error handling:
- Global error handler middleware
- Structured error responses
- Development vs production error details
- HTTP status code mapping

## 📊 Monitoring

- Health check endpoints for uptime monitoring
- Request logging with Morgan
- Process uptime tracking
- Service dependency status checks

## 🚦 Rate Limiting

Default rate limiting is configured for:
- 100 requests per 15-minute window per IP
- Customizable via environment variables
- Bypass available for specific IPs if needed

## 🔄 Graceful Shutdown

The server handles graceful shutdown on:
- SIGTERM signal
- SIGINT signal (Ctrl+C)

## 📝 Logging

Request logging includes:
- HTTP method and URL
- Response status and time
- User agent and IP address
- Response time

## 🤝 Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include JSDoc comments for new functions
4. Test your changes locally
5. Update documentation as needed

## 📄 License

ISC License - See package.json for details.
