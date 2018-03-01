tps.scenes.game = function(game) {
	this.ROWS = 5;
	this.SPINNER_PERIOD = 0.5;

	this.game = game;
	this.updates = [];
	this.stateMachine = new tps.stateMachine(this);

	tps.utils.assert(this.stateMachine, "(game constructor) Invalid state machine!");

	// Updaters ---------------------------------------------------------------
	this.fnSpinnerUpdate = this.updateSpinner.bind(this);

	// Initialization ---------------------------------------------------------
	this.board = new Board(this.ROWS, this.game, game.canvas.getContext('2d'), 0, 0);
	this.initUi(this.board.width, this.board.height);

	this.board.acceptInput(true);
};

// States /////////////////////////////////////////////////////////////////////
tps.scenes.game.prototype.stateWaitForPlayerMove = {
	enter: function() {
		this.onSolve();
		this.board.bringSlotsToFront();
	},

	update: function() {
		// var selectedPiece = this.checkPlayerInput();
		// if (selectedPiece && this.board.canSelectedPieceJump(selectedPiece)) {
		// 	this.stateMachine.transitionTo(this.stateWaitForPlayerFinishMove);
		// }
		this.board.update();
	},

	exit: function() {
		this.board.bringPegsToFront();
		this.board.startBestPlayback();
	}
};

tps.scenes.game.prototype.stateWaitForPlayerFinishMove = {
	enter: function() {

	},

	update: function() {
		var selectedPiece = this.checkPlayerInput();
		if (selectedPiece) {
			this.board.stepBestPlayback();
		}

//		this.board.pulseSelectedNode();
	},

	exit: function() {

	},
};

// Interface //////////////////////////////////////////////////////////////////
// Scene Interface ------------------------------------------------------------
tps.scenes.game.prototype.start = function() {
	this.newGame();
};

tps.scenes.game.prototype.end = function() {
};

tps.scenes.game.prototype.update = function() {
	for (var i=0; i<this.updates.length; ++i) {
		this.updates[i]();
	}

	this.stateMachine.update();
};

tps.scenes.game.prototype.render = function(gfx) {
	if (this.board) {
		this.board.draw(gfx);
	}
};

// Game Interface -------------------------------------------------------------
tps.scenes.game.prototype.newGame = function() {
	this.board.reset();
	this.stateMachine.transitionTo(this.stateWaitForPlayerMove);
};

tps.scenes.game.prototype.onShowSolution = function(ptr, doubleTap) {
	// TODO: if the user requests the solution, call this.board.startBestPlayback().
	// Add an updater to call this.board.stepBestPlayback().
	// this.startBestPlayback();
	// this.board.stepBestPlayback();
};

tps.scenes.game.prototype.onSolve = function() {
	this.board.solve(this.removeSpinner.bind(this));
	this.addSpinner();
};

// Implementation /////////////////////////////////////////////////////////////
// User Input -----------------------------------------------------------------
tps.scenes.game.prototype.checkPlayerInput = function() {
	return this.board.checkForPress();
};

// User Interface -------------------------------------------------------------
tps.scenes.game.prototype.initUi = function(boardWidth, boardHeight) {
	this.uiSpinner = this.game.add.sprite(0, 0, "spinner");

	this.uiSpinner.anchor.set(0.5, 0.5);
	this.uiSpinner.x = this.game.canvas.width / 2 - boardWidth / 2;
	this.uiSpinner.y = this.game.canvas.height / 2 - boardHeight / 2;
	this.uiSpinner.visible = false;
};

tps.scenes.game.prototype.updateSpinner = function() {
	if (this.uiSpinner) {
		this.uiSpinner.rotation += this.game.time.elapsedMS * 2.0 * Math.PI / (this.SPINNER_PERIOD * 1000.0);
	}
};

tps.scenes.game.prototype.addSpinner = function() {
	this.updates.push(this.fnSpinnerUpdate);
	this.uiSpinner.visible = true;
};

tps.scenes.game.prototype.removeSpinner = function() {
	tps.utils.removeElementFromArray(this.fnSpinnerUpdate, this.updates, true);
	this.uiSpinner.visible = false;

	this.stateMachine.transitionTo(this.stateWaitForPlayerFinishMove);
};
