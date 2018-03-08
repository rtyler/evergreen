#!/bin/bash

set -euo pipefail

### SETUP

# will use the local build, but could also be used to test a remote image
# TODO: pass an image:tag param?

container_under_test=evergreen-testing-$RANDOM
exit_code=0

cleanup () {
  exit_code=$?
  echo
  echo -n "Cleaning up... "
  docker kill $container_under_test 2>/dev/null >/dev/null || echo "Already dead."
  echo "G'day!"
  exit $exit_code
}

trap cleanup EXIT ERR INT TERM

# Utilities
find_free_port() {
  candidate_port=$(( ( $RANDOM % ( 65535 - 1024 ) )  + 1024 ))
  used_ports=$( netstat -ntap 2> /dev/null | tr -s ' ' | cut -d ' ' -f4 | grep ':' | awk -F ":" '{print $NF}' )
  echo $candidate_port
}

# Test functions
setup_container_under_test() {
  TEST_PORT=$(find_free_port)

  # TODO use docker-compose to use network and avoid all this?
  echo "Start container under test (port=$TEST_PORT) and wait a bit for its startup:"
  docker run --rm --name $container_under_test -p $TEST_PORT:8080 -d jenkins/evergreen:latest
  sleep 5

  set +e
  max_attempts=10
  while true
  do
    if ( docker logs $container_under_test | grep "Jenkins is fully up and running" ); then
      echo "Started, running tests."
      break;
    elif (( $max_attempts < 1 )); then
      echo "Jenkins did not start before timeout. Tests are expected to fail."
      break;
    else
      echo "Waiting for Jenkins startup a bit more..."
    fi
    sleep 3
    max_attempts=$(( max_attempts -1 ))
  done
  set -e
}

# TODO: use/study more standard test systems like BATS
function smoke() {
  echo -n "Connect to Jenkins and check content... "
  curl --silent http://localhost:$TEST_PORT | \
      grep "Authentication required" > /dev/null
  echo "OK!"
}

function no_executor() {
  echo -n "Check master has no executor... "
  docker exec $container_under_test cat /var/jenkins_home/config.xml | \
      grep '<numExecutors>0</numExecutors>' > /dev/null
  echo "OK!"
}

function docker_available() {
  echo -n "Check docker client is available... "
  docker exec $container_under_test which docker > /dev/null
  # Check that not only something called docker can be found on the PATH
  # but is actually looking more like it using a specific command call
  set +e
  output=$( docker exec $container_under_test docker version 2>&1 )
  set -e
  echo "$output" | \
      grep "Cannot connect to the Docker daemon" > /dev/null

  echo "OK!"
}
### ACTUAL TEST CALLS

setup_container_under_test

echo "#################"
echo "# Running tests #"
echo "#################"
# Basic check
smoke

# JENKINS-49861
no_executor

# JENKINS-49864
docker_available
