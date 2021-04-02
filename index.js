var Service;
var Characteristic;
var gpio = require('rpi-gpio');

gpio.setMode(gpio.MODE_BCM);

var accessories = {};

gpio.on('change', function(channel, value) {
    if (!value && channel in accessories)
        accessories[channel].triggered();
});

var duration = 3;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-dakota-alert", "dakota-alert", DakotaAlertAccessory);
};

function now() {
    return Math.floor(Date.now() / 1000);
}

function DakotaAlertAccessory(log, config) {
    this.log = log;
    this.pin = parseInt(config["pin"]);
    this.name = config["name"];
    this.lastRing = now();
    this.timeout = null;

	accessories[this.pin] = this;
	gpio.setup(this.pin, gpio.DIR_IN, gpio.EDGE_FALLING);
}

DakotaAlertAccessory.prototype.getServices = function () {
    var infoService = new Service.AccessoryInformation();
    infoService
        .setCharacteristic(Characteristic.Manufacturer, "Dakota Alert")
        .setCharacteristic(Characteristic.Model, "DCR-2500");

    this.service = new Service.MotionSensor(this.name);
    this.service
        .getCharacteristic(Characteristic.MotionDetected)
        .on('get', this.getState.bind(this));

    return [infoService, this.service];
}

DakotaAlertAccessory.prototype.getState = function(callback) {
    callback(null, this.active());
}

DakotaAlertAccessory.prototype.active = function() {
	return this.lastRing > now() - duration;
}

DakotaAlertAccessory.prototype.triggered = function() {
    this.lastRing = now();
    this.service.getCharacteristic(Characteristic.MotionDetected).updateValue(this.active());
    if (this.timeout) {
        clearTimeout(this.timeout);
    }
    var self = this;
    this.timeout = setTimeout(function() {
        self.service.getCharacteristic(Characteristic.MotionDetected).updateValue(self.active());
        self.timeout = null;
    }, (duration + 1) * 1000);
}
