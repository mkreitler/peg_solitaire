/**
 *	Automates the process of manage pools of objects to cut down on garbage collection hitches.
 *  Note that this module assumes pooled objects will have an 'reset' function which clears their
 *  state upon being recycled. 
 */
tps.ObjectPool = function() {
	this.poolInfo = {};
};

tps.ObjectPool.prototype.register = function(typeName, fnConstructor, optStartCount) {
	var originalTypeName = typeName;

	typeName = this.validateTypeName(typeName, "ObjectPool.Register");
	tps.utils.assert(!this.poolInfo.hasOwnProperty(typeName), "(ObjectPool.Register) Multiple registration of type " + originalTypeName);

	var objInfo = {ctor: fnConstructor, used: [], available: []};

	optStartCount = optStartCount ? optStartCount : 0;
	for (var i=0; i<optStartCount; ++i) {
		objInfo.available.push(new objInfo.ctor());
	}

	typeName = typeName.toLowerCase();
	this.poolInfo[typeName] = objInfo;
};

tps.ObjectPool.prototype.request = function(typeName) {
	typeName = this.validateTypeName(typeName, "ObjectPool.request");

	var poolObj = null;
	var objInfo = this.poolInfo[typeName];

	tps.utils.assert(objInfo, "(ObjectPool.request) Unknown type!");

	if (objInfo) {
		if (objInfo.available.length === 0) {
			poolObj = new objInfo.ctor();
		}
		else {
			poolObj = objInfo.available[0];
			objInfo.available.shift();
		}

		if (poolObj) {
			objInfo.used.push(poolObj);
		}
	}

	if (poolObj && poolObj.reset && typeof(poolObj.reset) === "function") {
		poolObj.reset();
	}

	return poolObj;
};

tps.ObjectPool.prototype.release = function(typeName, poolObj) {
	if (poolObj) {
		var objArray = [];

		typeName = this.validateTypeName(typeName, "ObjectPool.release");

		var objInfo = this.poolInfo[typeName];
		tps.utils.assert(objInfo, "(ObjectPool.release) unknown type!");

		// Often, pool objects will be contained in arrays. If we
		// receive a single instance, we'll wrap it in an array to
		// facilitate easy handling of both array- and single-instance-
		// "release" calls.
		var objIsArray = poolObj instanceof Array;
		if (!objIsArray) {
			objArray.push(poolObj);
			poolObj = objArray;
		}

		for (var i=0; i<poolObj.length; ++i) {
			// This call to removeElementFromArray assumes that the order
			// of pool objects in the 'used' array doesn't matter.
			tps.utils.removeElementFromArray(poolObj[i], objInfo.used);
			objInfo.available.push(poolObj[i]);
		}
	}
};

tps.ObjectPool.prototype.releaseAll = function(typeName) {
	typeName = this.validateTypeName(typeName, "ObjectPool.releaseAll");

	var objInfo = this.poolInfo[typeName];
	tps.utils.assert(objInfo, "(ObjectPool.releaseAll) unknown type!");

	while (objInfo.used.length > 0) {
		var poolObj = objInfo.used[0];
		objInfo.available.push(poolObj);
		objInfo.used.shift();
	}
};

tps.ObjectPool.prototype.validateTypeName = function(typeName, caller) {
	tps.utils.assert(typeName && typeName.length > 0, "(" + caller + ") Invalid type name!");
	return typeName.toLowerCase();
};

// Create a global instance to manage object pools for the game.
tps.objectPool = new tps.ObjectPool();