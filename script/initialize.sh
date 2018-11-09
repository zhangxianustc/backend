#!/bin/bash

echo 'this script will re-initialize all the data, BE CAUTIOUS to use it in production environment'

echo

echo 'type in "yes" to continue: '

read go_on

if [[ $go_on = "yes" ]]; then
    ./script/clear-schema.js
    ./script/create-schemas.js
    ./script/initialize.js
else
    exit 1
fi
