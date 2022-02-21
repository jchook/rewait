#!/bin/bash

USERNAME="${USERNAME:-admin}"
PASSWORD="${PASSWORD:-password}"
RBAC_NAME="${RBAC_NAME:-Example User}"
RBAC_USERNAME="${RBAC_USERNAME:-example}"
RBAC_PASSWORD="${RBAC_PASSWORD:-example}"
CLUSTER="${CLUSTER:-localhost:8091}"
CLUSTER_INDEX_RAMSIZE="${CLUSTER_INDEX_RAMSIZE:-256}"
CLUSTER_RAMSIZE="${CLUSTER_RAMSIZE:-1024}"
BUCKETS=(
  example
)
CREATE_PRIMARY_INDEX="${CREATE_PRIMARY_INDEX:-1}"

debug() {
  echo "$*" >&2
}

waitForQueryService() {
  until cbq -e "$CLUSTER" -u "$USERNAME" -p "$PASSWORD" --script "SELECT 1" \
      | grep -qo '"success"'
  do debug "Waiting for couchbase query service..."; sleep 1; done
}

nodeExists() {
  couchbase-cli server-list \
    --cluster "$CLUSTER" \
    --username "$USERNAME" \
    --password "$PASSWORD" \
  | grep -qvP '^ERROR'
}

bucketExists() {
  couchbase-cli bucket-list -c $CLUSTER -u $USERNAME -p $PASSWORD \
    | grep -qFx "$1"
}

userExists() {
  couchbase-cli user-manage \
    --cluster $CLUSTER \
    --username $USERNAME \
    --password $PASSWORD \
    --rbac-username "$1" \
    --get >/dev/null
}

nodeInit() {
  if nodeExists; then
    return 0
  fi

  debug "Initializing node..."
  couchbase-cli node-init \
    --cluster "$CLUSTER" \
    --username "$USERNAME" \
    --password "$PASSWORD" \
    --node-init-data-path /opt/couchbase/var/lib/couchbase/data \
    --node-init-index-path /opt/couchbase/var/lib/couchbase/data

  debug "Initializing cluster..."
  couchbase-cli cluster-init \
    --cluster "$CLUSTER" \
    --cluster-username "$USERNAME" \
    --cluster-password "$PASSWORD" \
    --cluster-ramsize "$CLUSTER_RAMSIZE" \
    --cluster-index-ramsize "$CLUSTER_INDEX_RAMSIZE" \
    --services data,index,query

  waitForQueryService
}

bucketsInit() {
  for bucket in "${BUCKETS[@]}"; do

    if bucketExists "$bucket"; then
      continue
    fi

    debug "Creating bucket: $bucket..."

    couchbase-cli bucket-create \
      --cluster ""$CLUSTER"" \
      --username "$USERNAME" \
      --password "$PASSWORD" \
      --bucket "$bucket" \
      --bucket-type couchbase \
      --bucket-ramsize 256 \
      --wait

    if [ -n "$CREATE_PRIMARY_INDEX" ]; then
      cbq -u "$USERNAME" -p "$PASSWORD" -e "$CLUSTER" \
        --script "CREATE PRIMARY INDEX ON $bucket;"
    fi
  done
}

userInit() {
  if userExists "$RBAC_USERNAME"; then
    return 0
  fi
  debug "Creating RBAC user $RBAC_USERNAME..."
  couchbase-cli user-manage \
    --cluster "$CLUSTER" \
    --username "$USERNAME" \
    --password "$PASSWORD" \
    --rbac-name "$RBAC_NAME" \
    --rbac-username "$RBAC_USERNAME" \
    --rbac-password "$RBAC_PASSWORD" \
    --auth-domain 'local' \
    --roles 'admin' \
    --set
}

if [[ "$1" == "couchbase-server" ]]; then
  debug "Starting couchbase server..."
  /entrypoint.sh couchbase-server &
  CBPID="$!"

  until $(curl -so /dev/null --head "$CLUSTER"); do
    debug "Waiting for couchbase..."
    sleep 1
  done

  nodeInit
  bucketsInit
  userInit

  debug "Couchbase ready!"
  wait "$CBPID"
else
  exec "$@"
fi

