"use strict";

var fs = require("fs"),
	path = require("path"),
	exec = require("child_process").exec,
	GPIOPath = "/sys/class/gpio";

var gpio = {
	open: function(number, mode, cb) {
		number = sanitizePinNumber(number);
		mode = sanitizeDirection(mode);

		fs.writeFile(GPIOPath + "/export", number, function() {
			exec('ls ' + GPIOPath + '/gpio' + number + '_* -l', function(err, data) {
				var pin = new Pin(number, data.replace(/\n/g, '').split('_').pop());

				pin.setMode(mode, function(err, pin) {
					cb(null, pin);
				});
			});
			
		});
	},
	close: function(number, cb) {
		number = sanitizePinNumber(number);

		fs.writeFile(GPIOPath + "/unexport", number, function() {
			if (cb) {
				cb(null); }
		});
	}
}

var Pin = function(number, port) {
	this.number = sanitizePinNumber(number);
	this.port = port;
};

Pin.prototype.getMode = function(cb) {
	fs.readFile(GPIOPath + "/gpio" + this.number + '_' + this.port + '/direction', "utf8", function(err, direction) {
		if (!err && sanitizeDirection(direction.trim())) {
			cb(null, sanitizeDirection(direction.trim()));
		} else {
			cb(err || 'Internal Error');
		}
	});
};

Pin.prototype.setMode = function(mode, cb) {
	var that = this;

	fs.writeFile(GPIOPath + "/gpio" + this.number + '_' + this.port + '/direction', sanitizeDirection(mode), function() {
		if (cb) {
			cb(null, that); }
	});
};

Pin.prototype.close = function() {
	gpio.close(this.number);
};

Pin.prototype.read = function(cb) {
	fs.readFile(GPIOPath + "/gpio" + this.number + '_' + this.port + '/value', "utf8", function(err, data) {
		if (!err && data) { 
			cb(null, parseInt(data, 10));
		} else {
			cb(err || 'Internal Error');
		}
	});
};

Pin.prototype.write = function(value, cb) {
	var that = this;

	fs.writeFile(GPIOPath + "/gpio" + this.number + '_' + this.port + '/value', value, function() {
		if (cb) {
			cb(null, that); }
	});
};

Pin.prototype.high = function(cb) {
	this.write(1, cb);
};

Pin.prototype.low = function(cb) {
	this.write(0, cb);
};

Pin.prototype.on = Pin.prototype.high;
Pin.prototype.off = Pin.prototype.low;

module.exports = gpio;

/**
 * Based on https://npmjs.org/package/pi-gpio
 */
function isNumber(number) {
	return !isNaN(parseInt(number, 10));
}

/**
 * Based on https://npmjs.org/package/pi-gpio
 */
function sanitizePinNumber(pinNumber) {
	if(!isNumber(pinNumber)) {
		throw new Error("Pin number isn't valid");
	}

	return parseInt(pinNumber, 10);
}

/**
 * Based on https://npmjs.org/package/pi-gpio
 */
function sanitizeDirection(direction) {
	direction = (direction || "").toLowerCase().trim();
	if(direction === "in" || direction === "input") {
		return "in";
	} else if(direction === "out" || direction === "output" || !direction) {
		return "out";
	} else {
		throw new Error("Direction must be 'input' or 'output'");
	}
}