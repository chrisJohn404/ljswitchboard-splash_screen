

var fs = require('fs');
var q = require('q');
var path = require('path');

// Require 3rd party libaries
var rmdir = require('rimraf');
var fse = require('fs-extra');

var createDataManager = function(baseDirectory, folderName, curVersion) {
	var basePath = path.join(baseDirectory, folderName);
	var versionFileName = 'info.json';
	var versionFilePath = path.join(basePath, versionFileName);
	
	this.getPath = function() {
		return basePath;
	};

	var initializeDirectory = function() {
		var defered = q.defer();
		fs.exists(basePath, function(exists) {
			if(exists) {
				// Empty directory by deleting all items in it.
				fse.emptyDir(basePath, function(err) {
					if(err) {
						fse.emptyDir(basePath, function(err) {
							if(err) {
								fse.emptyDir(basePath, function(err) {
									if(err) {
										defered.reject('failed to empty dir:' + basePath);
									} else {
										defered.resolve();
									}
								});
							} else {
								defered.resolve();
							}
						});
					} else {
						defered.resolve();
					}
				});
				// Empty directory by deleting it & making it again.
				// rmdir(basePath, function(err) {
				// 	if(err) {
				// 		defered.reject('failed to remove dir:' + basePath);
				// 	} else {
				// 		fs.mkdir(basePath, function(err) {
				// 			if(err) {
				// 				defered.reject('failed to make dir:' + basePath);
				// 			} else {
				// 				defered.resolve();
				// 			}
				// 		});
				// 	}
				// });
			} else {
				fs.mkdir(basePath, function(err) {
					if(err) {
						defered.reject('failed to make dir:' + basePath);
					} else {
						defered.resolve();
					}
				});
			}
		});
		return defered.promise;
	};
	var initializeVersionFile = function() {
		var defered = q.defer();
		var versionData = {'version': curVersion};
		var dataString = JSON.stringify(versionData);
		fs.writeFile(
			versionFilePath,
			dataString,
			{'encoding': 'ascii'},
			function(res) {
				defered.resolve(true);
			}
		);
		return defered.promise;
	};

	this.init = function(forceRefresh) {
		var defered = q.defer();
		var isValid = true;
		try {
			
			// 1. Check to see if the basePath exists, if it doesn't, create it.
			if(!fs.existsSync(basePath)) {
				isValid = false;
			}

			// 2. Check to see if the basePath/info.json exists
			if(!fs.existsSync(versionFilePath)) {
				isValid = false;
			}

			// 3. Read the file and make sure that it is the appropriate version.
			if(isValid) {
				var fileData = fs.readFileSync(versionFilePath);
				var parsedFile = JSON.parse(fileData);
				if(parsedFile.version) {
					if(parsedFile.version !== curVersion) {
						isValid = false;
					}
				} else {
					isValid = false;
				}
			}
		} catch (err) {
			isValid = false;
		}

		if(!isValid || forceRefresh) {
			function getOnErr(msg) {
				return function(err) {
					var innerDefered = q.defer();
					console.error('Error!', err, msg);
					innerDefered.reject(err);
					return innerDefered.promise;
				};
			};
			initializeDirectory()
			.then(initializeVersionFile, getOnErr('error initializing dir'))
			// .then(function(res) {
			// 	console.log('Resolving in pdm', res);
			// 	defered.resolve(res);
			// }, function(err) {
			// 	console.log('Rejecting in pdm', err);
			// 	defered.reject(err);
			// });
			.then(defered.resolve, defered.reject);
		} else {
			defered.resolve(false);
		}
		return defered.promise;
	};

	var self = this;
};

exports.create = createDataManager;