#!/usr/bin/env node

/**
 * generate the plain graphql schema, start from schema/root.graphql
 * tranform the graphql string descriptions into the old comment style,
 * since @2fd/graphqldoc only support the old style,
 * https://github.com/2fd/graphdoc/issues/51
 */

const ROOT_GRAPHQL_SCHEMA = './schema/root.graphql'
const { importSchema } = require('graphql-import')
const { trim } = require('underscore.string.fp')

const def = importSchema(ROOT_GRAPHQL_SCHEMA)
  // make inline comment to multiple comments
  .replace(/(\S+)\s?(""")/g, function (match, p1, p2) {
    return p1 + '\n' + p2
  })
  .replace(/(""")\s?(\S+)/g, function (match, p1, p2) {
    return p1 + '\n' + p2
  })

const NORMAL_MODE = 0
const MULTILINE_COMMENT_MODE = 1

var mode = NORMAL_MODE

const isEmptyLine = l => !l || /^\s+$/.test(l)

def.split(/\n/)
  .forEach(function (l) {
    if (trim(' ', l) === '"""') {
      mode = mode === MULTILINE_COMMENT_MODE ? NORMAL_MODE : MULTILINE_COMMENT_MODE
      return
    }
    if (mode === MULTILINE_COMMENT_MODE) {
      if (!isEmptyLine(l)) {
        l = l.replace(/(\s?)(.+)$/, function (match, p1, p2) {
          return p1 + '# ' + p2
        })
      } else {
        l = '#'
      }
    }
    console.log(l)
  })
