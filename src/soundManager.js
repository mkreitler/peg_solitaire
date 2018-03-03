/**
 *	Rudimentary sound & music player.
 */

tps.soundManager = function(game) {
	this.game = game;

	// Music	
	this.allowMusic = true;
	this.music = null;
	this.musicWasPlaying = false;

	// SFX
	this.allowSfx = true;
	this.sounds = {};

	// Audio events
	tps.switchboard.listenFor("muteMusic", this);
	tps.switchboard.listenFor("unmuteMusic", this);
	tps.switchboard.listenFor("muteSound", this);
	tps.switchboard.listenFor("unmuteSound", this);
	tps.switchboard.listenFor("startMusic", this);
	tps.switchboard.listenFor("playSound", this);
};

tps.soundManager.prototype.startMusic = function(singlePlay) {
	if (this.allowMusic && this.music) {

		if (singlePlay) {
			this.music.play();
		}
		else {
			this.music.loopFull();
		}
	}
}

tps.soundManager.prototype.addSound = function(className, soundName) {
	tps.utils.assert(className && className.length > 0, "(addSound) Invalid sound class!");
	tps.utils.assert(soundName && soundName.length > 0, "(addSound) Invalid sound resource!");

	var soundList = this.sounds[className];

	if (!soundList) {
		soundList = [];
	}

	soundList.push(this.game.add.audio(soundName));
	this.sounds[className] = soundList;
};

tps.soundManager.prototype.playSound = function(className) {
	if (this.allowSfx) {
		var soundList = this.sounds[className];
		tps.utils.assert(soundList, "(playSound) Invalid sound class!");

		var index = Math.floor(Math.random() * soundList.length);
		soundList[index].play();
	}
};

tps.soundManager.prototype.setMusic = function(musicName, autoStart) {
	if (this.music) {
		this.music.stop();
	}

	this.music = this.game.add.audio(musicName);
	tps.utils.assert(this.music, "(setMusic) Invalid music resource!");

	if (autoStart) {
		this.startMusic();
	}
};

tps.soundManager.prototype.muteMusic = function() {
	this.allowMusic = false;

	if (this.music) {
		this.musicWasPlaying = this.music.isPlaying;
		this.music.pause();
	}
};

tps.soundManager.prototype.unmuteMusic = function() {
	this.allowMusic = true;

	if (this.music && this.musicWasPlaying) {
		this.music.resume();
	}
};

tps.soundManager.prototype.muteSound = function() {
	this.allowSfx = false;

	for (var i=0; i<this.sounds.length; ++i) {
		this.sounds[i].stop();
	}
};

tps.soundManager.prototype.unmuteSound = function() {
	this.allowSfx = true;
};


