FROM node:9 as builder

ARG APP_DIR=/srv/evergreen
WORKDIR ${APP_DIR}

ADD package*json ${APP_DIR}/

RUN npm install

# Doing a multi-stage build to reset some stuff for a smaller image
FROM node:9-alpine

ARG APP_DIR=/srv/evergreen
WORKDIR ${APP_DIR}

COPY --from=builder ${APP_DIR} .

COPY src ${APP_DIR}/src
COPY migrations ${APP_DIR}/migrations
COPY config ${APP_DIR}/config
COPY assets ${APP_DIR}/assets
COPY public ${APP_DIR}/public

EXPOSE 3030

COPY wait-for-postgres.sh /wait-for-postgres.sh
RUN chmod a+x /wait-for-postgres.sh

RUN apk add --update-cache postgresql-client
CMD npm run start
