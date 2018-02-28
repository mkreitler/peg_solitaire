tps.scenes.game = function(game) {
	this.ROWS = 5;
	this.game = game;

	// Initialization ---------------------------------------------------------
	this.board = new Board(this.ROWS, this.game, game.canvas.getContext('2d'));

	// Interface //////////////////////////////////////////////////////////////
	this.start = function() {
	};

	this.end = function() {

	};

	this.update = function() {

	};

	this.render = function(gfx) {
		if (this.board) {
			this.board.draw(gfx);
		}
	};

	// Implementation /////////////////////////////////////////////////////////
};
