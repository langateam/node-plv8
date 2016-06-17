var fs, pg, prettyBytes, plv8x, argv, conString;
var path = require('path')
fs = require('fs');
pg = require('pg');
prettyBytes = require('pretty-bytes');
plv8x = require('../');
argv = require('optimist').usage('Usage: plv8x {OPTIONS}').wrap(80).option('db', {
  alias: 'd',
  desc: 'database connection string'
}).option('list', {
  alias: 'l',
  desc: 'List bundles'
}).option('purge', {
  desc: 'Purge bundles'
}).option('import', {
  alias: 'i',
  desc: 'Import bundles'
}).option('delete', {
  desc: 'Delete bundles'
})
.option('query', {
  alias: 'c',
  desc: 'Execute query'
}).option('eval', {
  alias: 'e',
  desc: 'Eval the given expression in plv8x context'
}).option('require', {
  alias: 'r',
  desc: 'Require the given file and eval in plv8x context'
}).option('json', {
  alias: 'j',
  desc: 'Use JSON for output'
}).option('help', {
  alias: 'h',
  desc: 'Show this message'
}).check(function(argv){
  if (argv.help) {
    throw '';
  }
  if (process.argv.length <= 2) {
    throw 'Specify a parameter.';
  }
}).argv;
conString = argv.db || process.env['PLV8XCONN'] || process.env['PLV8XDB'] || process.env.TESTDBNAME;
if (!conString) {
  console.log("ERROR: Please set the PLV8XDB environment variable, or pass in a connection string to -d");
  process.exit();
}
plv8x['new'](conString, function(plx){
  var done, ref$, name, manifest, ref1$, spec, source, code;
  done = function(output){
    var YAML;
    if (output) {
      if (argv.json) {
        output = JSON.stringify(output);
      }
      console.log(output);
    }
    return plx.end();
  };
  switch (false) {
  case !argv['import']:
    ref$ = argv['import'].split(':'), name = ref$[0], manifest = (ref1$ = ref$[1]) != null
      ? ref1$
      : require.resolve(path.resolve(process.cwd(), 'node_modules', name, "package.json"));
    return plx.importBundle(name, manifest, function(){
      return done();
    });
  case !argv['delete']:
    return plx.deleteBundle(argv['delete'], function(){
      return done();
    });
  case !argv.purge:
    return plx.purge(function(it){
      console.log(it);
      return done();
    });
  case !argv.list:
    return plx.list(function(res){
      var name, length;
      if (!argv.json) {
        res = (function(){
          var i$, ref$, len$, ref1$, results$ = [];
          for (i$ = 0, len$ = (ref$ = res).length; i$ < len$; ++i$) {
            ref1$ = ref$[i$], name = ref1$.name, length = ref1$.length;
            results$.push(name + ": " + prettyBytes(length));
          }
          return results$;
        }()).join('\n');
      }
      return done(res);
    });
  case !argv.query:
    return plx.query(argv.query, done);
  case !argv.eval:
    code = plv8x.xpressionToBody(argv.eval);
    return plx.eval("(" + code + ")()", done);
  case !argv['eval-ls']:
    code = plv8x.xpressionToBody("~>" + argv['eval-ls']);
    return plx.eval("(" + code + ")()", done);
  case !argv.require:
    code = fs.readFileSync(argv.require, 'utf8');
    if (/\.ls$/.exec(argv.require)) {
      code = plv8x.compileLivescript(code);
    }
    return plx.eval(code, done);
  default:
    console.log("Unknown command: " + argv._[0]);
    return done();
  }
});
