# this will generate an image with source file baked in

FROM node:10.9.0-alpine

USER root

USER node

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

WORKDIR /home/node

COPY ./package.json .

RUN yarn install

EXPOSE 4000

COPY . .

CMD ["yarn", "start"]
