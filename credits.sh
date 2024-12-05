#!/bin/bash

# Exit on error
set -e
# Exit on pipe failure
set -o pipefail

# Database connection settings
DATA_DIR="${DB_PATH:-/app/dbdata/postgres}"
PGPORT=5394
PGHOST=localhost

function print_usage() {
    echo "Usage:"
    echo "  $0 get <email>            - Get credits for a user"
    echo "  $0 set <email> <credits>  - Set credits for a user (can be decimal)"
}

if [ $# -lt 2 ]; then
    print_usage
    exit 1
fi

ACTION=$1
EMAIL=$2

case $ACTION in
    "get")
        NANOCREDITS=$(psql -p $PGPORT -h $PGHOST postgres -t -c "SELECT nanocredits FROM user_credits WHERE email = '$EMAIL';")
        if [ -z "$NANOCREDITS" ]; then
            echo "0"
        else
            # Convert nanocredits to credits (divide by 1e9) using awk for floating point arithmetic
            echo "$NANOCREDITS" | awk '{printf "%.9f\n", $1 / 1000000000}'
        fi
        ;;
    "set")
        if [ $# -ne 3 ]; then
            echo "Error: 'set' action requires an email and credit amount"
            print_usage
            exit 1
        fi
        CREDITS=$3
        # Convert credits to nanocredits (multiply by 1e9) using awk for floating point arithmetic
        NANOCREDITS=$(echo "$CREDITS" | awk '{printf "%.0f\n", $1 * 1000000000}')
        psql -p $PGPORT -h $PGHOST postgres -t -c "INSERT INTO user_credits (email, nanocredits) 
            VALUES ('$EMAIL', $NANOCREDITS) 
            ON CONFLICT (email) 
            DO UPDATE SET nanocredits = $NANOCREDITS;"
        echo "Successfully set credits for $EMAIL to $CREDITS"
        ;;
    *)
        echo "Error: Invalid action. Use 'get' or 'set'"
        print_usage
        exit 1
        ;;
esac
