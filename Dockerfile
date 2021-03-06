FROM node:8

RUN apt-get update && \
  apt-get -y upgrade && \
  apt-get install -y \
    build-essential \
    software-properties-common \
    libssl-dev \
    openssl \
    curl \
    git \
    wget

RUN mkdir /p5

WORKDIR /p5

COPY . /p5/

RUN rm -rf node_modules && npm i

ENTRYPOINT [ "node", "docker/runner.js" ]