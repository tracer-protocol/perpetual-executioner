FROM node:14

# Install app
WORKDIR /user/src/executioner
COPY package*.json ./
RUN npm install
COPY . .

# Expose correct ports
EXPOSE 3000

# Start the server
CMD ["node", "index.js"]

