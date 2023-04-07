# Use the official lightweight Node.js image
FROM node:16-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the source code to the container
COPY . .

# Build the TypeScript code
RUN npm run build

# Copy messages.json to dist folder
# RUN cp src/messages.json dist/

# Start the app
CMD ["npm", "start"]
