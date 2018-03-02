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

 		instructions: "Object: jump green pegs until only 1 remains.\nMethod: Tap on a peg. Tap '?' for a hint.",
 	},

 	lookUp: function(key) {
 		tps.utils.assert(key && key.length > 0, "(tps.strings.lookUp) Invalid key!");

 		key = key.toLowerCase();
 		var tableEntry = this.table[key];

 		tps.utils.assert(tableEntry, "(tps.strings.lookUp) No entry for key '" + key + "'!");

 		return tableEntry;
 	}
 };
