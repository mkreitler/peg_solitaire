tps.utils = {
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

	assert: function(test, msg) {
		var textWidth = 0;

		if (!test) {
			console.log("ASSERT FAILED: " + msg);
			// debugger;
		}
	},
};


