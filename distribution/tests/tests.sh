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

  # (parameter for ingest file name *is* optional)
  # shellcheck disable=SC2119
  upload_update_level

  # (parameter for ingest file name *is* optional)
  # shellcheck disable=SC2119
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

test_required_plugins_are_here() {
  docker exec "$container_under_test" ls "$JENKINS_HOME/plugins/metrics.jpi"
  assertEquals "The metrics plugin should be installed" 0 "$?"

  # workaround for JENKINS-52197
  # shellcheck disable=SC2016
  docker exec "$container_under_test" bash -c 'ls $JENKINS_HOME/plugins/evergreen*.jpi'
  assertEquals "The evergreen plugin should be installed" 0 "$?"

  # shellcheck disable=SC2016
  docker exec "$container_under_test" bash -c 'ls $JENKINS_HOME/plugins/configuration-as-code*.jpi'
  assertEquals "The configuration-as-code plugin should be installed" 0 "$?"
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
  assertEquals "numExecutors in config.xml should be 0" "<numExecutors>0</numExecutors>" "$numExecutors"
}

# JENKINS-49406 check data segregation
test_plugins_are_not_exploded_under_jenkins_home() {
  # shellcheck disable=SC2016
  result=$( docker exec "$container_under_test" bash -c 'ls $JENKINS_HOME/plugins | grep -v jpi' )
  assertEquals "jpi should not be found in plugins dir" "" "$result"
}
test_war_is_not_exploded_under_jenkins_home() {
  # shellcheck disable=SC2016
  result=$( docker exec "$container_under_test" bash -c 'test -d $JENKINS_HOME/war' 2>&1 )
  assertNotEquals "war directory should not be found (output=$result)" "0" "$?"
}
test_logs_are_not_under_jenkins_home() {

  # shellcheck disable=SC2016
  result=$( docker exec "$container_under_test" bash -c 'test -d $JENKINS_HOME/logs' 2>&1 )
  assertNotEquals "ls should return non zero for logs dir, i.e. dir should be absent (output=$result)" "0" "$?"
}

test_jenkins_logs_is_found_on_disk() {
  # shellcheck disable=SC2016
  result=$( docker exec "$container_under_test" bash -c 'cat $JENKINS_VAR/logs/jenkins.log.0' | \
            grep 'Jenkins is fully up and running' )
  assertEquals "log message not found for Jenkins full up" "0" "$?"
}

test_evergreen_telemetry_logging_is_found_on_disk() {
  # shellcheck disable=SC2016
  result=$( docker exec "$container_under_test" bash -c 'ls $JENKINS_VAR/logs/evergreen.log.0' )
  assertEquals "ls evergreen.log.0 didn't work: $result" "0" "$?"

  # shellcheck disable=SC2016
  result=$( docker exec "$container_under_test" bash -c 'cat $JENKINS_VAR/logs/evergreen.log.0 | tail -1' )
  assertEquals "cat evergreen.log.0 | tail -1 didn't work: $result" "0" "$?"
  assertNotEquals "last line of log is empty" "" "$result"

  echo "$result" | jsonlint > /dev/null
  assertEquals "last line of log is not valid json: $result" "0" "$?"
}

# not used for health-checking anymore, but kept for smoke testing
test_login_http_200() {
  status_code=$( curl --silent --output /dev/null --write-out "%{http_code}" "http://localhost:$TEST_PORT/login" )
  assertEquals "curl login did not return success" "0" "$?"
  assertEquals "login did not return success http status code" "200" "$status_code"
}
# JENKINS-50294 Health checking
test_instance_identity_http_200() {
  status_code=$( curl --silent --output /dev/null --write-out "%{http_code}" "http://localhost:$TEST_PORT/instance-identity/" )
  assertEquals "curl instance-identity did not return success" "0" "$?"
  assertEquals "instance-identity did not return success http status code" "200" "$status_code"
}
test_metrics_health_check() {
  output=/tmp/output$RANDOM.json
  status_code=$( curl --silent --output $output --write-out "%{http_code}" "http://localhost:$TEST_PORT/metrics/evergreen/healthcheck" )
  assertEquals "curl healthcheck did not return success" "0" "$?"
  assertEquals "healthcheck did not return success http status code" "200" "$status_code"

  # Check output is json
  jsonlint < $output > /dev/null
  assertEquals "output was not valid json" "0" "$?"

  # Check things are all healthy
  result=$( jq '.[].healthy' < $output | sort -u )
  assertEquals "healthy checks were not all true" "true" "$result"
}

# JENKINS-49811
test_logs_are_propagated() {

  error_logging_filename='/tmp/error-telemetry-testing.log';

  result=$( $COMPOSE exec -T backend cat "$error_logging_filename" )

  assertEquals "File $error_logging_filename should exist" "0" "$?"
  assertNotEquals "File $error_logging_filename should not be empty" "" "$result"

  # Depends on https://github.com/jenkinsci/evergreen-plugin/blob/69ee85fa5e9ad2ca46ca4b357453151745ec89c9/src/main/java/io/jenkins/plugins/evergreen/logging/EvergreenLoggingConfigurer.java#L35 being the first
  echo "$result" | grep EvergreenLoggingConfigurer > /dev/null
  assertEquals "$result should contain the log from the Evergreen Jenkins plugin" "0" "$?"
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

  [[ "$FLAVOR" = "docker-cloud" ]] || startSkipping

  $COMPOSE exec -T instance bash -c 'su - jenkins -c "DOCKER_HOST=localhost:2375 /usr/local/bin/docker version"' > /dev/null
  assertEquals "command should succeed" 0 "$?"

  $COMPOSE exec -T instance bash -c 'su - jenkins -c "DOCKER_HOST=localhost:2375 /usr/local/bin/docker run hello-world"' > /dev/null
  assertEquals "docker run hello-world" 0 "$?"

  [[ "$FLAVOR" = "docker-cloud" ]] || endSkipping
}

# JENKINS-52728
test_no_maven_or_freestyle_jobs() {
  # shellcheck disable=SC2016
  adminPassword=$( docker exec "$container_under_test" bash -c 'cat $JENKINS_HOME/secrets/initialAdminPassword' )

  topLevelDescriptor=$( curl --silent -u "admin:$adminPassword" http://localhost:$TEST_PORT/jenkins/evergreen/api/xml )
  assertEquals "Curl call to Evergreen XML API should have succeeded" 0 "$?"

  echo "$topLevelDescriptor" | grep -i WorkflowJob > /dev/null
  assertEquals "WorkflowJob should have been found" 0 "$?"

  echo "$topLevelDescriptor" | grep -i WorkflowMultiBranchProject > /dev/null
  assertEquals "WorkflowMultiBranchProject should have been found" 0 "$?"

  echo "$topLevelDescriptor" | grep -i OrganizationFolder > /dev/null
  assertEquals "OrganizationFolder should have been found" 0 "$?"

  echo "$topLevelDescriptor" | grep -i Maven > /dev/null
  assertNotEquals "Maven should not have been found" 0 "$?"

  echo "$topLevelDescriptor" | grep -i FreeStyle > /dev/null
  assertNotEquals "FreeStyle jobs should not have been found" 0 "$?"

}

# JENKINS-53215
test_secure_defaults_ootb() {
  # shellcheck disable=SC2016
  adminPassword=$( docker exec "$container_under_test" bash -c 'cat $JENKINS_HOME/secrets/initialAdminPassword' )
  managePage=$( curl --silent -u "admin:$adminPassword" http://localhost:$TEST_PORT/manage )
  assertEquals "Curl call to /manage should have succeeded" 0 "$?"

  echo "$managePage" | grep 'Allowing Jenkins CLI to work in -remoting mode is considered dangerous' > /dev/null
  assertNotEquals "CLI in remoting mode should be disabled" 0 "$?"

  echo "$managePage" | grep 'You have not configured the CSRF issuer. This could be a security issue.' > /dev/null
  assertNotEquals "CSRF issuer should be configured" 0 "$?"

  echo "$managePage" | grep 'Agent to master security subsystem is currently off.' > /dev/null
  assertNotEquals "Agent to master security should be enabled" 0 "$?"
}

test_manage_plugins_restricted() {
  # shellcheck disable=SC2016
  adminPassword=$( docker exec "$container_under_test" bash -c 'cat $JENKINS_HOME/secrets/initialAdminPassword' )
  result=$( curl -v -u "admin:$adminPassword" http://localhost:$TEST_PORT/pluginManager/ 2>&1 )
  assertEquals "curl call to /pluginManager should have succeeeded" 0 "$?"

  echo "${result}" | grep "< Location: http://localhost:$TEST_PORT/evergreen/docs/#managing-plugins"
  assertEquals "/pluginManager did not properly redirect! ${result}" 0 "$?"
}

test_blueocean_default_redirect() {
  # shellcheck disable=SC2016
  adminPassword=$( docker exec "$container_under_test" bash -c 'cat $JENKINS_HOME/secrets/initialAdminPassword' )
  # Follow the redirecs and make sure we end up on a proper page
  result=$( curl -v -L -u "admin:$adminPassword" http://localhost:$TEST_PORT/ 2>&1 )
  assertEquals "curl call to /should have succeeeded" 0 "$?"
}

test_git_history_is_present() {
  commitCount=$( docker exec -w "$JENKINS_HOME" "$container_under_test" git rev-list --count HEAD )
  assertEquals "git call to count commits should have succeeded" 0 "$?"

  assertEquals 3  "$commitCount"

  docker exec -w "$JENKINS_HOME" "$container_under_test" git log --pretty=format:%s HEAD~..HEAD | \
                grep 'Snapshot after downloads completed, before Jenkins restart' > /dev/null
  assertEquals "git call to retrieve last subject should have succeeded" 0 "$?"
}

# JENKINS-53856
test_no_permission_error_in_logs() {

    result=$( docker logs "$container_under_test" |
                grep -i 'Permission denied' )
    assertNotEquals "Permission errors found in the instance, check logs: $result" 0 $?

}

test_no_anonymous_read() {
  result=$( curl -v -f -I http://localhost:$TEST_PORT/computer/ 2>&1 )
  assertNotEquals "curl call to /computer should not have succeeeded" 0 "$?"
}

# JENKINS-54466
test_no_hpi() {
  pluginDir="$JENKINS_HOME/plugins"

  hpiList=$( docker exec -w "$pluginDir" "$container_under_test" bash -c 'ls *.hpi' )
  assertNotEquals "there should be no .hpi under $pluginDir: $hpiList" 0 "$?"

  jpiList=$( docker exec -w "$pluginDir" "$container_under_test" bash -c 'ls *.jpi' )
  assertEquals "there should be (many) .jpi under $pluginDir: $jpiList" 0 "$?"
}

# the `remotingCLI` symbol was removed in https://github.com/jenkinsci/jenkins/pull/3838
# which makes Evergreen crash on Jenkins 2.165+
# as we cannot update the config files yet, we needed to do this using the Jenkins Evergreen plugin
# given we *do* have the ability to push plugin updates.
# This test checks that the CasC file is updated
test_no_remotingCLI_in_casc_file() {

  # race condition risk? That check might run *before* the plugin has had the time to modify the file?
  docker exec "$container_under_test" bash -c "cat $EVERGREEN_HOME/config/as-code/create-admin-user.yaml | grep remotingCLI"
  assertNotEquals "casc file should NOT contain remotingCLI entry anymore" 0 "$?"

}

. ./shunit2/shunit2
