var miio = require('miio');
var Accessory, Service, Characteristic, UUIDGen;

module.exports = function(homebridge) {
	Accessory = homebridge.platformAccessory;
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	UUIDGen = homebridge.hap.uuid;

	homebridge.registerAccessory('homebridge-xiaomi-mi-robot-vacuum', 'MiRobotVacuum', MiRobotVacuum);
}

function MiRobotVacuum(log, config) {
	this.log = log;
	this.name = config.name || 'Vacuum Cleaner';
	this.ip = config.ip;
	this.token = config.token;
	this.device = null;

	if(!this.ip)
		throw new Error('Your must provide IP address of the robot vacuum.');

	if(!this.token)
		throw new Error('Your must provide token of the robot vacuum.');

	// Vacuum cleaner is not available in Homekit yet, use as Switch
	this.service = new Service.Fan(this.name);

	this.serviceInfo = new Service.AccessoryInformation();

	this.serviceInfo
		.setCharacteristic(Characteristic.Manufacturer, 'Xiaomi')
		.setCharacteristic(Characteristic.Model, 'Robot Vacuum Cleaner')
		.setCharacteristic(Characteristic.SerialNumber, '526B-0080-4E2D456BF705');

	this.service
		.getCharacteristic(Characteristic.On)
		.on('get', this.getOn.bind(this))
		.on('set', this.setOn.bind(this));

	this.service
		.getCharacteristic(Characteristic.RotationSpeed)
		.on('get', this.getRotationSpeed.bind(this))
		.on('set', this.setRotationSpeed.bind(this));

	this.service
		.addCharacteristic(Characteristic.BatteryLevel)
		.on('get', this.getBatteryLevel.bind(this));

	this.discover();
}

MiRobotVacuum.prototype = {
	discover: function(){
		var accessory = this;
		var log = this.log;

		log.debug('Discovering Mi Robot Vacuum at "%s"', this.ip);

		this.device = miio.createDevice({
			address: this.ip,
			token: this.token,
			model: 'rockrobo.vacuum.v1'
		});

		this.device.init()
			.then(function(){
				log.debug('Battery Level: ' + accessory.device.battery);
				log.debug('State: ' + accessory.device.state);
				log.debug('Fan Power: ' + accessory.device.fanPower);
			})
			.catch(function(err){
				log.debug(err);
				throw new Error('No able to initialize robot vacuum.');
			});
	},

	getOn: function(callback) {
		if(!this.device.state){
			callback(null, false);
			return;
		}

		this.log.debug('State: ' + this.device.state);

		switch(this.device.state){
			case 'cleaning':
			case 'returning':
			case 'paused':
			case 'spot-cleaning':
				callback(null, true);
				break;

			default:
				callback(null, false);
		}
	},

	setOn: function(powerOn, callback) {
		if(!this.device){
			callback(new Error('No robot vacuum is discovered.'));
			return;
		}

		(powerOn) ? this.device.start() : this.device.charge();

		callback();
	},

	getRotationSpeed: function(callback){
		if(!this.device.fanPower){
			callback(null, 0);
			return;
		}

		callback(null, this.device.fanPower);
	},

	setRotationSpeed: function(speed, callback){
		if(!this.device){
			callback();
			return;
		}
		this.device.setFanPower(speed);
		callback(null, this.device.fanSpeed);
	},

	getBatteryLevel: function(callback) {
		if(!this.device.battery){
			callback(null, 0);
			return;
		}
		callback(null, this.device.battery);
	},

	identify: function(callback) {
		callback();
	},

	getServices: function() {
		return [this.serviceInfo, this.service];
	}
};
