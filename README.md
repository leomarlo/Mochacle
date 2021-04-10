# Testoracle

## Abstract
When a piece of code passes a test, it can mean that the code is ready for production or that a student has passed an exam or that an interview has been passed successfully or that for that the 4-color theorem in graph theory has been proven or that a coding competition has found its winner. All these events are important for many potential blockchain applications.

## Basic Workflow

server is a express-nodejs server that exposes an http-get route **/test**. It contains a scripts subfolder on which we can upload our **test.js** and a **submitted.js**.

[https://sumantmishra.medium.com/how-to-deploy-node-js-app-on-aws-with-github-db99758294f19](this was of great help)

``` docker
sudo docker build -t <image_tag> server
```

Change the INSIDE_DOCKER enviornment variable both in the .env and the server/.server.env

``` docker
sudo docker run --env-file=server/.server.env -dp 8000:8080 <image_tag>
```

## Information
In this project we would like to write a basic smart contract that integrates a chain-link oracle about the status of a testing-script. We will use a basic hardhat environment and a simple UI for proof of concept until the submission deadline.

## Participants
Leonhard Horstmeyer - leonhard.horstmeyer@googlemail.com

