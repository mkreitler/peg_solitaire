tps.scenes.game = function(game) {
	this.ROWS = 5;
	this.SPINNER_PERIOD = 0.5;

	this.game = game;
	this.updates = [];
	this.buttons = [];
	this.textArea = null;
	this.tooltip = null;
	this.stateMachine = new tps.stateMachine(this);
	this.wantsNewGame = false;
	this.isFirstGame = true;

	tps.utils.assert(this.stateMachine, "(game constructor) Invalid state machine!");

	// Updaters ---------------------------------------------------------------
	this.fnSpinnerUpdate = this.updateSpinner.bind(this);

	// Initialization ---------------------------------------------------------
	tps.switchboard.listenFor("playerWon", this);
	tps.switchboard.listenFor("playerLost", this);
	tps.switchboard.listenFor("setTooltip", this);
	tps.switchboard.listenFor("clearTooltip", this);
	tps.switchboard.listenFor("playReleased", this);
	tps.switchboard.listenFor("hintReleased", this);
	tps.switchboard.listenFor("undoReleased", this);
	tps.switchboard.listenFor("redoReleased", this);
	tps.switchboard.listenFor("musicPressed", this);
	tps.switchboard.listenFor("musicReleased", this);
	tps.switchboard.listenFor("soundPressed", this);
	tps.switchboard.listenFor("soundReleased", this);

	this.board = new Board(this.ROWS, this.game, game.canvas.getContext('2d'), 0, 0);	
	this.initUi(this.board.width, this.board.height);

	this.board.acceptInput(true);
};

tps.scenes.game.BUTTON_BAR_SCALAR			= 1 / 5;
tps.scenes.game.BUTTON_TEXTAREA_SCALAR		= 3 / 10;
tps.scenes.game.CHAR_BUTTON_STARTS_INACTIVE	= "*";
tps.scenes.game.CHAR_BUTTON_IS_TOGGLE		= "!";
tps.scenes.game.BUTTONS 					= ["Play", "Hint*", "Undo*", "Redo*", "Music!", "Sound!"];

// Message Handlers ///////////////////////////////////////////////////////////

tps.scenes.game.prototype.playReleased = function() {
	this.stateMachine.execOnState("play");
};

tps.scenes.game.prototype.hintReleased = function() {

};

tps.scenes.game.prototype.undoReleased = function() {

};

tps.scenes.game.prototype.redoReleased = function() {

};

tps.scenes.game.prototype.musicPressed = function() {
	// TODO: turn off music.
};

tps.scenes.game.prototype.musicReleased = function() {
	// TODO: turn on music.
};

tps.scenes.game.prototype.soundPressed = function() {
	// TODO: turn off sound.
};

tps.scenes.game.prototype.soundReleased = function() {
	// TODO: turn on sound.
};

tps.scenes.game.prototype.moveStarted = function() {
	this.stateMachine.transitionTo(this.stateWaitForPlayerFinishMove);
};

tps.scenes.game.prototype.moveAborted = function() {
	this.stateMachine.transitionTo(this.stateWaitForPlayerMove);
};

tps.scenes.game.prototype.moveCompleted = function() {
	this.stateMachine.transitionTo(this.stateWaitForMoveFX);
};

tps.scenes.game.prototype.playerWon = function() {
	console.log(">>> YOU WIN!!! <<<");
	this.wantsNewGame = true;
};

tps.scenes.game.prototype.playerLost = function() {
	console.log("!!! YOU LOST !!!");
	this.wantsNewGame = true;
};

// States /////////////////////////////////////////////////////////////////////
tps.scenes.game.prototype.stateRestarting = {
	enter: function() {
		this.setMessageUsingKey("msg_begin");
	},

	update: function() {
		this.stateMachine.transitionTo(this.stateWaitForPlayerMove);
	},
},

tps.scenes.game.prototype.stateWaitingForGameStart = {
	locals: {
		timer: 0,
	},

	play: function() {
		this.stateMachine.transitionTo(this.stateWaitForPlayerMove);
		this.setMessageUsingKey("msg_begin");
	},

	enter: function() {
		if (this.isFirstGame) {
			var locals = this.stateMachine.locals();
			tps.utils.assert(locals, "(stateWaitingForGameStart) Invalid locals!");
			locals.timer = 0;
		}
	},

	update: function() {
		if (this.isFirstGame) {
			// TODO: play the hint particle on the "Go!" button.
		}
	},

	exit: function() {
		this.isFirstGame = false;

		// TODO: make sure the hint particle turns off properly.
	}
};

tps.scenes.game.prototype.stateWaitForMoveFX = {
	locals: {
		wantsRestart: false,
	},

	play: function() {
		this.stateMachine.locals().wantsRestart = true;
	},

	enter: function() {
		var locals = this.stateMachine.locals();
		locals.wantsRestart = false;

		this.board.turnOffAllNodes();
	},

	update: function() {
		// TODO: wait for FX to run out.
		if (!this.board.anyParticlesPlaying()) {
			if (this.wantsNewGame) {
				this.newGame();
			}
			else {
				if (this.stateMachine.locals().wantsRestart) {
					this.restart();
				}
				else {
					this.stateMachine.transitionTo(this.stateWaitForPlayerMove);
				}
			}
		}
	},

	exit: function() {
	},
};

tps.scenes.game.prototype.stateWaitForPlayerMove = {
	play: function() {
		this.restart();
	},

	enter: function() {
		this.board.enableLivePegs();
		this.board.unfadeAllPegs();
		tps.switchboard.listenFor("moveStarted", this);
		tps.switchboard.listenFor("moveCompleted", this);
	},

	update: function() {
		this.board.checkForPlayerMove();
	},

	exit: function() {
		tps.switchboard.unlistenFor("moveStarted", this);
		tps.switchboard.listenFor("moveCompleted", this);
		this.clearMessage();
	}
};

tps.scenes.game.prototype.stateWaitForPlayerFinishMove = {
	enter: function() {
		this.board.enableLivePegs();
		this.board.enableLiveTargetSlots();

		tps.switchboard.listenFor("moveAborted", this);
		tps.switchboard.listenFor("moveCompleted", this);
	},

	update: function() {
		this.board.pulseSelection();
		this.board.checkForMoveCompletion();
	},

	exit: function() {
		tps.switchboard.unlistenFor("moveAborted", this);
		tps.switchboard.unlistenFor("moveCompleted", this);
	},
};

tps.scenes.game.prototype.DEBUG_testSolver = {
	enter: function() {
		this.onSolvedState = this.stateWaitForPlayerFinishMove;
		this.onSolve();
		this.board.bringSlotsToFront();
	},

	update: function() {
		this.board.update();
	},

	exit: function() {
		this.board.bringPegsToFront();
		this.board.startBestPlayback();
	}
};

tps.scenes.game.prototype.DEBUG_showSolution = {
	enter: function() {
	},

	update: function() {
		var selectedPiece = this.checkPlayerInput();
		if (selectedPiece) {
			this.board.stepBestPlayback();
		}
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
	this.board.gameUpdate();

	for (var i=0; i<this.buttons.length; ++i) {
		this.buttons[i].update();
	}

	for (var i=0; i<this.updates.length; ++i) {
		this.updates[i]();
	}

	this.stateMachine.update();
};

tps.scenes.game.prototype.render = function(gfx) {
	if (this.board) {
		this.board.draw(gfx);
		this.board.render(gfx);
	}
};

// Game Interface -------------------------------------------------------------
tps.scenes.game.prototype.restart = function() {
	this.newGame();
	this.stateMachine.transitionTo(this.stateRestarting);
};

tps.scenes.game.prototype.newGame = function() {
	this.board.reset();
	this.resetButtons();
	this.stateMachine.transitionTo(this.stateWaitingForGameStart);
	this.setMessageUsingKey("instructions");
	this.wantsNewGame = false;
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
	this.createTextArea();
	this.createTooltip();
	this.createButtons();
	this.createSpinner();
};

tps.scenes.game.prototype.createSpinner = function() {
	this.uiSpinner = this.game.add.sprite(0, 0, "spinner");

	this.uiSpinner.anchor.set(0.5, 0.5);
	this.uiSpinner.x = this.textArea.position.x;
	this.uiSpinner.y = this.textArea.position.y;
	this.uiSpinner.visible = false;
};

tps.scenes.game.prototype.createTextArea = function() {
	var buttonImage = this.game.cache.getImage("buttons");
	var textX = this.game.canvas.width / 2;
	var textY = this.game.canvas.height / 2 + tps.height / 2 - buttonImage.height * (1 + tps.scenes.game.BUTTON_TEXTAREA_SCALAR);

	textX = Math.round(textX);
	textY = Math.round(textY);

	this.textArea = this.game.add.bitmapText(textX, textY, "maian_72");
	tps.utils.assert(this.textArea, "(createTextArea) Creation failed!");

	this.textArea.align = "center";
	this.textArea.anchor.set(0.5, 0.5);
};

tps.scenes.game.prototype.createTooltip = function() {
	var buttonImage = this.game.cache.getImage("buttons");
	var textX = this.game.canvas.width / 2;
	var textY = this.game.canvas.height / 2 + tps.height / 2 - buttonImage.height / 2 * (1 + tps.scenes.game.BUTTON_BAR_SCALAR);

	textX = Math.round(textX);
	textY = Math.round(textY);

	this.tooltip = this.game.add.bitmapText(textX, textY, "maian_72_blue");
	tps.utils.assert(this.tooltip, "(createTooltip) Creation failed!");

	this.tooltip.align = "center";
	this.tooltip.anchor.set(0.5, 1.0);
};

tps.scenes.game.prototype.createButtons = function() {
	this.buttonGroup = this.game.add.group();

	var buttonImage = this.game.cache.getImage("buttons");
	tps.utils.assert(buttonImage, "Couldn't find buttons!");	

	buttonSpacingX = buttonImage.width * tps.scenes.game.BUTTON_BAR_SCALAR;
	var xWidth = tps.scenes.game.BUTTONS.length * buttonImage.width + (tps.scenes.game.BUTTONS.length - 1) * buttonSpacingX;
	var originX = this.game.canvas.width / 2 - xWidth / 2;

	// The button image contains two tps.scenes.game.BUTTONS stacked vertically,
	// so we must divide its height by an additional factor if 2.
	buttonSpacingY = (buttonImage.height / 2) * tps.scenes.game.BUTTON_BAR_SCALAR 
	var buttonOffsetY = (buttonImage.height / 2) / 2 + buttonSpacingY;
	var originY = Math.round(this.game.canvas.height / 2 + tps.height / 2 - buttonOffsetY);

	for (var i=0; i<tps.scenes.game.BUTTONS.length; ++i) {
		var deactivate = tps.scenes.game.BUTTONS[i].indexOf(tps.scenes.game.CHAR_BUTTON_STARTS_INACTIVE) >= 0;
		var isToggle = tps.scenes.game.BUTTONS[i].indexOf(tps.scenes.game.CHAR_BUTTON_IS_TOGGLE) >= 0;
		var B = tps.scenes.game.BUTTONS[i].replace(tps.scenes.game.CHAR_BUTTON_STARTS_INACTIVE, "");
		B = B.replace(tps.scenes.game.CHAR_BUTTON_IS_TOGGLE, "");

		var b = B.toLowerCase();
		var buttonParams = {iconName: "icon_" + b, msgPressed: b + "Pressed", msgReleased: b + "Released", tooltipKey: "tt_button_" + b, owner: this, ownerKey: "button" + B};
		this["button" + B] = null;

		if (isToggle) {
			tps.switchboard.broadcast("createToggleButton", buttonParams);
		}
		else {
			tps.switchboard.broadcast("createClickButton", buttonParams);
		}

		var button = this["button" + B];
		var x = Math.round(originX + buttonImage.width / 2 + i * (buttonImage.width + buttonSpacingX));
		var y = originY;
		button.moveTo(x, y);

		if (deactivate) {
			button.deactivate();
			button.setData(true);
		}
		else {
			button.setData(false);
		}

		this.buttons.push(button);
	}
};

tps.scenes.game.prototype.resetButtons = function() {
	for (var i=0; i<this.buttons.length; ++i) {
		if (this.buttons[i].getData()) {
			this.buttons[i].deactivate();
		}
		else {
			this.buttons[i].activate();
		}
	}
};

tps.scenes.game.prototype.setMessage = function(message) {
	tps.utils.assert(message, "(setMessage) Invalid tooltip!");

	this.textArea.text = message;
};

tps.scenes.game.prototype.setMessageUsingKey = function(key) {
	this.setMessage(tps.strings.lookUp(key));
};

tps.scenes.game.prototype.clearMessage = function() {
	this.textArea.text = "";
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

	this.stateMachine.transitionTo(this.onSolvedState);
};

tps.scenes.game.prototype.setTooltip = function(tooltip) {
	this.tooltip.text = tooltip;
};

tps.scenes.game.prototype.clearTooltip = function() {
	this.tooltip.text = "";
};
