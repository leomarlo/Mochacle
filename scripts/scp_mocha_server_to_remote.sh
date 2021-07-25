#!/bin/bash

# change local to remote
var="REMOTE_OR_LOCAL=remote"
sed -i "1s/.*/$var/" ../server/.server.env

# copy server-folder into remote server (ssh-agent for mochacle needs to be set up)
sudo scp -r ../server ubuntu@mochacle:~

# install docker and ssl on remote machine
sudo ssh ubuntu@mochacle "cd ~/server && sudo chmod u+x setup_docker_and_ssl.sh && sudo ./setup_docker_and_ssl.sh"

# docker up on remote machine
sudo ssh ubuntu@mochacle "cd ~/server && sudo docker-compose down && sudo docker-compose up --build -d"