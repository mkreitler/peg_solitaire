// Launch the game!
tps.game = new Phaser.Game(tps.screenWidth, tps.screenHeight, Phaser.CANVAS, 'Triangle Peg Solitaire', { preload: tps.preload, create: tps.create, update: tps.update, render: tps.render });
