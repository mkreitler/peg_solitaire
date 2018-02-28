/**
 *		This switchboard provides a runtime messaging system that allows objects
 *		to communicate with each other without knowing the specifics of each
 *		others' implementation.
 */

tps.switchboard = {
	switchboard: {},
	addArray: [],		// store listeners to be added here
	removeArray: [], 	// store listeners to be removed here.


	// Interface //////////////////////////////////////////////////////////////
	listenFor: function(message, listener) {
		tps.utils.assert(message && listener, "(listenFor) invalid message or listener");
		this.addArray.push({message: message, listener: listener});
	},

	unlistenFor: function(message, listener) {
		tps.utils.assert(message && listener, "(listenFor) invalid message or listener");
		this.removeArray.push({message: message, listener: listener});
	},

	unlistenForAll: function(listener) {
		tps.utils.assert(listener, "(unlistenForAll) invalid listener");
		this.removeArray.push({message: null, listener: listener});
	},

	broadcast: function(message, data) {
		tps.utils.assert(message, "(broadcast) invalid message");

		var listeners = null;
		var listener = null;
		var i = 0;

		listeners = this.switchboard[message];

		for (i=0; listeners && i<listeners.length; ++i) {
			listener = listeners[i];
			tps.utils.assert(listener && listener.hasOwnProperty(message), "(broadcast) invalid listener or missing handler");
			listener[message](data);			
		}
	},

	// Implementation /////////////////////////////////////////////////////////
	update: function() {
		this.removeListeners();
		this.addListeners();
	},

	addListeners: function() {
		var listeners = null;
		var i = 0;

		for (i=0; i<this.addArray.length; ++i) {
			var message = this.addArray[i].message;
			var listener = this.addArray[i].listener;

			listeners = this.switchboard[message];

			if (!listeners) {
				listeners = [];
			}

			if (listeners.indexOf(listener) < 0) {
				listeners.push(listener);
				this.switchboard[message] = listeners;
			}
		}

		// Clear the array.
		this.addArray.length = 0;
	},

	removeListeners: function() {
		var i = 0;

		for (i=0; i<this.removeArray.length; ++i) {	
			var message = this.removeArray[i].message;
			var listener = this.removeArray[i].listener;
			var key = null;

			if (message) {
				this.removeListenerWithMessage(message, listener);
			}
			else {
				for (key in this.switchboard) {
					this.removeListenerWithMessage(key, listener);
				}
			}
		}

		this.removeArray.length = 0;
	},

	removeListenersWithMessage: function(message, listener) {
		var listeners = null;
		listeners = this.switchboard[message];

		if (listeners) {
			tps.utils.removeElementFromArray(listener, listeners);
		}
	},
};


