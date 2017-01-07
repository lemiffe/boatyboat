# BoatyBoat
Frontend client for [FloatyBoat](https://github.com/lemiffe/floatyboat-fetch)

## Running locally

**Locally (for development):**
- Pending

**Nginx Docker:**
- Run start-docker.sh (will stop, remove, build, and start a new container)
- Should be accessible via port 1338 (e.g. http://localhost:1338)

## Setting up Dokku (for deploying)

**Set up the deploy process:**
- First make sure you have installed the backend (floatyboat)
- Go to this project's root, make sure there is a .git folder in there!
- git remote add dokku dokku@your.ip.address:boatyboat

**Set up the domain (on the server):**
- dokku domains boatyboat
- dokku domains:add boatyboat yourdomain.com
- dokku config:set boatyboat DOKKU_NGINX_PORT=80

**Set up the ports:**
- dokku proxy:ports boatyboat (see list of ports, see the port of your container)
- dokku proxy:ports-add boatyboat http:80:6000
- dokku proxy:ports-add boatyboat https:443:6000

**Set up letsencrypt:**
- sudo dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git
- dokku config:set --no-restart boatyboat DOKKU_LETSENCRYPT_EMAIL=your@email.com
- dokku letsencrypt boatyboat
- dokku letsencrypt:cron-job --add
