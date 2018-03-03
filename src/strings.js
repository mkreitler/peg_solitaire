/**
 *	Assoc tables for managing string lookUp.
 *  Localization would go here.
 */

 tps.strings = {
 	table: {
 		tt_button_hint: "Press to see the next move.",
 		tt_button_undo: "Press to undo a move.",
 		tt_button_redo: "Press to redo a move.",
 		tt_button_play: "Press to start a new game.",
 		tt_button_music: "Press to toggle music.",
 		tt_button_sound: "Press to toggle sound.",

 		instructions: "Object: jump green pegs until only 1 remains.\nMethod: Tap on a peg. Tap '?' for a hint.\n\nPress 'Go!' to play.",

 		msg_begin: "Begin!",
 		msg_cantUndo: "Can't undo any more.",
 		msg_cantRedo: "There is nothing to redo.",
 		msg_undoMoves01: "Undo some moves.",
 		msg_undoMoves02: "Try using 'undo'.",
 		msg_undoMoves03: "'Undo' might help.",
 		msg_undoMoves04: "You need to undo some moves.",
 		msg_tryHint01: "Try this...",
 		msg_tryHint02: "Maybe this?",
 		msg_tryHint03: "Give this a whirl.",
 		msg_tryHint04: "How about this?",
 		msg_solved01: "Ta-da!",
 		msg_solved02: "Voila!",
 		msg_solved03: "Here you go.",
 		msg_solved04: "Aaaaand solved!",
 		msg_lost01: "Not quite!",
 		msg_lost02: "You lost.",
 		msg_lost03: "Out of moves.",
 		msg_lost04: "Game over.",
 		msg_won01: "Great job!",
 		msg_won02: "Congratulations!",
 		msg_won03: "You won!",
 		msg_won04: "Fantastic!",
 		msg_tryAgain: "Press 'Go!' to try again.",
 	},

 	WILDCARD: "*",

 	lookUp: function(key) {
 		tps.utils.assert(key && key.length > 0, "(tps.strings.lookUp) Invalid key!");

	 	var tableEntry = this.table[key];
 		if (key.indexOf(tps.strings.WILDCARD) >= 0) {
 			tableEntry = this.getRandomEntryFromSubset(key);
 		}

	 	tps.utils.assert(tableEntry, "(tps.strings.lookUp) No entry for key '" + key + "'!");

	 	return tableEntry;
 	},

 	getRandomEntryFromSubset: function(pattern) {
 		var entries = [];
 		var key = null;

 		pattern = pattern.replace(tps.strings.WILDCARD, "");

 		for (key in this.table) {
 			if (key.indexOf(pattern) >= 0) {
 				entries.push(this.table[key]);
 			}
 		}

 		return entries.length > 0 ? entries[Math.floor(Math.random() * entries.length)] : null;
 	},
 };
