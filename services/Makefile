NODE:=../tools/node
COMPOSE:=../tools/compose
IMAGE_NAME:=jenkinsciinfra/evergreen-backend
DB_DUMP=initdb.d/db.sql
ifndef SENTRY_URL
  SENTRY_URL='https://publickey@sentry.io/projectid'
endif

all: check docs container

check: depends lint
	$(MAKE) migrate
	if [ -z "$${SKIP_TESTS}" ]; then \
		$(MAKE) unit; \
		$(MAKE) acceptance; \
	fi;

lint: depends
	$(NODE) npm run eslint

fix-formatting:
	$(NODE) npm run eslint -- --fix

unit:
	$(COMPOSE) run -e NODE_ENV=test -e ERROR_LOGGING_FILE=/srv/evergreen/error-logging.json --rm node npm run jest

debug-unit:
	$(COMPOSE) run -e NODE_ENV=test -e ERROR_LOGGING_FILE=/srv/evergreen/error-logging.json --rm -p 9229:9229 node \
		node --inspect-brk=0.0.0.0:9229 node_modules/.bin/jest --runInBand --bail --forceExit test/

acceptance:
	$(COMPOSE) run -e NODE_ENV=test -e SENTRY_URL=$(SENTRY_URL) -e ERROR_LOGGING_FILE=/srv/evergreen/error-logging.json --rm node npm run acceptance

debug-acceptance:
	$(COMPOSE) run -e NODE_ENV=test -e ERROR_LOGGING_FILE=/srv/evergreen/error-logging.json --rm -p 9229:9229 node \
		node --inspect-brk=0.0.0.0:9229 node_modules/.bin/jest --runInBand --bail --forceExit acceptance/

watch:
	$(COMPOSE) run -e NODE_ENV=test -e ERROR_LOGGING_FILE=/srv/evergreen/error-logging.json --rm node jest --bail --watchAll

depends: package.json
	# Checking to see if the directory exists because npm install updates the
	# directory every time it runs, busting the GNU/Make cache causing rebuilds
	@if [ ! -d node_modules ]; then \
		$(NODE) npm install; \
	fi;

docs: depends

migrate: depends
	$(COMPOSE) up -d db
	./scripts/check-psql
	for env in "test" "development"; do \
		echo ">> Preparing $$env database"; \
		$(COMPOSE) run --rm db \
			psql -v ON_ERROR_STOP=1 \
				-U postgres -h db -c "CREATE DATABASE evergreen_test;"; \
		$(COMPOSE) run -e NODE_ENV=$$env --rm node sequelize db:migrate; \
		$(COMPOSE) run -e NODE_ENV=$$env --rm node sequelize db:seed:all; \
	done;

run: migrate
	$(COMPOSE) up node

debug-run:
	$(COMPOSE) run -e ERROR_LOGGING_FILE=/srv/evergreen/error-logging.json \
		--rm -p 9229:9229 -p 3030:3030 node \
		node --inspect-brk=0.0.0.0:9229 src/

run-detach: migrate
	$(COMPOSE) up -d node

stop:
	$(COMPOSE) stop

dump: stop migrate
	$(COMPOSE) run --rm db pg_dump \
		--inserts \
		-h db -U postgres -d evergreen_development > $(DB_DUMP)

container: depends check Dockerfile
	docker build -t $(IMAGE_NAME):latest .

container-check: container check

ingest-update-center: essentials.yaml ingest-update-center
	wget -O update-center.json https://updates.jenkins.io/update-center.actual.json
	$(NODE) node ./ingest-update-center

clean:
	$(COMPOSE) down || true
	rm -rf node_modules
	rm -f $(DB_DUMP)
	docker rmi $$(docker images -q -f "reference=$(IMAGE_NAME)") || true

publish: container
	docker push ${IMAGE_NAME}:latest

.PHONY: all check clean container depends migrate unit acceptance run run-detach \
	dump debug-unit debug-run debug-acceptance \
	ingest-update-center publish
