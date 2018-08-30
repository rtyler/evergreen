#!/bin/bash

set -euo pipefail

passwordFileLocation="$JENKINS_HOME/secrets/initialAdminPassword"
passwordFileLocationDirectory="$( dirname "$passwordFileLocation" )"

generateNewAdminPassword() {
  echo -n "Creating $passwordFileLocationDirectory... "
  mkdir -p "$passwordFileLocationDirectory"
  echo "Done."

  echo -n "Generating admin password... "
  echo $RANDOM | md5sum | cut -d ' ' -f 1 > "$passwordFileLocation"
  echo "Done. Password value stored in $passwordFileLocation file."
}

if [[ -f $passwordFileLocation ]]; then
  echo "Password file already exists, not generating a new one."
else
  generateNewAdminPassword
fi

JENKINS_ADMIN_PASSWORD="$( cat "$passwordFileLocation" )"

# Intended for ease of development. By default, password is obviously *not* put in logs.
if [[ "${INSECURE_SHOW_ADMIN_PASSWORD:-false}" == "true" ]]; then
  echo "[WARNING] INSECURE_SHOW_ADMIN_PASSWORD defined, it should only ever be done for testing."
  echo "[admin password] $JENKINS_ADMIN_PASSWORD"
fi

export JENKINS_ADMIN_PASSWORD
exec jenkins.sh
