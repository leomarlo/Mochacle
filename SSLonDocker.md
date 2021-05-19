# SSL lets-encrypt certificate in a dockerized nodejs server

## Main idea
So we need run our mocha server via an https protocol. There is no way around. Both Metamask as well as chrome as well as everyone wants it. So lets give it to them! So we need to set up an SSL certificate that allows us to run our services via https. Lets rock!

## Sources

[This medium article](https://codeburst.io/http-server-on-docker-with-https-7b5468f72874) by Lukas Pawlowski discusses how to set up an apache server on a linux machine and then somehow route the traffic into the docker. [This medium article](https://emrahonder.medium.com/how-to-get-lets-encrypt-ssl-certificate-by-using-docker-8199f1cce733) discusses how to set up an ssl-certificate inside docker. For our use-case we need to do that thing for a nodejs server running inside a docker container. [This article](https://itnext.io/node-express-letsencrypt-generate-a-free-ssl-certificate-and-run-an-https-server-in-5-minutes-a730fbe528ca) promises to get us there in under 5 mins. So lets go :)

## Setting up an EC2-instance micro on AWS for playing purposes

So we set up our ec2 for fun. Its 14:40 and the timer runs. 

As usual I opt for an ubuntu instance. I choose *Ubuntu Server 20.04 LTS (HVM), SSD Volume Type* and go for the *t2.micro* instance. I created a new security group just for this testing and open SSH port 22 via TCP for all incoming traffic. I also open HTTP (80) and HTTPS (443) via TCP for all incoming traffic. Bad idea, but for testing i hope it'll do fine. I created a new key-pair and launched the instance. It's now 14:47, so just under 10 minutes. Im sure others can do faster.

Lets log into the instance. As usual I first change the rights for the private key file: ``` chmod 400 my_pem_file_name.pem ```
As a habit I also create and associate an elastic Ip address for this instance. I ssh into the instance
```
ssh -o IdentitiesOnly=yes -i ./my_pem_file_name.pem ubuntu@ec2-18-197-37-149.eu-central-1.compute.amazonaws.com
```
woohoo, and Im in. Wow! Its getting faster each time I do this: