function Layer3d(id) {
	// assign fields
	this.id = String(id);

	// Render params
	this.renderer = null;

	//
	this.clickable = false;
	this.level_filter = null;
	this.room_filter = null;
	this.building_filter = null;
	this.level_opacity = 1;
	this.kind_filter = null;
}

// add render to a layer
function setRenderer(renderer) {
	this.renderer = renderer
}

// add functions to prototype
Layer3d.prototype.setRenderer = setRenderer;

// exports
module.exports = {
	Layer3d
}