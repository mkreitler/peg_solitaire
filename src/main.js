var tps = {
	screenWidth: window.innerWidth * window.devicePixelRatio, // window.screen.width * window.devicePixelRatio,
	screenHeight: window.innerHeight * window.devicePixelRatio, // window.screen.height * window.devicePixelRatio,
	baseWidth: 960,
	baseHeight: 640,
	width: 0,
	height: 0,
	scale: 1,
	scenes: {},
	game: null,
	gfxBuffer: null,
	errText: null,

	preload: function() {
	    tps.game.load.image('peg_green', 		'./res/bitmaps/peg_green.png',		70, 70);
	    tps.game.load.image('slot_orange', 		'./res/bitmaps/slot_orange.png',	100, 100);
	    tps.game.load.image('spinner', 			'./res/bitmaps/spinner.png',		70, 70);
	    tps.game.load.image('target_ring', 		'./res/bitmaps/target_ring.png',	80, 80);
	    // tps.game.load.image('creatures', 	'./res/bitmaps/creatures.png', 24, 24);

	    tps.game.load.bitmapFont('charybdis_72', './res/fonts/charybdis_72/font.png', './res/fonts/charybdis_72/font.fnt');
	},

	create: function() {
		var key = null;
		var ctxt = null;

		// tps.createGfxBuffer();
		tps.game.stage.backgroundColor = 0x000000;

		tps.utils.assert(tps.scale > 0, "Device screen too small to support app!");
		tps.scale = Math.max(tps.scale, 1);

		tps.cursorKeys = tps.game.input.keyboard.createCursorKeys();
		tps.cursorKeys['enter'] = tps.game.input.keyboard.addKey(Phaser.Keyboard.ENTER);

		tps.switchboard.listenFor('addKeyAction', tps);
		tps.switchboard.listenFor('removeKeyAction', tps);
		tps.switchboard.listenFor('loadScene', tps);

		for (key in tps.scenes) {
			// Create an object using the constructor stored in the 'scenes' array.
			tps.scenes[key] = new tps.scenes[key](tps.game);
		}

		// Display the main menu.
		tps.startScene(tps.scenes.game);

		tps.centerContent();
	},

	update :function() {
		tps.switchboard.update();
		
		if (!tps.errText && tps.scene && tps.scene.update) {
			tps.scene.update();
		}
	},

	render: function() {
		if (!tps.errText && tps.scene && tps.scene.hasOwnProperty('render')) {
			tps.scene.render(tps.game.canvas.getContext('2d'));
		}
	},

	startScene: function(newScene) {
		if (newScene) {
			if (tps.scene != newScene) {
				if (tps.scene && tps.scene.end) {
					tps.scene.end();
				}

				if (newScene && newScene.start) {
					newScene.start();
				}

				tps.scene = newScene;
			}
		}
	},

	createGfxBuffer: function() {
		var x = Math.floor(tps.screenWidth / 2);
		var y = Math.floor(tps.screenHeight / 2);

	    this.gfxBuffer = tps.game.add.bitmapData(tps.width, tps.height);
	    this.gfxBuffer.addToWorld(x, y, 0.5, 0.5, this.scale, this.scale);

	    // DEBUG
	    this.gfxBuffer.ctx.fillStyle = "#00BBBB";
	    this.gfxBuffer.ctx.fillRect(0, 0, tps.width, tps.height);
	},

	centerContent: function() {
		tps.game.scale.pageAlignHorizontally = true;
		tps.game.scale.pageAlignVertically = true;
		tps.game.scale.refresh();		
	},

	// Message Handlers ///////////////////////////////////////////////////////
	loadScene: function(sceneName) {
		tps.utils.assert(sceneName, '(loadScene) invalid scene name');
		
		this.startScene(this.scenes[sceneName]);
	},

	addKeyAction: function(keyActionAssoc) {
		var keys = keyActionAssoc ? Object.keys(keyActionAssoc) : null;

		tps.utils.assert(keys && keys.length === 1, "(addKeyAction) invalid args");

		this.cursorKeys[keys[0]].onUp.add(keyActionAssoc[keys[0]]);
	},

	removeKeyAction: function(keyActionAssoc) {
		var keys = keyActionAssoc ? Object.keys(keyActionAssoc) : null;

		tps.utils.assert(keys && keys.length === 1, "(addKeyAction) invalid args");

		this.cursorKeys[keys[0]].onDown.remove(keyActionAssoc[keys[0]]);
	},
};

