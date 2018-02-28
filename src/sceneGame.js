tps.scenes.game = function(game) {
	this.ROWS = 5;
	this.game = game;

	// Initialization ---------------------------------------------------------
	this.board = new Board(this.ROWS, this.game, game.canvas.getContext('2d'), 0, 0);

	// Interface //////////////////////////////////////////////////////////////
	this.start = function() {
		this.game.input.onTap.add(this.onTap, this);
	};

	this.end = function() {
		this.game.input.onTap.remove(this.onTap, this);

	};

	this.update = function() {

	};

	this.render = function(gfx) {
		if (this.board) {
			this.board.draw(gfx);
		}
	};

	this.onTap = function(ptr, doubleTap) {
		this.board.stepBestPlayback();
	};

	// Implementation /////////////////////////////////////////////////////////
};
