var dgram = require('dgram');
var sleep = require('sleep');
var Service, Characteristic;

module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;

	homebridge.registerAccessory('homebridge-xiaomi-mi-robot-vacuum', 'MiRobotVacuum', MiRobotVacuum);
}

function MiRobotVacuum(log, config) {
	var platform = this;
	this.log = log;

	this.name = config.name || 'Mi Robot Vacuum';
	this.ipAddress = config['ipAddress'];
	this.start = config['start'];
	this.stop = config['stop'];
	this.dock = config['dock'];
}

MiRobotVacuum.prototype = {
	getPowerState: function(callback) {
		callback(null, false);
	},

	setPowerState: function(powerOn, callback) {
		var client = dgram.createSocket('udp4');
		
		if(powerOn) {
			this.log('Starting Mi robot vacuum');

			client.send(new Buffer(this.start, 'hex'), 54321, this.ipAddress, (err) => {
				this.log('Mi robot vacuum started');
				client.close();
			});
		} else {
			this.log('Stopping Mi robot vacuum');

			var bufferStop = new Buffer(this.stop, 'hex');

			client.send(new Buffer(this.stop, 'hex'), 54321, this.ipAddress, (err) => {
				this.log('Mi robot vacuum stopped');
				sleep.sleep(5);

				client.send(new Buffer(this.dock, 'hex'), 54321, this.ipAddress, (err) => {
					this.log('Returning to dock');
					client.close();
				});
			});
		}

		callback();
	},

	identify: function(callback) {
		callback();
	},
	
	getServices: function() {
		var informationService = new Service.AccessoryInformation();

		informationService
			.setCharacteristic(Characteristic.Manufacturer, 'Xiao Mi')
			.setCharacteristic(Characteristic.Model, 'Mi Robot Vacuum');

		switchService = new Service.Switch(this.name);
		switchService
			.getCharacteristic(Characteristic.On)
			.on('get', this.getPowerState.bind(this))
			.on('set', this.setPowerState.bind(this));

		return [switchService];
	}
};
