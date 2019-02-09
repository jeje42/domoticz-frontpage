// Code to handle domoticz boxes
Domotica.domoticz = {
	// Variable to store the interval
	interval: null,

	// Main method for updating the status of all boxes
	// that are associated with dommoticz
	update: function() {
		var that = Domotica.domoticz;

		// If the system is waiting to update again, cancel the
		// interval. We will restart the interval again at the end
		// of the meeting
		if( that.interval ) {
			clearInterval(that.interval);
		}

		// Handle updates
		that.call("devices", { plan: Domotica.settings.domoticz.plan }, function(data) {
			// For now, only handle 'results' part
			$.each(data.result, function(idx, result) {
				var id = result.idx;

				// Lookup the element for this id
				element = $("[data-domoticz-id=" + id + "]");

				// If the element is not present, this device id not to be shown
				if( element.length == 0 )
					return;

				if(element.hasClass("dimmer-switch")) {
					that.updateWidget.dimmerSwitch(element, result);
				} else if(element.hasClass("switch")) {
					that.updateWidget.normalSwitch(element, result);
				} else if(element.hasClass("heater")) {
					that.updateWidget.heater(element, result);
				} else if(element.hasClass("temperature")) {
					that.updateWidget.temperature(element, result);
				} else {
					that.updateWidget.generic(element, result);
				}
			});
		});

		// TODO: Update 'last updated' date

		// Make sure to start updating again
		that.interval = setInterval(that.update, Domotica.settings.domoticz.updateFrequency);
	},

	change: {
		normalSwitch: function(id, status) {
			console.log( "Update switch " + id + " to " + status );
			Domotica.domoticz.call( "command", { param: "switchlight", idx: id, switchcmd: status ? "On" : "Off" }, Domotica.domoticz.update );
		},
		dimmerSwitch: function(id, value) {
			console.log( "Update dimmer switch " + id + " to " + value );
			Domotica.domoticz.call( "command", { param: "switchlight", idx: id, switchcmd: "Set Level", level: value }, Domotica.domoticz.update );
		},
		heater: function(id, value) {
			console.log( "Update heater " + id + " to " + value );
			Domotica.domoticz.call( "command", { param: "udevice", idx: id, nvalue: 0, svalue: value }, Domotica.domoticz.update );
		},
		sunscreen: function(id, status) {
			console.log( "Update sunscreen " + id + " to " + status );

			var cmd = "";
			switch( status ) {
				case "up":
					cmd = "Off";
					break;
				case "down":
					cmd = "On";
					break;
				case "stop":
					cmd = "Stop";
					break;
				default:
					return;
			}

			Domotica.domoticz.call( "command", { param: "switchlight", idx: id, level: 0, switchcmd: cmd }, Domotica.domoticz.update );
		},
		scene: function(id, status) {
			console.log( "Setting scene " + id + " to " + status );
			Domotica.domoticz.call( "command", { param: "switchscene", idx: id, switchcmd: status }, Domotica.domoticz.update );
		}
	},

	// Methods to update widgets on the screen, based on
	// data from domoticz
	updateWidget: {
		dimmerSwitch: function(element, result) {
			// Update the slider to show the dimmer value
			Domotica.ui.setSliderValue(element, result.Level);

			// Also do updating for normal switches
			this.normalSwitch(element, result);
		},
		normalSwitch: function(element, result) {
			// Update the status text
			var status = Domotica.domoticz.translate(result.Status);
			element.find(".domoticz-status" ).text(status);

			// Update the lightbulb
			Domotica.ui.toggleSwitch(element, result.Status == "On" || result.Status.indexOf( "Set Level" ) == 0 );

			// Also do generic updating
			this.generic(element, result);
		},
		heater: function(element, result) {
			var setpoint = parseFloat(result.SetPoint);

			// Update the slider to show the dimmer value
			Domotica.ui.setSliderValue(element, setpoint);

			// Store current setpoint to enable buttons
			element.find( ".btn-group" ).data( "setpoint", setpoint );

			// Update the temperature itself
			element.find(".info-box-number" ).html(setpoint + " &deg;C");

			// Update color to indicate the temperature.
			if( Domotica.settings.domoticz.heaterColors ) {
				var colorSettings = Domotica.settings.domoticz.heaterColors;
				var color;

				if( setpoint <= colorSettings.low.temperature )
					color = colorSettings.low.color;

				if( setpoint >= colorSettings.high.temperature )
					color = colorSettings.high.color;

				// Interpolate colors
				var p = ( setpoint - colorSettings.low.temperature ) / ( colorSettings.high.temperature - colorSettings.low.temperature );
				var hue = colorSettings.high.hue * p + colorSettings.low.hue * ( 1 - p );
				element.find( ".info-box-number" ).css( "color", "hsl(" + hue + ", 100%, 50%)" );
			}

			// Also do generic updating
			this.generic(element, result);
		},

		temperature: function(element, result) {
			var temperature = result.Temp;

			// Update the temperature itself
			element.find(".temperature" ).html(temperature);

			// Also do generic updating
			this.generic(element, result);
		},

		// Generic update method
		generic: function(element, result) {
			var textElement = element.find( ".lastUpdate" );
			if( result.LastUpdate ) {
				var lastUpdate = moment(result.LastUpdate);
				var text = lastUpdate.fromNow()
				textElement.text( text );
			} else {
				textElement.text( "" );
			}

			// Hide the loading spinner
			element.find( ".loading" ).remove();
		},
	},

	// Translate values or words from the domoticz response into
	// a format useful for the user
	// TODO : depending on the needs, may need the translate module
	translate: function(value) {
		switch(value) {
			case "On": return "On";
			case "Off": return "Off";
			default: return value;
		}
	},

	// Basic method to send commands to Domoticz
	call: function(type, parameters, callback) {
		if( typeof( parameters) == "undefined" ) {
			parameters = {};
		}

		// Add type to parameters
		parameters.type = type;

		// Actually do the call and call the callback
		$.get( Domotica.settings.domoticz.baseUrl, parameters, function(data, textStatus, jqXHR) {
			if( typeof(callback) != "undefined" ) {
				callback(data);
			}
		});
	}
};
