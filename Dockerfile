FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies needed for server
RUN npm ci --only=production --ignore-scripts

# Copy server files
COPY src/server.js ./src/
COPY src/colors.json ./src/

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "src/server.js"]

