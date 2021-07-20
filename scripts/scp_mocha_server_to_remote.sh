#!/bin/bash

# change local to remote
var="REMOTE_OR_LOCAL=remote"
sed -i "1s/.*/$var/" ../server/.server.env

# copy server-folder into remote server (ssh-agent for mochacle needs to be set up)
scp -r ../server mochacle:~

# install docker and ssl on remote machine
ssh mochacle "cd ~/server && sudo chmod u+x setup_docker_and_ssl.sh && sudo ./setup_docker_and_ssl.sh"

# docker up on remote machine
ssh mochacle "cd ~/server && sudo docker-compose down && sudo docker-compose up --build -d"