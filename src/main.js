var tps = {
	screenWidth: window.innerWidth * window.devicePixelRatio, // window.screen.width * window.devicePixelRatio,
	screenHeight: window.innerHeight * window.devicePixelRatio, // window.screen.height * window.devicePixelRatio,
	baseWidth: 960,
	baseHeight: 640,
	width: 720,
	height: Math.round(720 * 1024 / 768 / 2) * 2,
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
	    tps.game.load.image('peg_particle', 	'./res/bitmaps/peg_particle.png',	55, 55);
	    tps.game.load.image('hint_particle', 	'./res/bitmaps/particle_hint.png',	55, 55);

	    tps.game.load.spritesheet('buttons', 	'./res/bitmaps/buttons.png',		90, 90);
	    tps.game.load.spritesheet('icon_hint',	'./res/bitmaps/icon_hint.png',		30, 54);
	    tps.game.load.spritesheet('icon_play',	'./res/bitmaps/icon_play.png',		75, 38);
	    tps.game.load.spritesheet('icon_sound',	'./res/bitmaps/icon_sound.png',		53, 51);
	    tps.game.load.spritesheet('icon_music',	'./res/bitmaps/icon_music.png',		42, 54);
	    tps.game.load.spritesheet('icon_undo',	'./res/bitmaps/icon_undo.png', 		53, 47);
	    tps.game.load.spritesheet('icon_redo',	'./res/bitmaps/icon_redo.png', 		53, 47);

	    tps.game.load.bitmapFont('maian_72_blue','./res/fonts/font_blue.png', './res/fonts/font_blue.fnt');
	    tps.game.load.bitmapFont('maian_72', 	'./res/fonts/font.png', './res/fonts/font.fnt');

		tps.game.load.audio('crystal_hunter',		'./res/audio/crystal_hunter.mp3');	    
		tps.game.load.audio('button_click_res',		'./res/audio/click.wav');
		tps.game.load.audio('button_toggle_res',	'./res/audio/toggle.wav');
		tps.game.load.audio('future_01_res',		'./res/audio/future01.wav');	    
		tps.game.load.audio('future_02_res',		'./res/audio/future02.wav');
	},

	create: function() {
		var key = null;
		var ctxt = null;

		var dx = tps.width;
		var halfDy = Math.round(tps.height / 2);

		tps.game.stage.backgroundColor = 0x000000;

		tps.utils.assert(tps.scale > 0, "Device screen too small to support app!");
		tps.scale = Math.max(tps.scale, 1);

		tps.cursorKeys = tps.game.input.keyboard.createCursorKeys();
		tps.cursorKeys['enter'] = tps.game.input.keyboard.addKey(Phaser.Keyboard.ENTER);

		tps.switchboard.listenFor('addKeyAction', tps);
		tps.switchboard.listenFor('removeKeyAction', tps);
		tps.switchboard.listenFor('loadScene', tps);
		tps.switchboard.listenFor('createClickButton', tps);
		tps.switchboard.listenFor('createToggleButton', tps);
		tps.switchboard.listenFor('buttonClickUp', tps);
		tps.switchboard.listenFor('buttonClickDown', tps);
		tps.switchboard.listenFor('buttonToggleUp', tps);
		tps.switchboard.listenFor('buttonToggleDown', tps);

		tps.soundModule = new tps.soundManager(tps.game);
		tps.soundModule.setMusic("crystal_hunter", true);
		tps.soundModule.addSound("button_click", "button_click_res");
		tps.soundModule.addSound("button_toggle", "button_toggle_res");
		tps.soundModule.addSound("button_toggle", "button_toggle_res");
		tps.soundModule.addSound("future01", "future_01_res");
		tps.soundModule.addSound("future02", "future_02_res");

		// HACK: force an update of the switchboard so the above listeners will get
		// added tright away.
		tps.switchboard.update();

		for (key in tps.scenes) {
			// Create an object using the constructor stored in the 'scenes' array.
			tps.scenes[key] = new tps.scenes[key](tps.game);
		}

		// Display the main menu.
		tps.startScene(tps.scenes.game);

		tps.centerContent();
	},

	buttonClickUp: function() {
		// this.soundModule.playSound("button_click");
	},

	buttonClickDown: function() {
		this.soundModule.playSound("button_click");
	},

	buttonToggleUp: function() {
		this.soundModule.playSound("button_toggle");
	},

	buttonToggleDown: function() {
		this.soundModule.playSound("button_toggle");
	},

	update :function() {
		tps.switchboard.update();

		if (!tps.errText && tps.scene && tps.scene.update) {
			tps.scene.update();
		}
	},

	render: function() {
		var gfx = tps.game.canvas.getContext('2d');

		if (gfx) {
			// gfx.strokeStyle = "rgba(159, 64, 0, 255)";

			// var dx = 720;
			// var halfDy = Math.round(720 * 1024 / 768 / 2);
			// gfx.beginPath();
			// gfx.rect(gfx.canvas.width / 2 - dx / 2, gfx.canvas.height / 2 -  halfDy, dx, 2 * halfDy);
			// gfx.stroke();
			// gfx.closePath();

			if (!tps.errText && tps.scene && tps.scene['render']) {
				tps.scene.render(gfx);
			}
		}
	},

	createClickButton: function(info) {
		tps.utils.assert(info && info.iconName && info.msgPressed && info.msgReleased && info.tooltipKey && info.owner && info.ownerKey, "(createClickButton) Invalid parameters!");

		var button = new tps.Button(this.game, tps.Button.Type.CLICK, this.game.add.sprite(0, 0, "buttons"), this.game.add.sprite(0, 0, info.iconName), info.msgPressed, info.msgReleased, tps.strings.lookUp(info.tooltipKey));

		info.owner[info.ownerKey] = button;
	},

	createToggleButton: function(info) {
		tps.utils.assert(info && info.iconName && info.msgPressed && info.msgReleased && info.tooltipKey && info.owner && info.ownerKey, "(createClickButton) Invalid parameters!");

		var button = new tps.Button(this.game, tps.Button.Type.TOGGLE, this.game.add.sprite(0, 0, "buttons"), this.game.add.sprite(0, 0, info.iconName), info.msgPressed, info.msgReleased, tps.strings.lookUp(info.tooltipKey));

		info.owner[info.ownerKey] = button;
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

