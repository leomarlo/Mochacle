FROM node:14

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY server.package.json ./package.json

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY ./index.js ./index.js
COPY ./scripts ./scripts
COPY ./key.pem ./key.pem
COPY ./cert.pem ./cert.pem
# COPY ./mocha

EXPOSE 80
CMD [ "node", "index.js" ]