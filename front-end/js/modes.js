
modes = {}


modes['buildings'] = {

	predicate: `id=mgh&predicate0=(kind='Level')`,
	clickable_kind: 'Level',
	ground_plane_on: true,
	visible_divs: [],
	color_scale: null,
	room_filter: null, 
	level_opacity: 1,
	default_level: 999,
	room_condition: null

}


modes['rooms'] = {

	clickable_kind: 'Room',
	ground_plane_on: false,
	visible_divs: [],
	color_scale: null,
	room_filter: null, 
	level_opacity: 0.075,
	default_level: 8,
	room_condition: "level='8'"

}





module.exports = modes