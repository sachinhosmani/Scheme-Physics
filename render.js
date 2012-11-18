//Box2D stuff
var world;
var scale = 20.0;
var body_count = 0;
var time_step = 16.6666;//in milliseconds
var last_time;
var bodies = []; //holds Body objects

var buffer_prev = [];//works as buffer for interpolation
var buffer_next = [];//works as buffer for interpolation

var gl;
var canvas;

$(document).ready(function() {start();});

window.requestAnimFrame = (function(){
return  window.requestAnimationFrame       || 
	window.webkitRequestAnimationFrame || 
	window.mozRequestAnimationFrame    || 
	window.oRequestAnimationFrame      || 
	window.msRequestAnimationFrame     || 
	function(callback, element){
	window.setTimeout(callback, 1000 / 60);
	};
})();
var b2Vec2 = Box2D.Common.Math.b2Vec2
,	b2BodyDef = Box2D.Dynamics.b2BodyDef
,	b2Body = Box2D.Dynamics.b2Body
,	b2FixtureDef = Box2D.Dynamics.b2FixtureDef
,	b2Fixture = Box2D.Dynamics.b2Fixture
,	b2World = Box2D.Dynamics.b2World
,	b2MassData = Box2D.Collision.Shapes.b2MassData
,	b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
,	b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
,	b2DebugDraw = Box2D.Dynamics.b2DebugDraw;

function initWorld() {
	world = new b2World(
		new b2Vec2(0, -20)    //gravity
		,  true                 //allow sleep
	);
};
function CircleShape(radius) {
	this.type = "Circle";
	this.radius = radius;
	this.buffer = gl.createBuffer();
	setup(this);
}
function RectangleShape(width, height) {
	this.type = "Rectangle";
	this.width = width;
	this.height = height;
	this.buffer = gl.createBuffer();
	setup(this);
}
function TriangleShape(vertices) {
	this.type = "Triangle";
	this.vertices = vertices;
	this.buffer = gl.createBuffer();
	setup(this);
}
function Color(red, green, blue) {
	this.red = typeof red !== "undefined" ? red : 0.5;
	this.green = typeof green !== "undefined" ? green : 0.5;
	this.blue = typeof blue !== "undefined" ? blue : 0.5;
}

function Vector2D(x, y) {
	this.x = x;
	this.y = y;
}
function Attributes(density, friction, restitution) {
	this.density = density;
	this.friction = friction;
	this.restitution = restitution;
}
function Body(type, shape, position, angle, velocity, attributes, color, id) {
	this.type = typeof type !== undefined ? type : b2Body.b2_dynamicBody;
	this.shape = shape;
	this.position = position;
	this.angle = typeof angle !== undefined ? angle : 0;
	this.velocity = typeof velocity !== undefined ? velocity : new Vector2D(0, 0);
	this.attributes = attributes;
	this.color = typeof color !== undefined ? color : new Color;
	this.number_vertices = shape.type === "Triangle" ? 3 : (shape.type === "Rectangle" ? 4 : 60);
	this.id = id !== undefined ? id : body_count;
	
	this.contains = 
		function(pos) {
			switch(this.shape.type) {
				case "Rectangle" :
					console.log(this.position);
					console.log(this.shape);
					if((pos.x < this.position.x + this.shape.width/2.0 && pos.x > this.position.x - this.shape.width/2.0)
						&& (pos.y < this.position.y + this.shape.height/2.0 && pos.y > this.position.y - this.shape.height/2.0))
							return this.id;
					break;
				case "Circle" :
					break;
			}
		};
}
function Buffer(position, angle) {
	this.position = position;
	this.angle = angle;
}
function findBodyAt(pos) {
	for(i = 0; i < body_count; i++) {
		if(bodies[i].contains(pos))
			return bodies[i];
	}
	return undefined;
}
function addBody(body) {
	var bodyDef = new b2BodyDef;
	bodyDef.type = body.type;
	bodyDef.position.Set(body.position.x/scale, body.position.y/scale);
	bodyDef.angle = body.angle;
	var fixDef = new b2FixtureDef;
	fixDef.density = body.attributes.density;
	fixDef.friction = body.attributes.friction;
	fixDef.restitution = body.attributes.restitution;
	switch(body.shape.type) {
		case "Rectangle":	
			fixDef.shape = new b2PolygonShape;
			fixDef.shape.SetAsBox(body.shape.width/(2.0*scale), body.shape.height/(2.0*scale));
			break;
		case "Triangle":
			fixDef.shape = new b2PolygonShape;
			fixDef.shape.SetAsArray([new b2Vec2(body.shape.vertices[0]/scale, body.shape.vertices[1]/scale),
								new b2Vec2(body.shape.vertices[2]/scale, body.shape.vertices[3]/scale),
								new b2Vec2(body.shape.vertices[4]/scale, body.shape.vertices[5]/scale)], 3);
			break;
		case "Circle":	
			fixDef.shape = new b2CircleShape(body.shape.radius/scale);
           	break;
	}
	world.CreateBody(bodyDef).CreateFixture(fixDef);
	bodies.push(body);
	body_count++;
}
function removeBody(id) {
	for(i = 0; i < body_count; i++) {
		if(bodies[i].id == id) {
			r_body = bodies[i];
			break;
		}
	}
	if(i == body_count)return;
	var b_list = world.GetBodyList();
	for(j = body_count - 1; j > i; j--) {
		b_list = b_list.m_next;
	}
	world.DestroyBody(b_list);
	b_list = world.GetBodyList();
	bodies.splice(i, 1);
	buffer_prev.splice(i, 1);
	buffer_next.splice(i, 1);
	body_count--;
}
function update() {
	world.Step(
		time_step/1000   // 1 / frame-rate
		,  10      //velocity iterations
		,  10       //position iterations
	);
	var b_list = world.GetBodyList();
	buffer_prev = buffer_next;
	for(i = 0; i < body_count; i++) {
		buffer_next[body_count - i - 1] = new Buffer(new Vector2D(b_list.GetPosition().x * scale, b_list.GetPosition().y * scale), b_list.GetAngle());
		b_list = b_list.m_next;
	}
	//world.DrawDebugData();
	world.ClearForces();
}
//end of Box2D stuff

function initGL() {
	// Get A WebGL context
	canvas = document.getElementById("canvas");
	gl = getWebGLContext(canvas);
	if (!gl) {
		alert("WebGL init fail");
	}
}
var positionLocation;
var resolutionLocation;
var colorLocation;
var translationLocation;
var rotationLocation;
var translation = [];
var rotation = [];
var angle;
//initialize shaders
function initShaders() {
	// setup GLSL program
	vertexShader = createShaderFromScriptElement(gl, "2d-vertex-shader");
	fragmentShader = createShaderFromScriptElement(gl, "2d-fragment-shader");
	program = createProgram(gl, [vertexShader, fragmentShader]);
	gl.useProgram(program);

	// look up where the vertex data needs to go.
	positionLocation = gl.getAttribLocation(program, "a_position");

	// lookup uniforms
	resolutionLocation = gl.getUniformLocation(program, "u_resolution");
	colorLocation = gl.getUniformLocation(program, "u_color");
	translationLocation = gl.getUniformLocation(program, "u_translation");
	rotationLocation = gl.getUniformLocation(program, "u_rotation");

	// set the resolution
	gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
}
//initialize buffers with the body.shape's buffer member object
function initBuffers(body) {
	gl.bindBuffer(gl.ARRAY_BUFFER, body.shape.buffer);
	gl.enableVertexAttribArray(positionLocation);
	gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
}
//set the color
function setColor(color) {
	gl.uniform4f(colorLocation, color.red, color.green, color.blue, 1);
}
// Draw the scene.
function drawScene(number_vertices) {

	// Set the translation.
	gl.uniform2fv(translationLocation, translation);
	// Set the rotation.
	gl.uniform2fv(rotationLocation, rotation);
	// Draw the geometry.
	gl.drawArrays(gl.TRIANGLE_FAN, 0, number_vertices);
}
function degToRad(n) {
	return (Math.PI / 180) * n;
}
//returns an array of vertices for the required shape
function getVertices(shape) {
	var vertices = [];
	switch(shape.type) {
		case "Rectangle" :
			vertices = [-shape.width/2, -shape.height/2,
					-shape.width/2, shape.height/2,
					shape.width/2, shape.height/2,
					shape.width/2, -shape.height/2];
			break;
		case "Triangle" :
			vertices = shape.vertices;
			break;
		case "Circle" :
			for(i = 1; i <= 60; i++) {
				vertices.push(shape.radius * Math.cos(degToRad(6*i)));
				vertices.push(shape.radius * Math.sin(degToRad(6*i)));
			}
			break;
	}
	return vertices;
}
//puts the vertices of the shape into the buffer object of shape (to be done once during init)
function setup(shape) {
	var vertices = getVertices(shape);
	gl.bindBuffer(gl.ARRAY_BUFFER, shape.buffer);
	gl.bufferData(
		 gl.ARRAY_BUFFER,
		 new Float32Array(vertices),
		 gl.STATIC_DRAW);
}
//update the shader's variables with updated values
function animate(body) {
	translation[0] = body.position.x;
	translation[1] = body.position.y;
	angle = body.angle;
	rotation[0] = Math.sin(-angle);
	rotation[1] = Math.cos(-angle);
}
//Physics world is updated at constant time intervals.
//If the screen is painted any sooner, the bodies' parameters should be interpolated. 
function interpolate(time_diff) {
	var t = time_diff/time_step;
	if(t > 1) t = 1; //should not happen (tick() should get called within 1/60 s each time)
	for(i = 0; i < body_count; i++) {
		bodies[i].position.x = (1-t) * bodies[i].position.x + t * buffer_next[i].position.x;
		bodies[i].position.y = (1-t) * bodies[i].position.y + t * buffer_next[i].position.y;
		bodies[i].angle = (1-t) * bodies[i].angle + t * buffer_next[i].angle;
	}
}
var physicsDt = 0;

function tick() {
	var time_now = new Date().getTime();
	var dt = time_now - last_time;
	last_time = time_now;
	physicsDt += dt;
	gl.clear(gl.COLOR_BUFFER_BIT);
	requestAnimFrame(tick);
	for(i=0; i < body_count; i++) {
		setColor(bodies[i].color);
		initBuffers(bodies[i]);
		animate(bodies[i]);
		drawScene(bodies[i].number_vertices);
	}
	if(physicsDt >= time_step) {
		update();
		physicsDt -= time_step;
	}
	interpolate(physicsDt);
}

function start() {
	initGL();
	initShaders();
	initWorld();
	canvas.addEventListener("click", fetchCoords, false);
	//add some bodies
	/*addBody(new Body(b2Body.b2_dynamicBody, new CircleShape(40.0), new Vector2D(400.0, 400.0), 0, 
		new Vector2D(0.0, 0.0), new Attributes(1.0, 0.5, 0.2), new Color(0.3, 0.6, 0.4)));
	addBody(new Body(b2Body.b2_dynamicBody, new RectangleShape(25.0, 50.0), new Vector2D(315.0, 100.0), 0, 
		new Vector2D(0.0, 0.0), new Attributes(1.0, 0.5, 0.2), new Color(0.9, 0.5, 0.1)));
	addBody(new Body(b2Body.b2_dynamicBody, new RectangleShape(50.0, 25.0), new Vector2D(357.0, 300.0), 0, 
		new Vector2D(0.0, 0.0), new Attributes(1.0, 0.5, 0.2), new Color(0.3, 0.5, 0.1)));
	addBody(new Body(b2Body.b2_dynamicBody, new RectangleShape(50.0,50.0), new Vector2D(360.0, 240.0), 0, 
		new Vector2D(0.0, 0.0), new Attributes(1.0, 0.5, 0.2), new Color(0.3, 0.5, 0.4)));
	addBody(new Body(b2Body.b2_dynamicBody, new CircleShape(60.0), new Vector2D(300.0, 500.0), 0, 
		new Vector2D(0.0, 0.0), new Attributes(1.0, 0.5, 0.2), new Color(0.4, 0.5, 0.7)));*/
	addBody(new Body(b2Body.b2_dynamicBody, new RectangleShape(25.0, 46.0), new Vector2D(135.0, 150.0), 0.54, 
		new Vector2D(0.0, 0.0), new Attributes(1.0, 0.5, 0.2), new Color(0.3, 0.3, 0.4), "id2"));
	addBody(new Body(b2Body.b2_staticBody, new RectangleShape(1000.0, 25.0), new Vector2D(350.0, 10.0), 0, 
		new Vector2D(0.0, 0.0), new Attributes(1.0, 0.5, 0.2), new Color(0.5, 0.6, 0.6), "id1"));
	console.log(findBodyAt(new Vector2D(473, 126)));
	//setup debug draw
	/*var debugDraw = new b2DebugDraw();
		debugDraw.SetSprite(document.getElementById("canvas").getContext("2d"));
		debugDraw.SetDrawScale(30.0);
		debugDraw.SetFillAlpha(0.5);
		debugDraw.SetLineThickness(1.0);
		debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
		world.SetDebugDraw(debugDraw);

	window.setInterval(update, 1000 / 60);*/
	
	for(i = 0; i < body_count; i++) {
		buffer_next[i] = new Buffer(new Vector2D(bodies[i].position.x, bodies[i].position.y), bodies[i].angle);
	}
	update();
	last_time = new Date().getTime();
	tick();
}
//end of WebGL stuff
