NODE:=../tools/node

all: check

lint:
	$(NODE) npm run eslint

check: depends lint
	$(MAKE) unit

unit:
	$(NODE) npm run jest

depends: node_modules

node_modules: package-lock.json package.json
	# Checking to see if the directory exists because npm install updates the
	# directory every time it runs, busting the GNU/Make cache causing rebuilds
	if [ ! -d node_modules ]; then \
		$(NODE) npm install; \
	fi;

run: run-services
	EVERGREEN_HOME=/tmp/evergreen-home \
		EVERGREEN_ENDPOINT=http://127.0.0.1:3030 \
		$(NODE) npm run client


run-services:
	$(MAKE) -C ../services run-detach

clean:
	rm -rf vendor/
	rm -rf node_modules/

.PHONY: all check clean container depends run run-services \
	unit lint
