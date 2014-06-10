#!/usr/bin/env node

var program = require('commander');
var Econ = require('./econbuild');

// program
//   .version('0.0.1')
//   .option('-r, --repo [url]', 'Github repo url', 'url')
//   .option('-p, --pull-request [number]', 'Github pull-request ID', 'number')
//   .option('-g, --github-token [token]', 'Github auth token', 'token')
//   .option('-a, -- [token]', 'Github auth token', 'token')
//   .option('-t, --testflight-token [token]', 'Github auth token', 'token')
//   .option('-n, --name [token]', 'Github auth token', 'token')
//   .parse(process.argv);

program
  .command('test')
  .option("-w, --workspace [workspace]", "Path to workspace")
  .option("-s, --scheme [scheme]", "Name of Scheme")
  .option("-d, --debug", "Enable more logging")

  .description('test ios project')
  .action(function(env, options) {
    console.log(options);
    var econ = new Econ({
      workspace: env.workspace,
      scheme: env.scheme,
      debug: env.debug
    });
    econ.xcodeTest();
  });

program.parse(process.argv);
