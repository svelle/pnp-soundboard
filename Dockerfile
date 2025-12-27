FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application files
COPY . .

# Create sounds directory
RUN mkdir -p sounds

# Expose port
EXPOSE 3000

# Set environment variables (can be overridden)
ENV PORT=3000
ENV SOUNDBOARD_PASSWORD=change-me

# Start server
CMD ["node", "server.js"]
