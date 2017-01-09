# BoatyBoat
Frontend client for [FloatyBoat](https://github.com/lemiffe/floatyboat-fetch)

## Running locally

**Locally (using docker-compose):**
- docker-compose up
- Access via port 1338 (app folder mounted as a volume!)

**Nginx Docker:**
- Run start-docker.sh (will stop, remove, build, and start a new container)
- Should be accessible via port 1338 (e.g. http://localhost:1338)

## Deploying

**Using Dokku:**
- git push dokku master

## Setting up Dokku (for deploying)

**Set up the deploy process:**
- First make sure you have installed the backend (floatyboat)
- Go to this project's root, make sure there is a .git folder in there!
- git remote add dokku dokku@your.ip.address:boatyboat

**Set up the domain (on the server):**
- dokku domains boatyboat
- dokku domains:add boatyboat yourdomain.com
- dokku config:set boatyboat DOKKU_NGINX_PORT=1338

**Set up the ports:**
- dokku proxy:ports boatyboat (see list of ports, see the port of your container)
- If running on a separate port, make sure you proxy 80/443 to your port:
- dokku proxy:ports-add boatyboat http:80:1338
- dokku proxy:ports-add boatyboat https:443:1338

**Set up letsencrypt:**
- sudo dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git
- dokku config:set --no-restart boatyboat DOKKU_LETSENCRYPT_EMAIL=your@email.com
- dokku letsencrypt boatyboat
- dokku letsencrypt:cron-job --add

**Troubleshooting:**
- Infinite redirects?
    - Might be that you have 2 nginx services running somehow
    - service nginx stop
    - ps aux | grep nginx
    - kill -9 any remaining processes
    - service nginx start
- 502s?
    - Might be the docker 1.12 issue where sometimes it fails to start a container if on the same IP
    - dokku ps:rebuild boatyboat
    - You can add a check to CHECKS and automate this if necessary
- After deploy do infinite redirects come back?
    - If you set DOKKU_NGINX_PORT in your dokku config, unset it on the server
    - Reboot the server? Then:
    - dokku ps:rebuildall