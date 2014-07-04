require('shelljs/global');
var request = require('request');

module.exports = EconBuild;

function EconBuild (options) {
  this.options = options || {};

  if (!this.options.workspace) this.options.workspace = this.options.appName + ".xcworkspace/";
  if (!this.options.scheme) this.options.scheme = this.options.appName;

  if (this.options.branch) {
    // refs/pull/39/head
    var parts = this.options.branch.split("/");

    if (parts[0] === "refs" && parts[1] === "pull") {
      this.prNumber = parts[2];
    }
  }

  this.rootPath = '/Users/xiplias/Projects/Champion';
}

EconBuild.prototype.xcodeBuild = function () {
  var options = this.options;

  // Vanity check
  if (!options.workspace || !options.scheme) {
    echo('##teamcity[message text=\'build missing options workspace or scheme\' status=\'ERROR\']');
    exit(1);
  }

  var command = 'xctool -workspace ' + options.workspace + ' -scheme ' + options.scheme + ' clean archive -archivePath ./build';

  // Output
  echo('##teamcity[compilationStarted compiler=\'xcodebuild\']');
  if(options.debug) echo('Running command: '+command);

  var exe = exec(command);

  // Building
  if (exe.code !== 0) {
    echo('##teamcity[message text=\'compiler error\' status=\'ERROR\']');
    echo('##teamcity[compilationFinished compiler=\'xcodebuild\']');
    exit(exe.code);
  }
};

EconBuild.prototype.xcodeSign = function () {
  var applicationPath = this.rootPath + '/build.xcarchive/Products/Applications/'+this.options.appName+'.app';
  var ipaPath = this.rootPath + '/app.ipa';

  var command = 'xcrun -log -sdk iphoneos PackageApplication "' + applicationPath + '" -o ' +ipaPath+ ' -sign "'+ this.options.signing +'" -embed "' + this.options.provision + '"';

  if(this.options.debug) echo('Running command: '+command);

  var exe = exec(command);

  if (exe.code !== 0) {
    echo('##teamcity[message text=\'sign error\' status=\'ERROR\']');
    exit(exe.code);
  }
};

EconBuild.prototype.zipdSYM = function () {
  var dSYMPath = this.rootPath + '/build.xcarchive/dSYMs/'+this.options.appName+'.app.dSYM';
  var destPath = this.rootPath + '/app.dSYM.zip';

  var command = 'zip -r -9 ' + destPath + ' ' + dSYMPath;

  if(this.options.debug) echo('Running command: '+command);

  var exe = exec(command);

  if (exe.code !== 0) {
    echo('##teamcity[message text=\'dSYM compress error\' status=\'ERROR\']');
    exit(exe.code);
  }
};

EconBuild.prototype.uploadToHockeyApp = function () {
  var pathToIpa   = this.rootPath + '/app.ipa';
  var pathTodSYM  = this.rootPath + '/app.dSYM.zip';
  var hockeyUrl   = 'https://rink.hockeyapp.net/api/2/apps/upload';

  var command = 'curl -s -F \'status=2\' -F \'notify=0\' -F \'release_type=2\' -F \'notes=github.com/repos/'+this.options.githubRepo+'/issues/'+this.prNumber+'\' -F \'notes_type=0\' -F \'ipa=@'+pathToIpa +'\' -F \'dsym=@'+ pathTodSYM +'\' -H \'X-HockeyAppToken:'+ this.options.hockeyToken + '\' '+hockeyUrl;

  if(this.options.debug) echo('Running command: '+command);

  var exe = exec(command, { silent: false });

  this.downloadUrl = JSON.parse(exe.output).public_url;

  if (exe.code !== 0) {
    echo('##teamcity[message text=\'dSYM compress error\' status=\'ERROR\']');
    exit(exe.code);
  }
};

EconBuild.prototype.commentBuildOnGithub = function () {
  if (!this.downloadUrl) {
    echo('##teamcity[message text=\'donwnloadUrl, githubToken, owner, repo or prNumber missing \' status=\'ERROR\']');
    exit(1);
  }

  var send = request({
    method: "POST",
    url: 'https://api.github.com/repos/'+this.options.githubRepo+'/issues/'+this.prNumber+'/comments',
    headers: {
      "Authorization": "token "+this.options.githubToken,
      "User-Agent": "Econ Build"
    },
    json: {
      body:'iPhone build: '+this.downloadUrl
    }
  }, function (err, result) {
    console.log(err, result);
  });


};

EconBuild.prototype.xcodeTest = function () {
  var options = this.options;

  // Vanity check
  if (!options.workspace || !options.scheme) {
    echo('##teamcity[message text=\'missing options\' status=\'ERROR\']');
  }

  var command = 'xctool -workspace ' + options.workspace + ' -configuration Debug -scheme ' + options.scheme + ' test -test-sdk iphonesimulator7.1 -freshSimulator -resetSimulator';


  // Output
  echo('##teamcity[testStarted compiler=\'xcodebuild\']');
  if(this.options.debug) echo('Running command: '+command);

  // Building
  var execCommand = exec(command, {
    silent: false
  });



  if (execCommand.code !== 0) {
    echo('\n##teamcity[message text=\'test error\' status=\'ERROR\']');
    exit(1);
  }

  // Success
  echo('\n##teamcity[testFinished compiler=\'xcodebuild\']');
};

EconBuild.prototype.changeVersionToPR = function () {

  var command = 'agvtool new-marketing-version PR-'+this.prNumber || "master";

  var execCommand = exec(command, {
    silent: false
  });

  if (execCommand.code !== 0) {
    echo('\n##teamcity[message text=\'change version error\' status=\'ERROR\']');
    exit(1);
  }
}
