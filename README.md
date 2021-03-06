# Testoracle

## Abstract
When a piece of code passes a test, it can mean that the code is ready for production or that a student has passed an exam or that an interview has been passed successfully or that for that the 4-color theorem in graph theory has been proven or that a coding competition has found its winner. All these events are important for many potential blockchain applications.

## Overview

The architecture consists of three components. First and foremost there is of course the smart contract. It is called *TestOracle* and inherits from ChainlinkClient ("@chainlink/contracts/src/v0.6/ChainlinkClient.sol"). The contract is saved in the folder *./contracts*. Secondly, there is a server in *./server* which is hosted on AWS and performs all the mocha testing in a dockerized ubuntu environment. It also supplies an API for the Chainlink Oracle. Thirdly there is the app that should eventually tie into the Web3 environment and should orchestrate the submission to the remote mocha server and the smart contract. 

## TestOracle Contract

The TestOracle contract has one method to submit a mocha_test script. It takes two arguments, the byte32 sha256-hashed script and the pass_fraction in permille. Behind the scenes there is a mapping of test_ids to Test structs. The Test struct also has in it a reward that is supplied by the test_submitter and is released once the correct solution has been submitted. Then the contract has a solution submission method, where people can submit their solutions. At the same time the solution is send to the server and run to check if it passes the test. If it does the API gives a score. Then the test-submitter can call the checkScore method on the contract, which asks a **chainlink-oracle** to check the score, that the AWS API supplies. 

I used hardhat for this project. The testing i found in the *./test* directory. Please ask me (see my mail at the bottom) for the environment variables. You can also run your own tests and send them to the server "http://3.122.74.152:8011/"

You can find all submission (i.e. solution) ids:

```
http://3.122.74.152:8011/submission_ids
```
If you want a specific one type *http://3.122.74.152:8011/submission_ids/id*. Target (i.e. test) ids are here:

```
http://3.122.74.152:8011/target_ids
```
Again for a specific one supply the id with */id* at the end.



### **Mocha Server**

Each submission gets bytes20 string, the test_certificate also gets a bytes20


## Deployment

### Deployment using Remix

On the [landing page](https://remix.ethereum.org/) of [remix.ethereum.org](https://remix.ethereum.org/) there is an option to load from github. The contract can be found on [https://github.com/leomarlo/Mochacle/blob/main/contracts/Mochacle.sol](https://github.com/leomarlo/Mochacle/blob/main/contracts/Mochacle.sol), so by pasting this URL into the input, the Mochacle contract is now loaded into the directory tree under the ./github folder. After selecting the contract and compiling it with remix, one may connect a web3 wallet by selecting the Injected Web3 environment in the "deployment" tab of remix. Then past [https://testoracle.xyz/submission_ids/](https://testoracle.xyz/submission_ids/) as the only argument for the deployment transaction and press "deploy". After the transaction got mined, you may fund the contract with LINK. Take any wallet that has LINK on the chosen network and send some to the newly deployed contract. The address of the contract can be copied from the deployed contracts list on remix. 


## Set up the nodejs server on an AWS ubuntu instance

### **Setting up the AWS instance**
Select a ubuntu ec2 instance (I took t2-micro Ubuntu Server 20.04 LTS (HVM), SSD Volume Type - ami-0767046d1677be5a0). Add a security group that allows traffic for SSH and a custom TCP rule. For traffic of type "SSH", the protocol should be TCP. The Port Range should be 22. The source should be the 0.0.0.0 (everything on IPv4) and another entry with ::/0 (everything on IPv6). For the traffic of type "Custom TCP Rule" the Protocol should be TCP and the port-range should be whatever you supply as ports in the docker build or in the docker-compose. In my case I randomly chose 8011. Again one entry for the 0.0.0.0 (everything on IPv4) traffic and another entry with ::/0 (everything on IPv6). [https://sumantmishra.medium.com/how-to-deploy-node-js-app-on-aws-with-github-db99758294f19](This was of great help). This way I can access via SSh and via RestAPI. Launch instance. Create a new key-pair or take an existing one. I always choose a new key pair. I copy it into the shell_scripts folder.
Then We create some elastic ip, which we associate with our instance. Allow it to be reassociated. Connect to the instance via ssh and install docker and docker-compose:

```
$ chmod 400 pem-file-name.pem
$ ssh -o IdentitiesOnly=yes -i pem-file-name.pem ubuntu@ec2-3-122-74-152.eu-central-1.compute.amazonaws.com
```
and in we are! The *-o IdentitiesOnly=yes* option was a trick that I found somewhere to remedy all the error messages I got for having to many ssh keys in my agent. Aparently ssh goes through all of them, unless *IdentitiesOnly=yes* is enabled.

### **Installing docker on the instance**

To install docker I follow this instruction (https://docs.docker.com/engine/install/ubuntu/):
```
$ sudo apt-get update && \
    sudo apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
```
Adding the GPG key:
```
$ curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
```
Setting up a stable repo:
```
$ echo \
  "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```
Installing the docker engine

```
$ sudo apt-get update && \
    sudo apt-get install docker-ce \
                         docker-ce-cli \
                         containerd.io
```
Running *$ sudo docker run hello-world* should pull the *hello-world* docker image and run it, if the installation went fine.

Now we install docker-compose. According to (https://docs.docker.com/compose/install/):

```
$ sudo curl -L "https://github.com/docker/compose/releases/download/1.29.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
$ sudo chmod +x /usr/local/bin/docker-compose
```

with the remark, that a different more recent version of docker may be downloaded by changing the version number in the url. By typing 

```
docker-compose -v
```
we can verify that we have installed docker (and the correct version)

### **SCP the server into the instance**

Before copying the server directory into the ubuntu instance, we have to add one file:

**IMPORTANT NOTE**
Inside the *./server* directory you should create a hidden *.server.env* file with the following key-value pairs:
```
INSIDE_DOCKER=1
REMOTE_OR_LOCAL=remote
SCRIPTS_PATH=scripts/
SERVER_PATH=server/
ADMIN_NAME=<<whatever your admin name>>
INIT_TOKEN=<<whatever the initial token handed out to newly created users>
ADMIN_TOKEN=<<whatever the admin token should be>>
HASH_FUNCTION=sha256
LOCALHOST=localhost
REMOTEHOST=<<ip-address of the running instance>> (currently 3.122.74.152)
```
The Hash function can also be any other. INSIDE_DOCKER flag can be anything. To make it falsy I just provide no value (i.e. debug/outside_docker mode).

Now we can *scp* the server recursivley into the instance. Usually I keep my shell scripts in a folder, say *shell*. And keep my pem file and access scripts there. Then the *scp* command would be like so:
```
$ scp -o IdentitiesOnly=yes -i ./pem-file-name.pem -r ../server ubuntu@ec2-3-122-74-152.eu-central-1.compute.amazonaws.com:~
```
Alternatively, if we enter from the root directory (of this repository) it'd be like so (again assuming the shell folder is called */shell*):
 ```
$ scp -o IdentitiesOnly=yes -i ./shell/pem-file-name.pem -r ./server ubuntu@ec2-3-122-74-152.eu-central-1.compute.amazonaws.com:~
```



### **Composing or build-runnning the docker**

Again we *ssh* into the instance, or write a script that does it in one go. 
We navigate to the server folder *~/server*. There we simply sudo into the docker-compose
```
$ docker-compose up --build -d
```
and voila! The *-d* flag should should run the docker container in detached mode. Its optional. Now it should pull all the required images (just ubuntu image i think) and start server ;)



### **alternatively docker build**

``` docker
sudo docker build -t <image_tag> server
```

Change the INSIDE_DOCKER enviornment variable both in the .env and the server/.server.env

``` docker
sudo docker run --env-file=server/.server.env -dp 8011:8080 <image_tag>
```

or install docker-compose:
```
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
``` 

The app will be found on localhost:8011 then.

## Information
In this project we would like to write a basic smart contract that integrates a chain-link oracle about the status of a testing-script. We will use a basic hardhat environment and a simple UI for proof of concept until the submission deadline.

## Contact
Leonhard Horstmeyer - leonhard.horstmeyer@googlemail.com

