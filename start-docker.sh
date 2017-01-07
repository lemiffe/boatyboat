#!/bin/bash
docker stop boatyboat
docker rm boatyboat
docker rmi boatyboat
docker build -t boatyboat .
docker run -d -p 1338:80 --restart always --name boatyboat boatyboat