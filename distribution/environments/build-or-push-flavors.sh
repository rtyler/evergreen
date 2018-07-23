#!/bin/bash
set -euo pipefail

IMAGE_NAME=jenkins/evergreen

if [[ "$1" == "build" ]]; then
  for dir in *-cloud
  do
    echo "Building $dir directory"
    docker build --build-arg FLAVOR=$dir -t "$IMAGE_NAME:$dir" "$dir"
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
