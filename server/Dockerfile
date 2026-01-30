FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    openjdk-11-jdk-headless \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /code
