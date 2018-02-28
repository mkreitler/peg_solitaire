tps.utils = {
	// Arrays -----------------------------------------------------------------
	removeElementFromArray: function(element, array, bAllowReordering) {
		this.assert(array, "(removeElementFromArray) invalid array");

		var index = array.indexOf(element);
		var i = 0;

		if (index >= 0) {
			if (bAllowReordering) {
				array[index] = array[array.length - 1];
				array.length -= 1;
			}
			else {
				array.splice(index, 1);
			}
		}
	},

	// Asserts ----------------------------------------------------------------
	assert: function(test, msg) {
		var textWidth = 0;

		if (!test) {
			console.log("ASSERT FAILED: " + msg);
			// debugger;
		}
	},
};

// Stack //////////////////////////////////////////////////////////////////////
tps.utils.Stack = function() {
	this.elements = [];
	this.updateTop();
};

tps.utils.Stack.prototype.push = function(el) {
	this.elements.push(el);
	this.updateTop();
};

tps.utils.Stack.prototype.peek = function() {
	return this.top >= 0 ? this.elements[this.top] : null;
};

tps.utils.Stack.prototype.peekBottom = function() {
	return this.top >= 0 ? this.elements[0] : null;
};

tps.utils.Stack.prototype.pop = function() {
	var element = null;

	if (this.elements.length > 0) {
		element = this.elements[this.elements.length - 1];
		this.elements.pop();
		this.updateTop();
	}

	return element;
};

tps.utils.Stack.prototype.shift = function() {
	this.elements.shift();
	this.updateTop();
	return this.top >= 0;
};

tps.utils.Stack.prototype.size = function() {
	return this.elements.length;
};

tps.utils.Stack.prototype.clear = function() {
	this.elements.length = 0;
	this.top = -1;
};

tps.utils.Stack.prototype.copy = function(other) {
	this.clear();

	for (var i=other.size() - 1; i>=0; --i) {
		this.elements.push(other.elementAt(i));
	}

	this.updateTop();
};

tps.utils.Stack.prototype.remove = function(numToRemove) {
	for (var i=0; i<numToRemove; ++i) {
		this.elements.pop();
	}

	this.updateTop();
};

tps.utils.Stack.prototype.elementAt = function(index) {
	return index >= 0 && index < this.elements.length ? this.elements[index] : null;
};

tps.utils.Stack.prototype.updateTop = function() {
	this.top = this.elements.length - 1;
};


