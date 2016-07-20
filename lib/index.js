var PLX, sql, util, slice$ = [].slice, replace$ = ''.replace, this$ = this, out$ = typeof exports != 'undefined' && exports || this;
PLX = (function(){
  PLX.displayName = 'PLX';
  var prototype = PLX.prototype, constructor = PLX;
  function PLX(conn){
    this.conn = conn;
    this.eval = this.plv8xEval;
    this.ap = this.plv8xApply;
  }
  PLX.prototype.bootstrap = function(){
    var args, res$, i$, to$;
    res$ = [];
    for (i$ = 0, to$ = arguments.length; i$ < to$; ++i$) {
      res$.push(arguments[i$]);
    }
    args = res$;
    return require('./bootstrap').apply(this, args);
  };
  PLX.prototype.end = function(){
    return this.conn.end();
  };
  PLX.prototype.query = function(){
    var args, res$, i$, to$, cb, ref$;
    res$ = [];
    for (i$ = 0, to$ = arguments.length; i$ < to$; ++i$) {
      res$.push(arguments[i$]);
    }
    args = res$;
    cb = args.pop();
    return (ref$ = this.conn).query.apply(ref$, slice$.call(args).concat([function(err, arg$){
      var rows;
      if (arg$ != null) {
        rows = arg$.rows;
      }
      if (err) {
        console.log(err.stack)
        throw err;
      }
      return typeof cb == 'function' ? cb(rows) : void 8;
    }]));
  };
  PLX.prototype.plv8xEval = function(code, cb){
    if (typeof code === 'function') {
      code = "(" + code + ")()";
    }
    return this.query("select v8.eval($1) as ret", [code], function(it){
      var ref$;
      return cb(it != null ? (ref$ = it[0]) != null ? ref$.ret : void 8 : void 8);
    });
  };
  PLX.prototype.plv8xApply = function(code, args, cb){
    if (typeof code === 'function') {
      code = "(" + code + ")()";
    }
    if (typeof args !== 'string') {
      args = JSON.stringify(args);
    }
    return this.query("select v8.apply($1, $2) as ret", [code, args], function(it){
      var ref$;
      return cb(it != null ? (ref$ = it[0]) != null ? ref$.ret : void 8 : void 8);
    });
  };
  PLX.prototype.list = function(cb){
    return this.query("select name, length(code) as length from v8.code", cb);
  };
  PLX.prototype.purge = function(cb){
    return this.query("delete from v8.code", cb);
  };
  PLX.prototype.deleteBundle = function(name, cb){
    return this.query("delete from v8.code where name = $1", [name], function(it){
      return cb(it.rows);
    });
  };
  PLX.prototype._bundle = function(name, manifest, cb){
    name = name.replace(/^@\w+\//, '')
    console.log('plv8: bundling', name, '...')
    var browserify, exclude, b, i$, len$, module;
    browserify = require('browserify');
    exclude = ['one', 'browserify', 'pg', 'plv8', 'plv8x', 'pgrest', 'express', 'optimist', 'uax11'];
    if (name === 'pgrest') {
      exclude = exclude.concat(['express', 'cors', 'gzippo', 'connect-csv']);
    }
    b = browserify({
      ignoreMissing: true,
      standalone: name
    });
    for (i$ = 0, len$ = exclude.length; i$ < len$; ++i$) {
      module = exclude[i$];
      b.exclude(module);
    }
    b.require(replace$.call(manifest, /\package\.json$/, ''), {
      entry: true
    });
    return b.bundle(function(err, buf){
      if (err) {
        console.log(err);
      }
      console.log('plv8: done.')
      return cb(buf);
    });
  };
  PLX.prototype.importBundle = function(name, manifest, cb){
    var bundle_from, mtime, this$ = this;
    bundle_from = function(name, m, cb){
      return this$._bundle(name, m, cb);
    };
    mtime = require('fs').statSync(manifest).mtime;
    return this.query("select updated from v8.code where name = $1", [name], function(rows){
      if (rows.length) {
        if (rows[0].updated && rows[0].updated >= mtime) {
          return cb();
        }
      }
      return bundle_from(name, manifest, function(code){
        var ref$, q, bind;
        ref$ = rows.length
          ? ["update v8.code set code = $2, updated = $3 where name = $1", [name, code, mtime]]
          : ["insert into v8.code (name, code, updated) values($1, $2, $3)", [name, code, mtime]], q = ref$[0], bind = ref$[1];
        return this$.query(q, bind, cb);
      });
    });
  };
  return PLX;
}());
['bootstrap', 'plv8xEval', 'importBundle', 'list', 'purge', 'deleteBundle'].forEach(function(key){
  exports[key] = function(conn){
    var rest, res$, i$, to$, plx;
    res$ = [];
    for (i$ = 1, to$ = arguments.length; i$ < to$; ++i$) {
      res$.push(arguments[i$]);
    }
    rest = res$;
    console.error('deprecated api, use PLX instead');
    plx = new PLX(conn);
    return plx[key].apply(plx, rest);
  };
});
exports['new'] = function(db, config, cb){
  var pg, x$, conn, plx;
  if ('function' === typeof config) {
    cb = config;
    config = {};
  }
  if ('string' === typeof db && db.indexOf('/') < 0) {
    db = "tcp://localhost/" + db;
  }
  pg = require('pg');
  x$ = conn = new pg.Client(db);
  x$.connect();
  plx = new PLX(conn);
  plx.registerJsonType = function(oid){
    return pg.types.setTypeParser(oid, 'text', JSON.parse.bind(JSON));
  };
  if (config.client) {
    return plx.query('select v8.boot()', function(){
      return typeof cb == 'function' ? cb(plx) : void 8;
    });
  }
  return plx.bootstrap(function(){
    return plx.query('select v8.boot()', function(){
      return plx.importBundle('plv8', require.resolve('../package.json'), function(){
        return typeof cb == 'function' ? cb(plx) : void 8;
      });
    });
  });
};
out$.connect = connect;
function connect(db){
  var pg, x$;
  pg = require('pg');
  x$ = new pg.Client(db);
  x$.connect();
  return x$;
}
out$._mk_func = _mk_func;
out$.plv8xLift = plv8xLift;
function plv8xLift(module, funcName){
  var ref$, _, capture, method, fcall;
  if ((ref$ = funcName.match(/^([\s,_]*)<-([-\w]+)?$/)) != null && (_ = ref$[0], capture = ref$[1], method = ref$[2], ref$)) {
    capture || (capture = "err, _");
  } else {
    method = funcName;
  }
  fcall = method ? "." + method : '';
}
sql = require('./sql');
out$.util = util = {
  defineSchema: sql.defineSchema
};
