/**
 *	Particle that appears when a peg is jumped.
 */

tps.PegParticle = function() {
	this.game		= null;
	this.lifetime 	= 0.0;
	this.maxScale 	= 0.0;
	this.emitDelay	= 0.0;
	this.sprites 	= [];
	this.initialized= false;
};

tps.PegParticle.DEFAULT_MIN_SCALE 	= 0.25; // unitless
tps.PegParticle.DEFAULT_LIFETIME 	= 1.0;	// seconds
tps.PegParticle.DEFAULT_MAX_SCALE	= 3.0;	// unitless
tps.PegParticle.DEFAULT_EMIT_DELAY	= 0.1;	// seconds

tps.PegParticle.prototype.init = function(game, lifetime, minScale, maxScale, emitDelay, sprites) {
	this.game			= game;
	this.lifetime 		= lifetime ? lifetime : tps.PegParticle.DEFAULT_LIFETIME;
	this.minScale 		= minScale ? minScale : tps.PegParticle.DEFAULT_MIN_SCALE;
	this.maxScale 		= maxScale ? maxScale : tps.PegParticle.DEFAULT_MAX_SCALE;
	this.emitDelay		= emitDelay ? emitDelay : tps.PegParticle.DEFAULT_EMIT_DELAY;

	tps.utils.assert(this.game, "(pegParticle constructor) Invalid game object!");
	tps.utils.assert(this.lifetime > 0, "(pegParticle constructor) Invalid lifetime!");
	tps.utils.assert(this.maxScale > 1.0, "(pegParticle constructor) Invalid max scale!");
	tps.utils.assert(this.emitDelay > 0, "(pegParticle constructor) Invalid emitDelay!");

	this.updateState = null;

	for (var i=0; i<sprites.length; ++i) {
		tps.utils.assert(sprites[i], "(pegParticle constructor) Invalid sprite object!");

		this.sprites.push(sprites[i]);
		this.sprites[i].anchor.set(0.5, 0.5);
		this.sprites[i].visible = false;
		this.sprites[i].scale.set(tps.PegParticle.DEFAULT_MIN_SCALE, tps.PegParticle.DEFAULT_MIN_SCALE);
		this.sprites[i].data = i * this.emitDelay;
	}

	this.timer = 0.0;

	this.initialized = true;
};

tps.PegParticle.prototype.update = function() {
	if (this.updateState) {
		this.updateState();
	}
};

tps.PegParticle.prototype.playing = function() {
	var oldTimer = this.timer;
	var numExpired = 0;

	this.timer +=  this.game.time.elapsedMS * 0.001;

	for (var i=0; i<this.sprites.length; ++i) {
		if (oldTimer <= this.sprites[i].data && this.timer >= this.sprites[i].data) {
			this.sprites[i].visible = true;
		}

		if (this.sprites[i].visible) {
			var param = this.timer - this.sprites[i].data;
			param /= this.lifetime;

			if (param >= 1.0) {
				numExpired += 1;
			}

			param = Math.min(param, 1.0);

			var scale = tps.PegParticle.DEFAULT_MIN_SCALE + (this.maxScale - tps.PegParticle.DEFAULT_MIN_SCALE) * param;
			this.sprites[i].scale.set(scale, scale);

			var alpha = 1.0 + -param;
			this.sprites[i].alpha = Math.max(0.0, alpha);
		}
	}

	if (numExpired === this.sprites.length) {
		this.stop();
	}
};

tps.PegParticle.prototype.play = function(x, y) {
	tps.utils.assert(!this.updateState, "(pegParticle.play) 'play()' called while playing!");
	tps.utils.assert(this.initialized, "(pegParticle.play) Not initialized!");

	this.reset();

	for (var i=0; i<this.sprites.length; ++i) {
		this.sprites[i].position.set(x, y);
	}

	this.updateState = this.playing;

	tps.switchboard.broadcast("pegParticleStart", this);
};

tps.PegParticle.prototype.stop = function() {
	tps.switchboard.broadcast("pegParticleStop", this);
	this.updateState = null;

	for (var i=0; i<this.sprites.length; ++i) {
		this.sprites[i].visible = false;
	}
};

tps.PegParticle.prototype.reset = function() {
	this.timer = 0;

	for (var i=0; i<this.sprites.length; ++i) {
		this.sprites[i].scale.set(1.0, 1.0);
		this.sprites[i].position.set(0, 0);
		this.sprites[i].alpha = 1.0;
		this.sprites[i].visible = false;
		this.sprites[i].bringToTop();
	}
};
