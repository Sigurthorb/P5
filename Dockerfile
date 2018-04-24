FROM node:6.14.1

RUN apt-get update && \
  apt-get -y upgrade && \
  apt-get install -y \
    build-essential \
    software-properties-common \
    libssl-dev \
    openssl \
    curl \
    git \
    wget \
    ca-certificates \
    gcc \
    make \
    python2.7 \
    python2.7-dev \
    ssh \

RUN apt-get autoremove && apt-get clean

RUN pip install -U "setuptools==3.4.1"
RUN pip install -U "pip==1.5.4"
RUN pip install -U "Mercurial==2.9.1"
RUN pip install -U "virtualenv==1.11.4"


RUN mkdir /p5

WORKDIR /p5

COPY . /p5/

RUN npm i

ENTRYPOINT [ "node", "docker/runner.js" ]