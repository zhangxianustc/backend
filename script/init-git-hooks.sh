#!/bin/bash

find .git/hooks -type l -exec rm {} \; && find .git-hooks -type f -exec ln -sf ../../{} .git/hooks/ \;