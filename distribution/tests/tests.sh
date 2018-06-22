#!/bin/bash
# Note: would have used set -euo pipefail, but ./shunit2 unfortunately fails hard with this :-(.

current_directory=$(dirname "$0")
# TODO: use the $( cd blah ; ... ) trick to un-relativize path below
export PATH="$current_directory/../../tools:$PATH"

echo "Debugging: PATH=***$PATH***"

JENKINS_HOME=to_override

# shellcheck source=tests/utilities
. "$current_directory/utilities"

oneTimeSetUp() {
  setup_container_under_test

  # Upload the ingest.yaml
  curl --data-raw "{\"commit\":\"container-tests\",\"manifest\":$(cat ../services/ingest.json)}" \
      -H 'Authorization: the API calls are coming from inside the house' \
      -H 'Content-Type: application/json' \
      http://localhost:3030/update

  wait_for_jenkins
  # shellcheck disable=SC2016
  JENKINS_HOME="$( docker exec "$container_under_test" bash -c 'echo $JENKINS_HOME' )"
}

test_smoke() {
  docker exec "$container_under_test" ps aux | grep npm > /dev/null
  assertEquals "npm should be running" 0 "$?"

  docker exec "$container_under_test" ps aux | grep java > /dev/null
  assertEquals "a java VM should be running" 0 "$?"

  curl --silent "http://localhost:$TEST_PORT" > /dev/null
  assertEquals "Jenkins port should be available" 0 "$?"

  curl --silent "http://localhost:3030" > /dev/null
  assertEquals "Backend port should be available" 0 "$?"

}

# FIXME JENKINS-51328 to re-enable
test_no_node_error_in_logs() {

    startSkipping

    result=$( docker logs "$container_under_test" |
                grep -e '^error:' )
    assertNotEquals "Node errors were found in the instance, check logs: $result" 0 $?

    endSkipping
}

# JENKINS-49861
test_no_executor() {
  numExecutors=$( docker exec "$container_under_test" cat "$JENKINS_HOME/config.xml" | \
      grep '<numExecutors>0</numExecutors>' | tr -d ' ' )
  assertEquals "<numExecutors>0</numExecutors>" "$numExecutors"
}

# JENKINS-49406 check data segregation
test_plugins_are_not_exploded_under_jenkins_home() {
  # shellcheck disable=SC2016
  result=$( docker exec "$container_under_test" bash -c 'ls $JENKINS_HOME/plugins | grep -v hpi' )
  assertEquals "" "$result"
}
test_war_is_not_exploded_under_jenkins_home() {
  # shellcheck disable=SC2016
  result=$( docker exec "$container_under_test" bash -c 'ls $JENKINS_HOME/war' 2>&1 )
  assertNotEquals "0" "$?"
  assertEquals "ls: /evergreen/jenkins/home/war: No such file or directory" "$result"
}
test_logs_are_not_under_jenkins_home() {

  # Test skipped until https://github.com/jenkinsci/sse-gateway-plugin/pull/25 is released
  startSkipping
  # shellcheck disable=SC2016
  result=$( docker exec "$container_under_test" bash -c 'ls $JENKINS_HOME/logs' 2>&1 )
  assertNotEquals "0" "$?"
  assertEquals "ls: /evergreen/jenkins/home/logs: No such file or directory" "$result"
  endSkipping
}

test_jenkins_logs_is_found_on_disk() {
  # shellcheck disable=SC2016
  result=$( docker exec "$container_under_test" bash -c 'cat $JENKINS_VAR/logs/jenkins.log.0' | \
            grep 'Jenkins is fully up and running' )
  assertEquals "0" "$?"
}

test_essentials_telemetry_logging_is_found_on_disk() {
  # shellcheck disable=SC2016
  result=$( docker exec "$container_under_test" bash -c 'ls $JENKINS_VAR/logs/essentials.log.0' )
  assertEquals "0" "$?"

  # shellcheck disable=SC2016
  result=$( docker exec "$container_under_test" bash -c 'cat $JENKINS_VAR/logs/essentials.log.0 | tail -1' )
  assertEquals "0" "$?"
  assertNotEquals "" "$result"

  echo "$result" | jsonlint > /dev/null
  assertEquals "0" "$?"
}

# not used for health-checking anymore, but kept for smoke testing
test_login_http_200() {
  status_code=$( curl --silent --output /dev/null --write-out "%{http_code}" "http://localhost:$TEST_PORT/login" )
  assertEquals "0" "$?"
  assertEquals "200" "$status_code"
}
# JENKINS-50294 Health checking
test_instance_identity_http_200() {
  status_code=$( curl --silent --output /dev/null --write-out "%{http_code}" "http://localhost:$TEST_PORT/instance-identity/" )
  assertEquals "0" "$?"
  assertEquals "200" "$status_code"
}
test_metrics_health_check() {
  output=/tmp/output$RANDOM.json
  status_code=$( curl --silent --output $output --write-out "%{http_code}" "http://localhost:$TEST_PORT/metrics/evergreen/healthcheck" )
  assertEquals "0" "$?"
  assertEquals "200" "$status_code"

  # Check output is json
  jsonlint < $output > /dev/null
  assertEquals "0" "$?"

  # Check things are all healthy
  result=$( jq '.[].healthy' < $output | sort -u )
  assertEquals "true" "$result"
}

# JENKINS-49811
test_logs_are_propagated() {

  # shellcheck disable=SC2016
  error_logging_filename=$( $COMPOSE exec -T backend sh -c 'echo $ERROR_LOGGING_FILE' )
  assertEquals "ERROR_LOGGING_FILE env variable should be defined" "0" "$?"
  assertNotEquals "Env var value should not not be empty" "" "$error_logging_filename"

  result=$( $COMPOSE exec -T backend cat "$error_logging_filename" )

  assertEquals "File $error_logging_filename should exist" "0" "$?"
  assertNotEquals "File $error_logging_filename should not be empty" "" "$result"

  # Depends on https://github.com/jenkinsci/essentials-plugin/blob/0d7ee52820db08f5790d79c189a88e2237cfe902/src/main/java/io/jenkins/plugins/essentials/logging/EssentialsLoggingConfigurer.java#L34 being the first
  echo "$result" | grep EssentialsLoggingConfigurer > /dev/null
  assertEquals "$result should contain the log from the Essentials Jenkins plugin" "0" "$?"
}

# Test everything under /evergreen is owned by the jenkins user
test_evergreen_home_is_fully_owned_by_jenkins_user() {
  result=$( docker exec "$container_under_test" find . \! -user jenkins \! -name "supervisor*" -print )
  assertEquals "Some files are not owned by 'jenkins', should not happen!" "" "$result"
}

# JENKINS-51496 check error telemetry is secured
test_error_telemetry_service_is_secured() {
  result=$( $COMPOSE exec -T instance curl --silent -H "Content-Type: application/json" -X POST \
          --data '{"log":{"version":1,"timestamp":1234,"name":"blah","level":"WARNING","message":"a msg"}}' \
          --output /dev/null \
          --write-out "%{http_code}" http://backend:3030/telemetry/error )
  assertEquals "command should succeed" 0 "$?"
  assertEquals "Service should return 401" 401 "$result"

}

# JENKINS-49866
test_docker_available_as_jenkins_user() {

  [[ "$ENVIRONMENT" = "docker-cloud" ]] || startSkipping

  $COMPOSE exec -T instance bash -c 'su - jenkins -c "DOCKER_HOST=localhost:2375 /usr/local/bin/docker version"' > /dev/null
  assertEquals "command should succeed" 0 "$?"

  $COMPOSE exec -T instance bash -c 'su - jenkins -c "DOCKER_HOST=localhost:2375 /usr/local/bin/docker run hello-world"' > /dev/null
  assertEquals "docker run hello-world" 0 "$?"

  [[ "$ENVIRONMENT" = "docker-cloud" ]] || endSkipping
}

. ./shunit2/shunit2
