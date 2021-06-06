# SSL lets-encrypt certificate in a dockerized nodejs server

## Main idea
So we need run our mocha server via an https protocol. There is no way around. Both Metamask as well as chrome as well as everyone wants it. So lets give it to them! So we need to set up an SSL certificate that allows us to run our services via https. Lets rock!

## Sources

[This medium article](https://codeburst.io/http-server-on-docker-with-https-7b5468f72874) by Lukas Pawlowski discusses how to set up an apache server on a linux machine and then somehow route the traffic into the docker. [This medium article](https://emrahonder.medium.com/how-to-get-lets-encrypt-ssl-certificate-by-using-docker-8199f1cce733) discusses how to set up an ssl-certificate inside docker. For our use-case we need to do that thing for a nodejs server running inside a docker container. [This article](https://itnext.io/node-express-letsencrypt-generate-a-free-ssl-certificate-and-run-an-https-server-in-5-minutes-a730fbe528ca) promises to get us there in under 5 mins. So lets go :)

## Setting up an EC2-instance micro on AWS for playing purposes

So we set up our ec2 for fun. Its 14:40 and the timer runs. 

As usual I opt for an ubuntu instance. I choose *Ubuntu Server 20.04 LTS (HVM), SSD Volume Type* and go for the *t2.micro* instance. I created a new security group just for this testing and open SSH port 22 via TCP for all incoming traffic. I also open HTTP (80) and HTTPS (443) via TCP for all incoming traffic. Bad idea, but for testing i hope it'll do fine. I created a new key-pair and launched the instance. It's now 14:47, so just under 10 minutes.

Lets log into the instance. As usual I first change the rights for the private key file: ``` chmod 400 my_pem_file_name.pem ```
As a habit I also create and associate an elastic Ip address for this instance. I ssh into the instance
```
ssh -o IdentitiesOnly=yes -i ./my_pem_file_name.pem ubuntu@ec2-18-197-37-149.eu-central-1.compute.amazonaws.com
```
woohoo, and Im in. Wow! Its getting faster each time I do this:.

## Setting up the SSL certificate

After we have installed docker and docker-compose on the ec2, we git-push our code inside or we scp it. Here I opt for scp:
```
$ scp -o IdentitiesOnly=yes -i ./my_pem_file_name.pem -r ../server ubuntu@ec2-18-197-37-149.eu-central-1.compute.amazonaws.com:~
```
Next we ssh into the instance and run docker-compose in the server folder. 
```
$ cd server
$ sudo docker-compose down
$ sudo docker-compose up --build
```
or in detached mode:
```
$ sudo docker-compose up --build -d
```

The docker-compose file also attaches a new volume to the docker container, which will persist the certificate files and keys. Its the essential part of this exercise. First we run the docker container with a dummy nodejs server that we will use to obtain the certificate from letsencrypt. So after the docker-compose has finished building the http server you can check which docker containers are running by:
```
$ sudo docker-compose ps
```
pick the one you just started and go into the interactive mode. If you have started the docker in the detached mode, you can use the same terminal, otherwise you should open a new terminal and execute the interactive bash mode for the tagged instance, which in this case is called server_mochaserver_1. But you can check with the above command what yours is called. (should be the same).
```bash
$ sudo docker exec -it server_mochaserver_1 bash
```
Now we follow this [brilliantly short and concise article](https://itnext.io/node-express-letsencrypt-generate-a-free-ssl-certificate-and-run-an-https-server-in-5-minutes-a730fbe528ca). The first steps are already accounted for by installing the python certbot in the dockerfile. Here we just need to call it:
```
root@77f6fbfb2504:/usr/src/app# certbot certonly --manual
```
Then you are prompted for an email, which you may supply. Then you need to agree to terms and services etc. Then they ask you if you'd be willing to ... wft: NO! okay okay, it says smth about digital freedom whatever.

**NOW CONCENTRATION**, you'll be given a challenge for each domain that you are willing to certify. In my case I want to certify *testoracle.xyz* and *www.testoracle.xyz*. So I am prompted first to supply all domains that I wish to certify. Then I am given first an a-string and an a-challenge for the first domain. To this end I have added the expressjs route 
```js
app.get('/add_acme/:astring/:achallenge', (req, res) => {
    acme_challenge[req.params.astring] = req.params.achallenge
    res.send(acme_challenge);
  });
```
which allows the user to enter in a running server both the astring and the achallenge, like so 
```
http://testoracle.xyz/add_acme/8fVgxxXXXxxxXXxh5SldvPpbbbBBBBbbbbbBBBoTrrrrs/8fVgxxXXXxxxXXxh5SldvPpbbbBBBBbbbbbBBBoTrrrrs.J117someMoreJibbrishCjSbsJdpVk
```
Fortunately I also created the route
```js
app.get('/.well-known/acme-challenge/:astring', (req, res) => {
    res.send(acme_challenge[req.params.astring]);
  });
```
which is the one that lets encrypt calls to check whether you completed the challenge successfully. You need to do that for each challenge that you are presented, i.e. each domain for which you wish to allow https traffic. Naturally you need to own them and have records for them inside your dns configuration. 

Now you can exit the bash mode and stop the container: ```sudo docker-compose down```. The last step you need to do is to change the last line inside the dockerfile, name 
```docker
CMD [ "node", "ssl.js" ]
# CMD [ "node", "index.js" ]
```
goes to 

```docker
# CMD [ "node", "ssl.js" ]
CMD [ "node", "index.js" ]
```