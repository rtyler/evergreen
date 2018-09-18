#!/bin/bash

set -euo pipefail

if [[ -z "$CLIENT_DIR" ]]
then
  export CLIENT_DIR="/evergreen"
fi
if [[ -z "$SOURCE_DIR" ]]
then
  export SOURCE_DIR="/src"
fi

warn() {
  echo -e "$RED**** $@ ****$NC"
}

info() {
  echo "$@"
}

wait_for_client() {
  max_attempts=10
  cur_attempts=0
  wait_time=2
  while true
  do
    cur_attempts=$(( cur_attempts + 1 ))
    if ( docker logs $container_under_test | grep "Jenkins is fully up and running" ); then
      info "Client has started."
      break;
    elif (( $cur_attempts > $max_attempts )); then
      warn "Client did not start successfully, rolling back..."
      break;
    else
      info "Waiting for successful client startup... ($cur_attempts/$max_attempts attempts) "
    fi
    sleep $wait_time
  done
  (( $cur_attempts < $max_attempts ))
}

## MAIN ##
latest_file=$(ls -1 ${SOURCE_DIR}/evergreen-*.zip | sort -rV | head -1)
latest_dir=${${latest_file%.zip}##*/}
current_link=${$(readlink $CLIENT_DIR)##*/}
updated=false
if [[ "$current_link" != "$latest_dir" ]]
then
  cd $SOURCE_DIR
  unzip -u $latest_file
  unlink "$CLIENT_DIR"
  ln -sf "$SOURCE_DIR/$latest_dir" "$CLIENT_DIR"
  updated=true
fi

while true
do
  /usr/local/bin/npm run client
  wait_for_client
  if [[ $? -ne 0 && updated ]]
  then
    unlink "$CLIENT_DIR"
    ln -sf "$SOURCE_DIR/$current_link" "$CLIENT_DIR"
    updated=false
  elif [[ $? -ne 0 ]]
  then
    warn "Unable to start client, exiting."
    break
  fi
fi