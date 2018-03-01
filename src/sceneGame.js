tps.scenes.game = function(game) {
	this.ROWS = 5;
	this.SPINNER_PERIOD = 0.5;

	this.game = game;
	this.updates = [];

	// Initialization ---------------------------------------------------------
	this.board = new Board(this.ROWS, this.game, game.canvas.getContext('2d'), 0, 0);
	this.initUi(this.board.width, this.board.height);

	// Test -------------------------------------------------------------------
	this.board.solve(this.removeSpinner.bind(this));
	this.addSpinner();
};

// Interface //////////////////////////////////////////////////////////////
tps.scenes.game.prototype.start = function() {
	this.game.input.onTap.add(this.onTap, this);
};

tps.scenes.game.prototype.end = function() {
	this.game.input.onTap.remove(this.onTap, this);

};

tps.scenes.game.prototype.update = function() {
	this.board.update();

	for (var i=0; i<this.updates.length; ++i) {
		this.updates[i]();
	}
};

tps.scenes.game.prototype.render = function(gfx) {
	if (this.board) {
		this.board.draw(gfx);
	}
};

tps.scenes.game.prototype.onTap = function(ptr, doubleTap) {
	this.board.stepBestPlayback();
};

// Implementation /////////////////////////////////////////////////////////

// User Interface ---------------------------------------------------------
tps.scenes.game.prototype.initUi = function(boardWidth, boardHeight) {
	this.uiSpinner = this.game.add.sprite(0, 0, "spinner");

	this.uiSpinner.anchor.set(0.5, 0.5);
	this.uiSpinner.x = this.game.canvas.width / 2 - boardWidth / 2;
	this.uiSpinner.y = this.game.canvas.height / 2 - boardHeight / 2;
	this.spinnerUpdate = this.updateSpinner.bind(this);
	this.uiSpinner.visible = false;
};

tps.scenes.game.prototype.updateSpinner = function() {
	if (this.uiSpinner) {
		this.uiSpinner.rotation += this.game.time.elapsedMS * 2.0 * Math.PI / (this.SPINNER_PERIOD * 1000.0);
	}
};

tps.scenes.game.prototype.addSpinner = function() {
	this.updates.push(this.spinnerUpdate);
	this.uiSpinner.visible = true;
};

tps.scenes.game.prototype.removeSpinner = function() {
	tps.utils.removeElementFromArray(this.spinnerUpdate, this.updates, true);
	this.uiSpinner.visible = false;
};
