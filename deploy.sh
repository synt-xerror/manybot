#!/bin/bash

TAG=$(git describe --tags --abbrev=0)
npm version $TAG --no-git-tag-version