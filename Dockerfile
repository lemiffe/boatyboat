FROM nginx

#RUN rm /etc/nginx/conf.d/default.conf
#RUN rm /etc/nginx/conf.d/examplessl.conf

COPY app /usr/share/nginx/html
#COPY conf /etc/nginx

EXPOSE 80 443