FROM nginx:1.15.12

ADD . /app

ENTRYPOINT [ "nginx", "-g", "daemon off;", "-c", "/app/nginx.conf" ]
