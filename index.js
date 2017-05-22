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

	// Vacuum cleaner is not available in Homekit yet, register a Fan
	this.fanService = new Service.Fan(this.name);
	this.batteryService = new Service.BatteryService(this.name + ' Battery');

	this.serviceInfo = new Service.AccessoryInformation();

	this.serviceInfo
		.setCharacteristic(Characteristic.Manufacturer, 'Xiaomi')
		.setCharacteristic(Characteristic.Model, 'Robot Vacuum Cleaner')
		.setCharacteristic(Characteristic.SerialNumber, '526B-0080-4E2D456BF705');

	this.fanService
		.getCharacteristic(Characteristic.On)
		.on('get', this.getPowerState.bind(this))
		.on('set', this.setPowerState.bind(this));

	this.fanService
		.getCharacteristic(Characteristic.RotationSpeed)
		.on('get', this.getRotationSpeed.bind(this))
		.on('set', this.setRotationSpeed.bind(this));

	this.batteryService
		.getCharacteristic(Characteristic.BatteryLevel)
		.on('get', this.getBatteryLevel.bind(this));

	this.batteryService
		.getCharacteristic(Characteristic.ChargingState)
		.on('get', this.getChargingState.bind(this));

	this.batteryService
		.getCharacteristic(Characteristic.StatusLowBattery)
		.on('get', this.getStatusLowBattery.bind(this));

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
				throw new Error('Not able to initialize robot vacuum.');
			});
	},

	getPowerState: function(callback) {
		if(!this.device){
			callback(new Error('No robot is discovered.'));
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

	setPowerState: function(state, callback) {
		if(!this.device){
			callback(new Error('No robot is discovered.'));
			return;
		}

		if(state)
			this.device.start();

		else{
			this.device.pause();
			this.device.charge();
		}

		callback();
	},

	getRotationSpeed: function(callback){
		if(!this.device){
			callback(new Error('No robot is discovered.'));
			return;
		}

		callback(null, this.device.fanPower);
	},

	setRotationSpeed: function(speed, callback){
		if(!this.device){
			callback(new Error('No robot is discovered.'));
			return;
		}

		var speeds = [
			0,	// Idle
			38,	// Quiet
			60,	// Balanced
			77,	// Turbo
			90	// Max Speed
		];

		for(var item in speeds){
			if(speed <= item){
				speed = item;
				break;
			}
		}
		
		this.device.setFanPower(speed);
		callback(null, speed);
	},

	getBatteryLevel: function(callback) {
		if(!this.device){
			callback(new Error('No robot is discovered.'));
			return;
		}

		callback(null, this.device.battery);
	},

	getStatusLowBattery: function(callback) {
		if(!this.device){
			callback(new Error('No robot is discovered.'));
			return;
		}

		callback(null, (this.device.battery < 30) ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
	},

	getChargingState: function(callback) {
		if(!this.device){
			callback(new Error('No robot is discovered.'));
			return;
		}

		switch(this.device.state){
			case 'charging':
				callback(null, Characteristic.ChargingState.CHARGING);
			break;

			case 'charger-offline':
				callback(null, Characteristic.ChargingState.NOT_CHARGEABLE);
			break;

			default:
				callback(null, Characteristic.ChargingState.NOT_CHARGING);
		}
	},

	identify: function(callback) {
		callback();
	},

	getServices: function() {
		return [this.serviceInfo, this.fanService, this.batteryService];
	}
};
