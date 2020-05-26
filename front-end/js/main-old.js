const d3 = require('d3');
const THREE = require('three');

const d = require('./data_helpers.js')
const p = require('./properties.js')
const h3 = require('./three_helpers.js')
// const modes = require('./modes.js')
var views = require('./views.js')


// PROPERTIES ===================================================================
var cur_mode = 'allBuildings';
var cur_level = undefined;

var ground_plane_uuid = undefined;
var scene_geoms = {};
var clickable_objects = [];

var mouse = new THREE.Vector2(), INTERSECTED;

// UI ===================================================================

function add_buttons(views) {
	/* Adds buttons to the UI to toggle views */
	// console.log(views)
	// console.log(views[0])

	// Iterate over every mode in views
	$.each(views, (k, v) => {

		console.log(k, v)

		// Add the button to the UI
		$('#button-row').append(`<button type="button" class="btn btn-primary btn-sm" id=${v.id}>${v.title}</button> `)

		// Add on click function
		$(`#${v.id}`).click(function() {set_mode(v.id)});
	})
}


// LISTENERS ===================================================================

// Add document event listeners
document.addEventListener('mousemove', on_document_mouse_move, false);
document.addEventListener( 'mousedown', onDocumentMouseDown, false );
document.addEventListener( 'click', onDocumentMouseClick, false);
document.onkeydown = on_document_key_down;



// Event listener methods
function on_document_mouse_move(event) {
	/* Updates mouse position data on mouse move */

	event.preventDefault();
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

function on_document_key_down(event) {
	/* Performs actions on key clicks */
	console.log(event);

	if(event['key'] === "ArrowUp") {
		set_mode(cur_mode, level=cur_level+1);
	} else if (event['key'] === "ArrowDown") {
		set_mode(cur_mode, level=cur_level-1);
	}

}


function onDocumentMouseDown(event){
	/* Saves the identity of the object that the mouse was over when it is clicked
	in order to verify that mouse click event is over same object. */
	console.log("MOUSE DOWN!")

	event.preventDefault();
	raycaster.setFromCamera(mouse, camera);
	var intersects = raycaster.intersectObjects(raycasting_targets);

	if (intersects.length > 0) {
		INTERSECTED = intersects[0].object
		mouse_down_intersected = INTERSECTED;
	}
}


function onDocumentMouseClick(event){
	/* Handles mouse click events for three.js raycasting */

	console.log("CLICK!")

	event.preventDefault();
	raycaster.setFromCamera(mouse, camera);
	var intersects = raycaster.intersectObjects(raycasting_targets);

	if (intersects.length > 0) {
		INTERSECTED = intersects[0].object

		// Check if intersected object is same one when mouse clicked down.
		if (INTERSECTED === mouse_down_intersected) {

			if (mode !== 'infections') {
				onGeometryClick(INTERSECTED.uuid)
			} else {
				// onDetailRoomClick(INTERSECTED.uuid)
				console.log("not infections")

			}
		}
	}
}




// AJAX ===================================================================

function load_geoms(layer) {
	/* Given predicates, fetches geoms from the backend, constructs objects, and loads them into the scene */
	condition = ''

	console.log(layer)

	// Form predicate
	var predicate = `id=mgh&predicate0=(kind='${layer.kind_filter}')`;

	console.log(predicate)

	// Call backend
	$.ajax({
        type: "GET",
        url: "/canvas",
        data: predicate,
        success: function(data) {
        	x = JSON.parse(data).staticData[0]
        	console.log(x)

        	for (var i = 0; i < x.length; i++) {

        		geom = d.get_geom(x[i]);
        		mesh = h3.mesh_from_geom(layer, geom);

        		if (kind === 'Room') {
        			depth = 120;
        			mesh.material.transparent = false;
        		}

        		geom.uuid = mesh.uuid;

        		scene_geoms[geom.uuid] = geom;
        		scene.add(mesh);
        		tweenOpacity(geom, 1, 500);

        	}

        	// Continue the mode change routine
        	set_mode_pt_2();
        }
	})
}


function destroy_all_rooms() {

	$.each(scene_geoms, (k,v) => {
		if(v['kind'] == 'Room') {
			const object = scene.getObjectByProperty('uuid', k);
			object.geometry.dispose();
			object.material.dispose();
			scene.remove(object);
			delete scene_geoms[k];
		}
	})

}


// THREE.JS ===================================================================

var camera, controls, scene, renderer, raycaster;

function init_three_js(){
	/* Loads the three.js scene, elements, and adds it to the DOM */

	// Get scene
	scene = h3.get_scene();

	// Get renderer, camera, and controls
	var h3_elements = h3.get_elements();
	controls = h3_elements.controls
	renderer = h3_elements.renderer
	camera = h3_elements.camera

	// Add Renderer to scene
	document.body.appendChild( renderer.domElement );

	// Add ground plane to scene
	var ground_plane = h3.get_ground_plane();
	scene.add(ground_plane);
	ground_plane_uuid = ground_plane.uuid;

	// Add Raycaster
	raycaster = new THREE.Raycaster();
}


function animate(){
	/* Required three.js animate function */

	requestAnimationFrame(animate);
	controls.update();
	TWEEN.update();
	render();
}


function render(){
	/* Required three.js render function */

	check_raycaster();
}


function on_window_resize() {
	/* Update rendera and camera on window resize */

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}


// RAYCASTER ===================================================================

function check_raycaster() {
	/* Cheks if mouse is hovering over any clickable scene objects, and changes color */

	raycaster.setFromCamera(mouse, camera);
	var intersects = raycaster.intersectObjects(clickable_objects);

	if (intersects.length > 0 ) {
		if (INTERSECTED != intersects[0].object) {
			if(INTERSECTED) {
				INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);
			}
			INTERSECTED = intersects[0].object;
			INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
			INTERSECTED.material.emissive.setHex( p.colors.selected_hex );

			var hovered_object = scene_geoms[INTERSECTED.uuid];
			console.log(hovered_object);

		}
	} else {
		if (INTERSECTED) {
			INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex )
		};
		INTERSECTED = null;
	}

	renderer.render(scene, camera);
}


// TWEENS ===================================================================

function tweenOpacity(geom, new_opacity, duration) {
	/* Given a geom, tweens the opacity */

	mesh = scene.getObjectByProperty('uuid', geom.uuid);

	new TWEEN.Tween(mesh.material).to({
		opacity: new_opacity,
	}, duration)
	.easing(TWEEN.Easing.Quadratic.InOut)
	.start();

	if (new_opacity > 0.5) {
		mesh.castShadow = true;
	} else {
		mesh.castShadow = false;
	}
}


// UPDATE MODE ===================================================================

function set_clickable_objects(m) {
	/* Given a mode, populats the list of uuids of objects that the mouse can interact with */

	// Reset the list of interactive objects
	var clickable_uuids = [];

	// Iterate through each object in the scene and add to the clickable list, if specified
	$.each(scene_geoms, (k,v) => {
		if ( v.kind === m.clickable_kind) {
			clickable_uuids.push(k)
		}
	})

	temp_children = [];

	// Iterate through each scene object and ad it to the clickable list
	$.each(scene.children, (k,v) => {
		if (clickable_uuids.includes(v.uuid)) {
			temp_children.push(v);
		}
	})

	clickable_objects = temp_children;

}


function toggle_ground_plane(m) {
	/* Turns the ground plane on or off per mode's specs */

	const ground_plane = scene.getObjectByProperty('uuid', ground_plane_uuid);

	if(m.ground_plane_on) {
		tweenOpacity(ground_plane, 1, 400);
	} else {
		tweenOpacity(ground_plane, 0, 400);
	}
}


function update_current_level(m, new_level) {
	/* Updates the global room level */

	if (new_level === null) {
		cur_level = m.default_level;
	} else {
		cur_level = new_level;
	}
}


function update_subtitle(m) {
	/* Updates the page's subtitle */
	$('#level-label').text(m.subtitle);


}

function update_level_opacity(m) {
	/* Given a mode's specifications, update level objects' opacity */

	$.each(scene_geoms, (k,v) => {
		if (v.kind === 'Level') {
	
			if (v.level > cur_level - 1) {
				// Hide any objects over current level
				visible = false;
				new_opacity = 0;
				cast_shadow = true;
			} else {
				// Lower opacity of any visible levels
				tweenOpacity(v, 0, 400);
				visible = true;
				new_opacity = m.level_opacity;
				cast_shadow = false;
			}
			
			const object = scene.getObjectByProperty('uuid', k);
			tweenOpacity(v, new_opacity, 400);
			object.visible = visible;
			object.castShadow = cast_shadow;
		}
	})
}


function set_mode(mode, new_level=null){
	/* Perform actions to change the mode before new objects are fetched from the backend */
	console.log(`Updating mode to: ${mode}`)

	// Update the current stored mode and get mode specs
	cur_mode = mode;
	m = views[cur_mode];

	// Update the current level
	update_current_level(m, new_level);

	// Update scene opacities
	toggle_ground_plane(m);
	update_level_opacity(m);

	// Destroy any rooms, if they are in the scene
	destroy_all_rooms();

	// Update the page's subtitle
	update_subtitle(m);

	// Load new objects and/or set clickable objects
	if (m.room_condition !== null) {
		// load_geoms(m, 'Room', condition=`level='${cur_level}'`)
	} else {
		set_mode_pt_2()
	}
}


function set_mode_pt_2(){
	/* Perform actions to change the mode after new objects are fetched from the backend */

	console.log(`Continuing to set mode to ${cur_mode}`)
	m = views[cur_mode];
	set_clickable_objects(m);

}


// MAIN METHODS ===================================================================

function init() {

	// Preprocess views
	views = views['Views']
	views_dict = {}

	$.each(views, (k,v) => {
		views_dict[v.id] = v
	})

	views = views_dict

	add_buttons(views)

	m = views[cur_mode];

	init_three_js();

	$.each(m.layers, (k,v) => {
		console.log(v);
		load_geoms(v);
	})

	// load_geoms(m);

	window.addEventListener( 'resize', on_window_resize, false );

	set_mode(cur_mode);

	// console.log(modes['buildings']['results'])

	// console.log(views)
	
}

// MAIN ===================================================================

init();
animate();
