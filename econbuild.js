require('shelljs/global');

module.exports = EconBuild;

function EconBuild (options) {
  this.options = options || {};
  if(!this.options.configuration) this.options.configuration = 'Release build archive';
}

EconBuild.prototype.xcodeBuild = function () {
  var options = this.options;

  // Vanity check
  if (!options.workspace || !options.scheme || !options.sdk || !options.configuration) {
    echo('##teamcity[message text="missing options" status="ERROR"]');
  }

  var command = 'xcodebuild -workspace ' + options.workspace + ' -scheme ' + options.scheme + ' -sdk ' + options.sdk + ' -configuration ' + options.configuration;

  // Output
  echo('##teamcity[compilationStarted compiler="xcodebuild"]');
  if(options.debug) echo('Running command: '+command);

  // Building
  if (exec(command).code !== 0) {
    echo('##teamcity[message text="compiler error" status="ERROR"]');
    echo('##teamcity[compilationFinished compiler="xcodebuild"]');
  }
};

EconBuild.prototype.xcodeTest = function () {
  var options = this.options;

  // Vanity check
  if (!options.workspace || !options.scheme) {
    echo('##teamcity[message text="missing options" status="ERROR"]');
  }

  var command = 'xctool -workspace ' + options.workspace + ' -scheme ' + options.scheme + ' test -test-sdk iphonesimulator7.1';

  // Output
  echo('##teamcity[testStarted compiler="xcodebuild"]');
  if(this.options.debug) echo('Running command: '+command);

  // Building
  var execCommand = exec(command, {
    silent: false
  });

  if (execCommand.code !== 0) {
    echo('\n##teamcity[message text="test error" status="ERROR"]');
    exit(1);
  }

  // Success
  echo('\n##teamcity[testFinished compiler="xcodebuild"]');
  exit(0);
};
