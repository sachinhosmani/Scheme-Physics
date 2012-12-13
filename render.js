/*Global Objects*/
var g_Box2D = {
	world : undefined ,
	scale : 20.0 ,
	body_count : 0 ,
	time_step : 16.6666 ,//in milliseconds
	bodies : [] , //holds Body objects
	buffer_prev : [] ,//works as buffer for interpolation
	buffer_next : [] //works as buffer for interpolation
};
var g_WebGL = {
	gl : undefined ,
	canvas : undefined ,
	last_time : undefined ,
	physicsDt : 0 ,
	translation : [] ,
	rotation : [] ,
	angle : 0 ,
	bgColor : new Color(1.0, 1.0, 1.0, 1.0)
};
var g_Shader = {
	positionLocation : undefined ,
	resolutionLocation : undefined ,
	colorLocation : undefined ,
	translationLocation : undefined ,
	rotationLocation : undefined
}
/* ~ Global Objects*/



$(document).ready(function() {start();});

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




/* Types*/
function CircleShape(radius) { //circle's shape constructor
	this.type = "Circle";
	this.radius = radius;
	this.buffer = g_WebGL.gl.createBuffer();
	setup(this);
}
function RectangleShape(width, height) { //rectangle's shape constructor
	this.type = "Rectangle";
	this.width = width;
	this.height = height;
	this.buffer = g_WebGL.gl.createBuffer();
	setup(this);
}
function TriangleShape(vertices) {
	this.type = "Triangle";
	this.vertices = vertices;
	this.buffer = g_WebGL.gl.createBuffer();
	setup(this);
}
function Color(red, green, blue) {
	this.red = typeof red === "number" ? red : 0.5;
	this.green = typeof green === "number" ? green : 0.5;
	this.blue = typeof blue === "number" ? blue : 0.5;
}

function Vector2D(x, y) { //2D vector constructor
	this.x = x;
	this.y = y;
	this.mag = function() { return Math.sqrt(this.x * this.x + this.y + this.y) };
	this.add = function(p_vector) { return new Vector2D(p_vector.x + this.x, p_vector.y + this.y); };
	this.sub = function(p_vector) { return new Vector2D(this.x - p_vector.x, this.y - p_vector.y); };
	this.dist = function(p_vector) { return this.mag(this.sub(p_vector)); };
}
function Attributes(density, friction, restitution) { //holds attributes of a body
	var liesIn = function(num, a, b) {
		if(typeof num === "number" && (num >= a && num <= b)) return 1;
		else return 0;
	}
	this.density = liesIn(density, 0, Infinity) ? density : 0.5;
	this.friction = liesIn(friction, 0, Infinity) ? friction : 0.5;
	this.restitution = liesIn(restitution, 0, 1) ? restitution : 0.5;
}
function Body(p_type, p_shape, p_position, p_angle, p_velocity, p_attributes, p_color, p_id) { //body container
	return {
		type : function() { return typeof p_type !== "undefined" ? p_type : b2Body.b2_dynamicBody; } ,
		shape : p_shape ,
		position : p_position ,
		angle : p_angle ,
		velocity : p_velocity ,
		attributes : p_attributes ,
		color : typeof p_color !== "undefined" ? p_color : new Color ,
		number_vertices : function() { return p_shape.type === "Triangle" ? 3 : (p_shape.type === "Rectangle" ? 4 : 60); } ,
		id : function() { return p_id !== undefined ? p_id : g_Box2D.body_count; } ,

		contains : //tells if 'pos' lies inside the shape
			function(pos) {
				switch(this.shape.type) {
					case "Rectangle" :
						if((pos.x < this.position.x + this.shape.width/2.0 && pos.x > this.position.x - this.shape.width/2.0)
							&& (pos.y < this.position.y + this.shape.height/2.0 && pos.y > this.position.y - this.shape.height/2.0)) {
								return this.id();}
						break;
					case "Circle" :
						return pos.dist(this.position) <= this.shape.radius ? this.id() : undefined;
					default :
						return undefined;
				}
			}
	};
}
function Buffer(position, angle) {
	this.position = position;
	this.angle = angle;
}
/* ~ Types*/





/*Box2D helper functions*/
function findBody(id) { //find the body of given id
	for(var i = 0; i < g_Box2D.body_count; i++)
		if(g_Box2D.bodies[i].id() == id)
			return g_Box2D.bodies[i];
	return undefined;
}
function findBodyAt(pos) { //finds a body, if any, at a given pos
	for(var i = 0; i < g_Box2D.body_count; i++) {
		if(g_Box2D.bodies[i].contains(pos))
			return g_Box2D.bodies[i];
	}
	return undefined;
}
function addBody(body) { //adds a body to the world
	var bodyDef = new b2BodyDef;
	bodyDef.type = body.type();
	bodyDef.position.Set(body.position.x/g_Box2D.scale, body.position.y/g_Box2D.scale);
	bodyDef.angle = body.angle;
	var fixDef = new b2FixtureDef;
	fixDef.density = body.attributes.density;
	fixDef.friction = body.attributes.friction;
	fixDef.restitution = body.attributes.restitution;
	switch(body.shape.type) {
		case "Rectangle":	
			fixDef.shape = new b2PolygonShape;
			fixDef.shape.SetAsBox(body.shape.width/(2.0*g_Box2D.scale), body.shape.height/(2.0*g_Box2D.scale));
			break;
		case "Triangle":
			fixDef.shape = new b2PolygonShape;
			fixDef.shape.SetAsArray([new b2Vec2(body.shape.vertices[0]/g_Box2D.scale, body.shape.vertices[1]/g_Box2D.scale),
								new b2Vec2(body.shape.vertices[2]/g_Box2D.scale, body.shape.vertices[3]/g_Box2D.scale),
								new b2Vec2(body.shape.vertices[4]/g_Box2D.scale, body.shape.vertices[5]/g_Box2D.scale)], 3);
			break;
		case "Circle":	
			fixDef.shape = new b2CircleShape(body.shape.radius/g_Box2D.scale);
           	break;
	}
	g_Box2D.world.CreateBody(bodyDef).CreateFixture(fixDef);
	g_Box2D.bodies.push(body);
	g_Box2D.body_count++;
}
function removeBody(id) {
	for(i = 0; i < g_Box2D.body_count; i++) {
		if(g_Box2D.bodies[i].id() == id) {
			r_body = g_Box2D.bodies[i];
			break;
		}
	}
	if(i == g_Box2D.body_count)return;
	var b_list = g_Box2D.world.GetBodyList();
	for(j = g_Box2D.body_count - 1; j > i; j--) {
		b_list = b_list.m_next;
	}
	g_Box2D.world.DestroyBody(b_list);
	b_list = g_Box2D.world.GetBodyList();
	g_Box2D.bodies.splice(i, 1);
	g_Box2D.buffer_prev.splice(i, 1);
	g_Box2D.buffer_next.splice(i, 1);
	g_Box2D.body_count--;
}

/* ~ Box2D helper functions*/





/*Box2D functions*/
function initWorld() { //initializes the world
	g_Box2D.world = new b2World(
		new b2Vec2(0, -20)    //gravity
		,  true                 //allow sleep
	);
};
function update() {
	g_Box2D.world.Step(
		g_Box2D.time_step/1000   // 1 / frame-rate
		,  10      //velocity iterations
		,  10       //position iterations
	);
	var b_list = g_Box2D.world.GetBodyList();
	g_Box2D.buffer_prev = g_Box2D.buffer_next;
	for(i = 0; i < g_Box2D.body_count; i++) {
		g_Box2D.buffer_next[g_Box2D.body_count - i - 1] = new Buffer(new Vector2D(b_list.GetPosition().x * g_Box2D.scale, b_list.GetPosition().y * g_Box2D.scale), b_list.GetAngle());
		b_list = b_list.m_next;
	}
	//g_Box2D.world.DrawDebugData();
	g_Box2D.world.ClearForces();
}
/* ~ Box2D functions*/






/*WebGL helper functions */
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
	g_WebGL.gl.bindBuffer(g_WebGL.gl.ARRAY_BUFFER, shape.buffer);
	g_WebGL.gl.bufferData(
		 g_WebGL.gl.ARRAY_BUFFER,
		 new Float32Array(vertices),
		 g_WebGL.gl.STATIC_DRAW);
}
//update the shader's variables with updated values
function animate(body) {
	g_WebGL.translation[0] = body.position.x;
	g_WebGL.translation[1] = body.position.y;
	g_WebGL.angle = body.angle;
	g_WebGL.rotation[0] = Math.sin(-g_WebGL.angle);
	g_WebGL.rotation[1] = Math.cos(-g_WebGL.angle);
}

/*Physics world is updated at constant time intervals.
If the screen is painted any sooner, the bodies' parameters should be interpolated.*/
function interpolate(time_diff) {
	var t = time_diff/g_Box2D.time_step;
	if(t > 1) t = 1; //should not happen (tick() should get called within 1/60 s each time)
	for(i = 0; i < g_Box2D.body_count; i++) {
		g_Box2D.bodies[i].position.x = (1-t) * g_Box2D.bodies[i].position.x + t * g_Box2D.buffer_next[i].position.x;
		g_Box2D.bodies[i].position.y = (1-t) * g_Box2D.bodies[i].position.y + t * g_Box2D.buffer_next[i].position.y;
		g_Box2D.bodies[i].angle = (1-t) * g_Box2D.bodies[i].angle + t * g_Box2D.buffer_next[i].angle;
	}
}

function tick() {
	var time_now = new Date().getTime();
	var dt = time_now - g_WebGL.last_time;
	g_WebGL.last_time = time_now;
	g_WebGL.physicsDt += dt;
	g_WebGL.gl.clear(g_WebGL.gl.COLOR_BUFFER_BIT);
	requestAnimFrame(tick);
	for(i=0; i < g_Box2D.body_count; i++) {
		setColor(g_Box2D.bodies[i].color);
		initBuffers(g_Box2D.bodies[i].shape.buffer);
		animate(g_Box2D.bodies[i]);
		drawScene(g_Box2D.bodies[i].number_vertices());
	}
	if(g_WebGL.physicsDt >= g_Box2D.time_step) {
		update();
		g_WebGL.physicsDt -= g_Box2D.time_step;
	}
	interpolate(g_WebGL.physicsDt);
}
/* ~ WebGL helper functions*/



/*WebGL functions*/
function initGL() {
	// Get A WebGL context
	g_WebGL.canvas = document.getElementById("canvas");
	g_WebGL.gl = getWebGLContext(canvas);
	if (!g_WebGL.gl) {
		alert("WebGL init fail");
	}
}
//initialize shaders
function initShaders() {
	// setup GLSL program
	var vertexShader = createShaderFromScriptElement(g_WebGL.gl, "2d-vertex-shader");
	var fragmentShader = createShaderFromScriptElement(g_WebGL.gl, "2d-fragment-shader");
	var program = createProgram(g_WebGL.gl, [vertexShader, fragmentShader]);
	g_WebGL.gl.useProgram(program);

	// look up where the vertex data needs to go
	g_Shader.positionLocation = g_WebGL.gl.getAttribLocation(program, "a_position");

	// lookup uniforms
	g_Shader.resolutionLocation = g_WebGL.gl.getUniformLocation(program, "u_resolution");
	g_Shader.colorLocation = g_WebGL.gl.getUniformLocation(program, "u_color");
	g_Shader.translationLocation = g_WebGL.gl.getUniformLocation(program, "u_translation");
	g_Shader.rotationLocation = g_WebGL.gl.getUniformLocation(program, "u_rotation");

	// set the resolution
	g_WebGL.gl.uniform2f(g_Shader.resolutionLocation, g_WebGL.canvas.width, g_WebGL.canvas.height);
}
//initialize buffers with the body.shape's buffer member object
function initBuffers(bodyBuffer) {
	g_WebGL.gl.bindBuffer(g_WebGL.gl.ARRAY_BUFFER, bodyBuffer);
	g_WebGL.gl.enableVertexAttribArray(g_Shader.positionLocation);
	g_WebGL.gl.vertexAttribPointer(g_Shader.positionLocation, 2, g_WebGL.gl.FLOAT, false, 0, 0);
}
//set the color
function setColor(color) {
	g_WebGL.gl.uniform4f(g_Shader.colorLocation, color.red, color.green, color.blue, 1);
}
// Draw the scene.
function drawScene(number_vertices) {
	// Set the translation.
	g_WebGL.gl.uniform2fv(g_Shader.translationLocation, g_WebGL.translation);
	// Set the rotation.
	g_WebGL.gl.uniform2fv(g_Shader.rotationLocation, g_WebGL.rotation);
	// Draw the geometry.
	g_WebGL.gl.drawArrays(g_WebGL.gl.TRIANGLE_FAN, 0, number_vertices);
}
/* ~ WebGL functions*/




function degToRad(n) {
	return (Math.PI / 180) * n;
}



//starts here
function start() {
	initGL();
	initShaders();
	initWorld();
	g_WebGL.canvas.addEventListener("click", fetchCoords, false);
	//add some bodies
	/*addBody(Body(b2Body.b2_dynamicBody, new CircleShape(60.0), new Vector2D(300.0, 500.0), 0, 
		new Vector2D(0.0, 0.0), new Attributes(1.0, 0.5, 0.2), new Color(0.4, 0.5, 0.7)));*/
	addBody(Body(b2Body.b2_dynamicBody, new RectangleShape(25.0, 46.0), new Vector2D(135.0, 150.0), 0.54, 
		new Vector2D(0.0, 0.0), new Attributes(1.0, 0.5, 0.2), new Color(0.3, 0.3, 0.4), "id2"));
	addBody(Body(b2Body.b2_staticBody, new RectangleShape(1000.0, 25.0), new Vector2D(350.0, 10.0), 0, 
		new Vector2D(0.0, 0.0), new Attributes(1.0, 0.5, 0.2), new Color(0.5, 0.6, 0.6), "id1"));
	//setup debug draw
	/*var debugDraw = new b2DebugDraw();
		debugDraw.SetSprite(document.getElementById("canvas").getContext("2d"));
		debugDraw.SetDrawScale(30.0);
		debugDraw.SetFillAlpha(0.5);
		debugDraw.SetLineThickness(1.0);
		debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
		g_Box2D.world.SetDebugDraw(debugDraw);

	window.setInterval(update, 1000 / 60);*/
	
	//Put into the buffer initially, to keep the Box2D world, one frame ahead of what is rendered
	for(i = 0; i < g_Box2D.body_count; i++) {
		g_Box2D.buffer_next[i] = new Buffer(new Vector2D(g_Box2D.bodies[i].position.x, g_Box2D.bodies[i].position.y), g_Box2D.bodies[i].angle);
	}
	update();
	g_WebGL.last_time = new Date().getTime();
	tick(); //start the animation
}
