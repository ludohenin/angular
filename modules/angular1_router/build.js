'use strict';

var fs = require('fs');
var ts = require('typescript');

var files = [
  'lifecycle_annotations_impl.ts',
  'url_parser.ts',
  'path_recognizer.ts',
  'route_config_impl.ts',
  'async_route_handler.ts',
  'sync_route_handler.ts',
  'route_recognizer.ts',
  'instruction.ts',
  'route_config_nomalizer.ts',
  'route_lifecycle_reflector.ts',
  'route_registry.ts',
  'router.ts'
];

var PRELUDE = '(function(){\n';
var POSTLUDE = '\n}());\n';
var FACADES = fs.readFileSync(__dirname + '/lib/facades.es5', 'utf8');
var DIRECTIVES = fs.readFileSync(__dirname + '/src/ng_outlet.js', 'utf8');
var moduleTemplate = fs.readFileSync(__dirname + '/src/module_template.js', 'utf8');

function main() {
  var ES6_SHIM = fs.readFileSync(__dirname + '/../../node_modules/es6-shim/es6-shim.js', 'utf8');
  var dir = __dirname + '/../angular2/src/router/';

  var sharedCode = '';
  files.forEach(function (file) {
    var moduleName = 'router/' + file.replace(/\.ts$/, '');

    sharedCode += transform(moduleName, fs.readFileSync(dir + file, 'utf8'));
  });

  var out = moduleTemplate.replace('//{{FACADES}}', FACADES).replace('//{{SHARED_CODE}}', sharedCode);

  return PRELUDE + DIRECTIVES + out + POSTLUDE;
}


/*
 * Given a directory name and a file's TypeScript content, return an object with the ES5 code,
 * sourcemap, and exported variable identifier name for the content.
 */
var IMPORT_RE = new RegExp("import \\{?([\\w\\n_, ]+)\\}? from '(.+)';?", 'g');
function transform(dir, contents) {
  contents = contents.replace(IMPORT_RE, function (match, imports, includePath) {
    //TODO: remove special-case
    if (isFacadeModule(includePath) || includePath === './router_outlet') {
      return '';
    }
    return match;
  });
  return ts.transpile(contents, {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
    sourceRoot: dir
  });
}


function angularFactory(name, deps, body) {
  return ".factory('" + name + "', [" +
    deps.map(function (service) {
      return "'" + service + "', ";
    }).join('') +
    "function (" + deps.join(', ') + ") {\n" + body + "\n}])";
}


function isFacadeModule(modulePath) {
  return modulePath.indexOf('facade') > -1 ||
    modulePath === 'angular2/src/core/reflection/reflection';
}

module.exports = function () {
  var dist = __dirname + '/../../dist';
  if (!fs.existsSync(dist)) {
    fs.mkdirSync(dist);
  }
  fs.writeFileSync(dist + '/angular_1_router.js', main(files));
};
