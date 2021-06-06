from ubuntu:18.04

# USER root

WORKDIR /usr/src/app

RUN apt-get -y update && \
    apt-get install -y software-properties-common
RUN add-apt-repository ppa:certbot/certbot
RUN apt-get -y install certbot

# RUN apt-get -y update && apt-get install -y apt-transport-https
# RUN apt-get -y install curl gnupg
# RUN curl -sL https://deb.nodesource.com/setup_14.x  | bash -
# USER root
# RUN apt-get -y update
# RUN dpkg -r libjack-jackd2-0
# RUN apt-get -f install
# RUN apt-get update
# RUN apt-get upgrade -y
# RUN apt-get -y install nodejs
# RUN apt-get install -y nodejs

RUN apt-get update -yq && apt-get upgrade -yq && \
    apt-get install -yq curl git nano

# install from nodesource using apt-get
# https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-an-ubuntu-14-04-server
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get install -yq nodejs build-essential

# fix npm - not the latest version installed by apt-get
RUN npm install -g npm

# RUN apt-get install -y npm

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY server.package.json ./package.json

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY ./index.js ./index.js
COPY ./ssl.js ./ssl.js
COPY ./scripts ./scripts
# COPY ./mocha

EXPOSE 80
CMD [ "node", "ssl.js" ]
# CMD [ "node", "index.js" ]