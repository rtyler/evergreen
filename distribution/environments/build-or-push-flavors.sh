#!/bin/bash
set -euo pipefail

IMAGE_NAME=batmat/evergreen

set -xe

if [[ "$1" == "build" ]]; then
  for dir in *-cloud
  do
    echo "Building $dir directory"
    # Changing up a directory to ensure we have the full build context
    (cd ../ && \
        docker build --build-arg FLAVOR="$dir" -t "$IMAGE_NAME:$dir" -f "environments/$dir/Dockerfile" .)
  done
elif [[ "$1" == "push" ]]; then
  for dir in *-cloud
  do
    echo "Push $dir image"
    docker push "$IMAGE_NAME:$dir"
  done
else
  echo "Unknown parameter, failing."
  exit 1
fi
