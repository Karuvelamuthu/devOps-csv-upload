# DevOps CSV Upload Project

Complete project structure with all code files for CSV upload application.

## 📋 Project Files

```
devops-csv-upload/
├── backend/
│   ├── server.js           # Express.js application
│   ├── package.json        # npm dependencies
│   └── Dockerfile          # Docker build file
├── nginx/
│   └── nginx.conf          # NGINX configuration
├── k8s/
│   ├── deployment.yaml     # Kubernetes deployment
│   ├── service.yaml        # Kubernetes service
│   └── serviceaccount.yaml # Service account
├── jenkins/
│   └── Jenkinsfile         # CI/CD pipeline
└── README.md               # This file
```

## 🔧 Files Description

### backend/server.js
Node.js Express application that:
- Handles CSV file uploads
- Stores files locally in `./uploads` directory
- Provides file listing and download endpoints
- Includes health check endpoints

**Endpoints:**
- `GET /health` - Health check
- `POST /upload` - Upload CSV file
- `GET /files` - List all files
- `GET /download/:fileName` - Download file

### backend/package.json
npm dependencies:
- `express` - Web framework
- `multer` - File upload handling
- `aws` - Web framework
- `multer` - File upload handling

### backend/Dockerfile
Multi-stage Docker build:
- Uses Node.js 18 Alpine base image
- Installs dependencies
- Runs as non-root user
- Includes health check

### nginx/nginx.conf
NGINX reverse proxy configuration:
- Listens on port 80
- Forwards requests to Express server (port 3000)
- Includes security headers
- Handles static files

### k8s/deployment.yaml
Kubernetes deployment with:
- 2 replicas for high availability
- NGINX sidecar container
- Health checks (liveness & readiness)
- Resource limits and requests
- Rolling update strategy

### k8s/service.yaml
Kubernetes service:
- LoadBalancer type for external access
- ConfigMaps for configuration
- Port mapping

### k8s/serviceaccount.yaml
Kubernetes RBAC:
- Service account definition
- Role binding
- Permissions for ConfigMap access

### jenkins/Jenkinsfile
CI/CD pipeline stages:
- Checkout source code
- Build Docker image
- Push to registry
- Deploy to Kubernetes
- Health checks

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Run Locally
```bash
NODE_ENV=development npm start
```

The server will start on `http://localhost:3000`

### 3. Test Endpoints
```bash
# Health check
curl http://localhost:3000/health

# Upload file
curl -X POST -F "csv=@test.csv" http://localhost:3000/upload

# List files
curl http://localhost:3000/files

# Download file
curl http://localhost:3000/download/1234567890-test.csv
```

### 4. Build Docker Image
```bash
docker build -t csv-upload:latest backend/
docker run -p 3000:3000 csv-upload:latest
```

### 5. Deploy to Kubernetes
```bash
kubectl apply -f k8s/serviceaccount.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/deployment.yaml
```

## 📁 Upload Directory Structure

Files are stored in:
- **Local:** `./uploads/`
- **Docker:** `/app/uploads/`
- **Kubernetes:** `/tmp/uploads/`

Each file is saved with timestamp: `1705324245123-filename.csv`

## 🔒 Security Features

- ✅ File validation (CSV only)
- ✅ Directory traversal prevention
- ✅ Non-root container execution
- ✅ Security headers in NGINX
- ✅ Input sanitization

## 📊 API Response Format

All endpoints return JSON:

**Success Response:**
```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "...",
  "message": "..."
}
```

## 🐳 Docker Commands

```bash
# Build image
docker build -t csv-upload:latest backend/

# Run container
docker run -p 3000:3000 \
  -v $(pwd)/uploads:/app/uploads \
  csv-upload:latest

# Push to registry
docker tag csv-upload:latest YOUR_REGISTRY/csv-upload:latest
docker push YOUR_REGISTRY/csv-upload:latest
```

## ⚙️ Environment Variables

```bash
NODE_ENV=production      # Environment
PORT=3000                # Server port
UPLOAD_DIR=./uploads     # Upload directory
```

## 🔄 Kubernetes Commands

```bash
# Deploy
kubectl apply -f k8s/

# Check status
kubectl get deployment csv-upload
kubectl get pods -l app=csv-upload
kubectl get svc csv-upload

# View logs
kubectl logs deployment/csv-upload -c app
kubectl logs deployment/csv-upload -c nginx

# Port forward
kubectl port-forward svc/csv-upload 8080:80

# Delete
kubectl delete -f k8s/
```

## 📝 File Structure on Disk

After uploading files:
```
uploads/
├── 1705324245123-test1.csv
├── 1705324246456-test2.csv
└── 1705324247789-test3.csv
```

## ✅ Features

- ✅ CSV file upload
- ✅ File listing
- ✅ File download
- ✅ Health checks
- ✅ Error handling
- ✅ Logging
- ✅ Docker containerization
- ✅ Kubernetes deployment
- ✅ NGINX reverse proxy
- ✅ CI/CD pipeline ready

## 🛠️ Development

### Run Tests
```bash
curl http://localhost:3000/health
```

### Check File Storage
```bash
ls -la uploads/
```

### View Server Logs
```bash
# When running locally
npm start

# When running in Docker
docker logs <container_id>

# When running in Kubernetes
kubectl logs <pod_name> -c app
```

## 📦 Dependencies

- **express** (^4.18.2) - Web framework
- **multer** (^1.4.5-lts.1) - File upload handling
- **Node.js** (18+) - Runtime

## 🔗 Repository Structure

Use this git repository structure:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GIT_URL
git push -u origin main
```

## 📄 License

MIT

---

**All code files are ready to use. Just copy them to your project directory and follow the Quick Start section.**
