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

tps.ObjectPool.prototype.count = function(typeName) {
	typeName = this.validateTypeName(typeName, "ObjectPool.count");

	var objInfo = this.poolInfo[typeName];

	return objInfo ? objInfo.available.length : 0;
};

tps.ObjectPool.prototype.callOnUsed = function(typeName, fnName) {
	typeName = this.validateTypeName(typeName, "applyToUsed");

	var objInfo = this.poolInfo[typeName];
	if (objInfo != null) {
		for (var i=0; i<objInfo.used.length; ++i) {
			var fn = objInfo.used[i][fnName];

			tps.utils.assert(fn && typeof(fn) === "function", "(applyToUsed) Invalid function!");
			fn.bind(objInfo.used[i])();
		}
	}
};

tps.ObjectPool.prototype.request = function(typeName) {
	typeName = this.validateTypeName(typeName, "ObjectPool.request");

	var poolObj = null;
	var pool = this.poolInfo[typeName];

	tps.utils.assert(pool, "(ObjectPool.request) Unknown type!");

	if (pool) {
		if (pool.available.length === 0) {
			poolObj = new pool.ctor();
		}
		else {
			poolObj = pool.available[0];
			pool.available.shift();
		}

		if (poolObj) {
			tps.utils.assert(pool.used.indexOf(poolObj) === -1, "(ObjectPool.request) duplicate element in 'available' array!");
			pool.used.push(poolObj);
		}
	}

	if (poolObj && poolObj.reset && typeof(poolObj.reset) === "function") {
		poolObj.reset();
	}

	return poolObj;
};

tps.ObjectPool.prototype.release = function(typeName, poolObj, releaseNumber) {
	if (poolObj) {
		var objArray = [];

		typeName = this.validateTypeName(typeName, "ObjectPool.release");

		var pool = this.poolInfo[typeName];
		tps.utils.assert(pool, "(ObjectPool.release) unknown type " + typeName + "!");

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
			tps.utils.removeElementFromArray(poolObj[i], pool.used);

			tps.utils.assert(pool.available.indexOf(poolObj[i]) === -1, "(ObjectPool.release) duplicate element in 'available' array!");
			poolObj[i].lastRelease = releaseNumber;
			pool.available.push(poolObj[i]);
		}
	}
};

tps.ObjectPool.prototype.releaseAll = function(typeName, releaseNumber) {
	typeName = this.validateTypeName(typeName, "ObjectPool.releaseAll");

	var pool = this.poolInfo[typeName];
	tps.utils.assert(pool, "(ObjectPool.releaseAll) unknown type!");

	while (pool.used.length > 0) {
		var poolObj = pool.used[0];

		tps.utils.assert(pool.available.indexOf(poolObj) === -1, "(ObjectPool.releaseAll) duplicate element in 'available' array!");
		poolObj.lastRelease = releaseNumber;
		pool.available.push(poolObj);
		pool.used.shift();
	}
};

tps.ObjectPool.prototype.validateTypeName = function(typeName, caller) {
	tps.utils.assert(typeName && typeName.length > 0, "(" + caller + ") Invalid type name!");
	return typeName.toLowerCase();
};

// Create a global instance to manage object pools for the game.
tps.objectPool = new tps.ObjectPool();