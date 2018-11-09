#!/bin/bash

# call this file before deploying

temp_file=$(mktemp "${TMPDIR:-/tmp/}$(basename $0).XXXXXXXXXXX").gql

printf "dumping schema to $temp_file ...\n\n"
./script/dump-schema.js > $temp_file
printf "generating documentaion ...\n\n"
npx graphdoc -s $temp_file -o ./doc --force