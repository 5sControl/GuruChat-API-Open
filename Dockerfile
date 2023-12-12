# Base image
FROM --platform=linux/amd64 node:18

# Create app directory
WORKDIR /usr/src/app

VOLUME /usr/src/docker-volume

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm install --legacy-peer-deps

# Bundle app source
COPY . .

RUN npm run fix

# Creates a "dist" folder with the production build
RUN npm run build

# Start the server using the production build
CMD [ "node", "dist/main.js" ]
