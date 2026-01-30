# Compiler Server

This is a Node.js server that uses Docker to execute C, Python, and Java code.

## Prerequisites
- Docker Desktop must be installed and running.

## Setup
1. Open a terminal in this directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the Docker image (required for code execution):
   ```bash
   npm run build-image
   ```
   *Note: Ensure Docker Desktop is running before running this command.*

## Running the Server
Start the server:
```bash
npm start
```

The server runs on `http://localhost:5000`.

## API Endpoint
**POST /compile**
Body:
```json
{
  "language": "c" | "python" | "java",
  "code": "print('hello')",
  "input": "optional input"
}
```
