# backend
this is the graphql backend server

## to interact with containers

```bash
$ # run nesh, since only container "server" could connect to database
$ docker-compose exec server npx nesh
$ # to run scripts (like clear schema, create schema) in container "server"
$ docker-compose exec server /bin/sh
$ # run psql, which is available only in container "db"
$ docker-compose exec db psql -U postgres
```

## deploy to now.sh

```sh
$ now && now alias
```

## initialize an organization's data

```sh
$ # create an organization
$ ./script/add-company.js foo
$ # initialize an organization's schema
$ ./script/initialize-company.js foo
```

## TROUBLESHOOTINGS

* Can't generate graphql documentation using old graphql comment style (eg. '#  fancy comment')

  Since the package `graphql-import` will [strip away the old style comments](https://github.com/prisma/graphql-import/issues/49). So you should use the
  new string description comment style with triple doublequotes, like:

```
  your fancy comments
  comes here
```

  but unfortunately, [@2fd/graphql](https://www.npmjs.com/package/@2fd/graphdoc)
  [can't handle string description comment style](https://github.com/2fd/graphdoc/issues/51), so you will need `script/dump-schema.js` to tranform the new comment style to old style comment