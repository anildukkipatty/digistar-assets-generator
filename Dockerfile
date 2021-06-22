FROM python:latest
WORKDIR /usr/src/app
RUN mkdir /usr/outputs
RUN pip install Pillow