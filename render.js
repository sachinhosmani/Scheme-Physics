/*Global Objects*/
var g_Box2D = {
	world : undefined ,
	scale : 20.0 ,
	body_count : 0 ,
	time_step : 16.6666 ,//in milliseconds
	bodies : [] , //holds body objects
	force_bodies : [] , //holds body objects which are scheduled to be applied force
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
	angle : 0
};
var g_Helper = {};
/* ~ Global Objects*/
g_WebGL.shader = {
	positionLocation : undefined ,
	resolutionLocation : undefined ,
	colorLocation : undefined ,
	translationLocation : undefined ,
	rotationLocation : undefined
};




$(document).ready(function() {
	start();
});

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





/*Box2D helper functions*/
//find the body of given id
g_Box2D.findBodyIndex = function(id) {
	for(var i = 0; i < g_Box2D.body_count; i++)
		if(g_Box2D.bodies[i].id() == id)
			return i;
	return undefined;
};
//maps g_Box2D.bodies array with g_Box2D.world.GetBodyList()
g_Box2D.bodyMap = function(id) {
	for(var i = 0; i < g_Box2D.body_count; i++)
		if(g_Box2D.bodies[i].id() == id)
			return g_Box2D.bodies[i].box2DBody;
	return undefined;
};
//finds a body, if any, at a given pos
g_Box2D.findBodyAt = function(pos) {
	for(var i = 0; i < g_Box2D.body_count; i++) {
		if(g_Box2D.bodies[i].contains(pos))
			return g_Box2D.bodies[i];
	}
	return undefined;
};
g_Box2D.removeBody = function(id) {
	var r_i = g_Box2D.findBodyIndex(id);
	if(r_i === undefined) {
		return; //if not found
	}
	g_Box2D.world.DestroyBody(g_Box2D.bodies[r_i].box2DBody);
	g_Box2D.bodies.splice(r_i, 1);
	g_Box2D.buffer_prev.splice(r_i, 1);
	g_Box2D.buffer_next.splice(r_i, 1);
	g_Box2D.body_count--;
};
//apply impulse on body, at point
g_Box2D.applyImpulse = function(id, impulse, point) {
	var i_body = g_Box2D.bodyMap(id); //find the mapped box2D body of that id
	if(i_body === undefined) {
		return;
	}
	if(impulse === undefined) {
		return;
	}
	if(point === undefined) {
		point = i_body.GetWorldCenter();
	}
	else {
		point = new b2Vec2(point.x/g_Box2D.scale, point.y/g_Box2D.scale);
	}
	i_body.ApplyImpulse(new b2Vec2(impulse.x/g_Box2D.scale, impulse.y/g_Box2D.scale), point);
};
//apply a force on body for time milliseconds
g_Box2D.applyForce = function(id, force, time) {
	var f_body = g_Box2D.bodies[g_Box2D.findBodyIndex(id)]; //find the body
	if(f_body === undefined) {
		return;
	}
	if(force === undefined) {
		return;
	}
	if(!g_Helper.liesIn(time, g_Box2D.time_step, Infinity)) { //ensure time's limits
		time = g_Box2D.time_step;
	}
	if(f_body.forces === undefined) {
	//create an object as a property of the body at hand which
	//stores a list of forces to act on it and how much longer each force must last
		f_body.forces = {
			force_list : [] ,
			time_left : []
		};
	}
	f_body.forces.force_list.push(force); //push the new force
	f_body.forces.time_left.push(time); //force has to act for time more milliseconds
	g_Box2D.force_bodies.push(f_body); //push the body for force application (during world steps)
};
g_Box2D.getBodyList = function() { //get a list of bodies' ids
	var body_list = [];
	for(var i = 0; i < g_Box2D.body_count; i++)
		body_list.push(g_Box2D.bodies[i].id());
	return body_list;
};
/* ~ Box2D helper functions*/





/* Types*/
g_Box2D.circleShape = function(radius) { //circle shape constructor
	var shape = {
		type : "Circle" ,
		radius : radius ,
		number_vertices : function() {
			return 60;
		} ,
		getVertices : function() {
			var vertices = [];
			for(i = 1; i <= this.number_vertices(); i++) {
				vertices.push(this.radius * Math.cos(g_Helper.degToRad(6*i)));
				vertices.push(this.radius * Math.sin(g_Helper.degToRad(6*i)));
			}
			return vertices;
		} ,
		buffer : g_WebGL.gl.createBuffer()
	};
	g_WebGL.setup(shape);
	return shape;
}
g_Box2D.rectangleShape = function(width, height) { //rectangle shape
	var shape = {
		type : "Polygon" , //still a polygon
		width : width ,
		height : height ,
		vertices : [g_Box2D.vector2D(width/2, height/2),
			g_Box2D.vector2D(-width/2, height/2),
			g_Box2D.vector2D(-width/2, -height/2),
			g_Box2D.vector2D(width/2, -height/2)] ,
		number_vertices : function() {
			return 4;
		} ,
		getVertices : function() {
			var vertices = [];
			for(var i = 0; i < this.number_vertices(); i++) {
				vertices.push(this.vertices[i].x, this.vertices[i].y);
			}
			return vertices;
		} ,
		buffer : g_WebGL.gl.createBuffer()
	};
	g_WebGL.setup(shape);
	return shape;
}
g_Box2D.polygonShape = function(vertices) { //polygon shape
	var mid_point = g_Helper.midPoint(vertices);
	//make sure vertices are in anti-clockwise order (Box2D constraint)
	var makeAntiClockwise = function(p_vertices, ref_point) {
		p_vertices.sort(function(a, b) {
			return a.angle(ref_point) - b.angle(ref_point);
		});
	};
	var vertices2 = vertices.copy();
	makeAntiClockwise(vertices2, mid_point);
	var shape = {
		type :"Polygon" ,
		vertices : vertices2 ,
		number_vertices : function() {
			return this.vertices.length;
		} ,
		getVertices : function() {
			var vertices = [];
			for(var i = 0; i < this.number_vertices(); i++) {
				vertices.push(this.vertices[i].x, this.vertices[i].y);
			}
			return vertices;
		} ,
		buffer : g_WebGL.gl.createBuffer()
	};
	g_WebGL.setup(shape);
	return shape;
}
g_Box2D.color = function(red, green, blue) {
	return {
		red : g_Helper.liesIn(red, 0, 1) ? red : 0.5 ,
		green : g_Helper.liesIn(green, 0, 1) ? green : 0.5 ,
		blue : g_Helper.liesIn(blue, 0, 1) ? blue : 0.5
	};
}
g_Box2D.vector2D = function(x, y) { //2D vector
	return {
		x : typeof x === "number" ? x : 0 ,
		y : typeof y === "number" ? y : 0 ,
		mag : function() {
			return Math.sqrt(this.x * this.x + this.y * this.y)
		} ,
		add : function(p_vector) {
			return g_Box2D.vector2D(p_vector.x + this.x, p_vector.y + this.y);
		} ,
		sub : function(p_vector) {
			return g_Box2D.vector2D(this.x - p_vector.x, this.y - p_vector.y);
		} ,
		//distance from p_vector
		dist : function(p_vector) {
			return (this.sub(p_vector)).mag();
		} ,
		//angle wrt a vertex
		angle : function(vertex) {
			var to2PI = function(p_angle) {
				if(p_angle < 0) {
					return 2 * Math.PI + p_angle; //so that angle lies in [0, 2 * PI)
				}
				return p_angle;
			};
			if(vertex !== undefined) {
				return to2PI(Math.atan2((this.y - vertex.y), (this.x - vertex.x)));
			}
			else {
				return to2PI(Math.atan2(this.y, this.x));
			}
		} ,
		//rotate through angle
		rotate : function(angle) {
			return g_Box2D.vector2D(this.x * Math.cos(angle) - this.y * Math.sin(angle),
				this.x * Math.sin(angle) + this.y * Math.cos(angle));
		}
	};
}
g_Box2D.attributes = function(density, friction, restitution) { //holds attributes of a body
	return { 
		density : g_Helper.liesIn(density, 0, Infinity) ? density : 0.5 ,
		friction : g_Helper.liesIn(friction, 0, Infinity) ? friction : 0.5 ,
		restitution : g_Helper.liesIn(restitution, 0, 1) ? restitution : 0.5
	};
};
g_Box2D.createBody = function(p_type, p_shape, p_position, p_angle, p_velocity, p_attributes, p_color, p_id) { //body container
	var body = {
		type : function() {
			return p_type !== undefined ? p_type : b2Body.b2_dynamicBody;
		} ,
		shape : p_shape ,
		position : p_position ,
		angle : p_angle ,
		velocity : p_velocity ,
		attributes : p_attributes ,
		color : p_color !== undefined ? p_color : color ,
		id : function() {
			return p_id !== undefined ? p_id : g_Box2D.body_count;
		} ,
		/*forces : { this will be created when a force is applied on a body
			force_list : [] ,
			total_time : [] ,
			time_left : []
		} ,*/
		//tells if 'pos' lies inside the shape
		contains : function(pos) {
			switch(this.shape.type) {
				case "Circle" :
					return pos.dist(this.position) <= this.shape.radius ? 1 : 0;
					break;
				case "Polygon" :
					var vertices = this.shape.vertices.copy(); //clone the vertices property
					for(var i = 0; i < vertices.length; i++) {
						vertices[i] = vertices[i].rotate(this.angle);
						vertices[i] = vertices[i].add(this.position);
					}
					var pole = g_Helper.midPoint(vertices); //pole vertex
					
					/*vertices.sort(function(a, b) {
						return a.angle(pole) - b.angle(pole);
					});
					var v1, v2; //pos lies in sector formed by lines (v1, pole) and (v2, pole)
					for(var i = 0; i < vertices.length; i++) {
						if(vertices[i].angle(pole) >= pos.angle(pole)) {
							v1 = vertices[i];
							v2 = vertices[(i === 0) ? vertices.length - 1 : 0];
							console.log(i+" "+vertices[i].angle(pole));
							break;
						}
					}*/
					
					//returns if p1 and p2 lie on the same side of line formed by lp1 and lp2
					var sameSide = function(p1, p2, lp1, lp2) {
						//substitutes point into the equation of line formed by points lp1, lp2
						var eq = function(lp1, lp2, point) {
							return (lp2.y - lp1.y) * point.x -
								(lp2.x - lp1.x) * point.y -
								(lp2.y - lp1.y) * lp1.x +
								(lp2.x - lp1.x) * lp1.y;
						};
						if(!(p1 && p2 && lp1 && lp2)) return 0;
						return eq(lp1, lp2, p1) * eq(lp1, lp2, p2) > 0;
					}
					//if they are on the same side, it is an interior point
					for(var i = 0; i < vertices.length; i++) {
						if(!sameSide(pole, pos, vertices[i], vertices[(i+1)%vertices.length])) {
							return 0;
						}
					}
					return 1;
					break;
				default :
					return 0;
			}
		} ,
		add : function() { //add this body to the Box2D world
			var bodyDef = new b2BodyDef;
			bodyDef.type = this.type();
			bodyDef.position.Set(this.position.x/g_Box2D.scale, this.position.y/g_Box2D.scale);
			bodyDef.angle = this.angle;
			var fixDef = new b2FixtureDef;
			fixDef.density = this.attributes.density;
			fixDef.friction = this.attributes.friction;
			fixDef.restitution = this.attributes.restitution;
			switch(this.shape.type) {
				case "Polygon" :
					fixDef.shape = new b2PolygonShape;
					var vertices = [];
					for(var i = 0; i < this.shape.number_vertices(); i++) {
						//convert the vertices into a form Box2D accepts
						vertices.push(new b2Vec2(this.shape.vertices[i].x/g_Box2D.scale, this.shape.vertices[i].y/g_Box2D.scale));
					}
					fixDef.shape.SetAsArray(vertices, this.shape.number_vertices());
					break;
				case "Circle" :
					fixDef.shape = new b2CircleShape(this.shape.radius/g_Box2D.scale);
				 	break;
			}
			g_Box2D.world.CreateBody(bodyDef).CreateFixture(fixDef);
			g_Box2D.bodies.push(this);
			g_Box2D.body_count++;
			
			//a reference to the corresponding "Box2D" type body (a mapping) is added as a property
			this.box2DBody = g_Box2D.world.GetBodyList();
			
			if(this.velocity !== undefined) {
				//set the initial velocity
				this.box2DBody.SetLinearVelocity(new b2Vec2(this.velocity.x/g_Box2D.scale, this.velocity.y/g_Box2D.scale));
			}
		}
	};
	if(body.shape.type === "Circle") {
	//Circles need to have an axis drawn on them, to show their angle
	//so, create a triangle shape as a property of the body, so that it can also be rendered
		body.axisShape = g_Box2D.polygonShape([g_Box2D.vector2D(0, 0), g_Box2D.vector2D(body.shape.radius * Math.cos(body.angle)
		, body.shape.radius * Math.sin(body.angle)), g_Box2D.vector2D(body.shape.radius * Math.cos(body.angle + 0.1)
		, body.shape.radius * Math.sin(body.angle + 0.1))]);
	}
	return body;
}
g_WebGL.buffer = function(position, angle) {
	return {
		position : position ,
		angle : angle
	};
}
/* ~ Types*/





/*Box2D functions*/
g_Box2D.initWorld = function() { //initializes the world
	g_Box2D.world = new b2World(
		new b2Vec2(0, -20)    //gravity
		,  true                 //allow sleep
	);
};
g_Box2D.update = function() {
	//apply forces on all bodies in force_bodies
	var tmp = g_Box2D.force_bodies;
	for(var i = 0; i < tmp.length; ) {
		//for every body that needs force application
		for(var j = 0; tmp[i].forces !== undefined && j < tmp[i].forces.force_list.length; ) {
			//for every force that is to applied to this body
			if(tmp[i].forces.time_left[j] > g_Box2D.time_step) {
				//apply the force only if there is still time left
				tmp[i].box2DBody.ApplyForce(new b2Vec2(tmp[j].forces.force_list[j].x/g_Box2D.scale, 
					tmp[j].forces.force_list[j].y/g_Box2D.scale), tmp[i].box2DBody.GetWorldCenter());
				tmp[i].forces.time_left[j] -= new Date().getTime() - g_WebGL.last_time;
				j++;
			}
			else {
				//force's time is over and can now be removed
				tmp[i].forces.force_list.splice(j, 1);
				tmp[i].forces.time_left.splice(j, 1);
			}
		}
		if(j === 0) {
			//no force was found for this body, and the forces property can be removed
			delete tmp[i].forces;
			//the body is removed from the array
			tmp.splice(i, 1);
		}
		else {
			i++;
		}
	}
	
	//step the world
	g_Box2D.world.Step(
		g_Box2D.time_step/1000   // 1 / frame-rate
		,  10      //velocity iterations
		,  10       //position iterations
	);
	
	//update the new parameters in buffers
	var b_list = g_Box2D.world.GetBodyList();
	g_Box2D.buffer_prev = g_Box2D.buffer_next;
	for(var i = 0; i < g_Box2D.body_count; i++) {
		g_Box2D.buffer_next[g_Box2D.body_count - i - 1] = g_WebGL.buffer(g_Box2D.vector2D(b_list.GetPosition().x * g_Box2D.scale, b_list.GetPosition().y * g_Box2D.scale), b_list.GetAngle());
		b_list = b_list.m_next;
	}
	//g_Box2D.world.DrawDebugData();
	g_Box2D.world.ClearForces();
};
/* ~ Box2D functions*/






/*WebGL helper functions */
//puts the vertices of the shape into the buffer object of shape (to be done once during init)
g_WebGL.setup = function(shape) {
	var vertices = shape.getVertices();
	g_WebGL.gl.bindBuffer(g_WebGL.gl.ARRAY_BUFFER, shape.buffer);
	g_WebGL.gl.bufferData(
		g_WebGL.gl.ARRAY_BUFFER,
		new Float32Array(vertices),
		g_WebGL.gl.STATIC_DRAW);
}
//update the shader's variables with updated values
g_WebGL.animate = function(body) {
	g_WebGL.translation[0] = body.position.x;
	g_WebGL.translation[1] = body.position.y;
	g_WebGL.angle = body.angle;
	g_WebGL.rotation[0] = Math.sin(-g_WebGL.angle);
	g_WebGL.rotation[1] = Math.cos(-g_WebGL.angle);
}

/*Physics world is updated at constant time intervals.
If the screen is painted any sooner, the bodies' parameters should be interpolated.*/
g_WebGL.interpolate = function(time_diff) {
	var t = time_diff/g_Box2D.time_step;
	if(t > 1) t = 1; //should not happen (tick() should get called within 1/60 s each time)
	for(i = 0; i < g_Box2D.body_count; i++) {
		g_Box2D.bodies[i].position.x = (1-t) * g_Box2D.bodies[i].position.x + t * g_Box2D.buffer_next[i].position.x;
		g_Box2D.bodies[i].position.y = (1-t) * g_Box2D.bodies[i].position.y + t * g_Box2D.buffer_next[i].position.y;
		g_Box2D.bodies[i].angle = (1-t) * g_Box2D.bodies[i].angle + t * g_Box2D.buffer_next[i].angle;
	}
}

g_WebGL.tick = function() {
	requestAnimFrame(g_WebGL.tick);
	g_WebGL.gl.clear(g_WebGL.gl.COLOR_BUFFER_BIT);
	for(i = 0; i < g_Box2D.body_count; i++) {
		g_WebGL.setColor(g_Box2D.bodies[i].color);
		g_WebGL.initBuffers(g_Box2D.bodies[i].shape.buffer);
		g_WebGL.animate(g_Box2D.bodies[i]);
		g_WebGL.drawScene(g_Box2D.bodies[i].shape.number_vertices());
		if(g_Box2D.bodies[i].axisShape !== undefined) {
		//If the body has an axisShape property (is a circle), draw the axis
			g_WebGL.setColor(g_Box2D.color(0, 0, 0)); //set color to black (by default)
			g_WebGL.initBuffers(g_Box2D.bodies[i].axisShape.buffer);
			g_WebGL.drawScene(g_Box2D.bodies[i].axisShape.number_vertices());
		}
	}
	var time_now = new Date().getTime();
	var dt = time_now - g_WebGL.last_time;
	g_WebGL.physicsDt += dt;
	if(g_WebGL.physicsDt >= g_Box2D.time_step) {
		g_Box2D.update();
		g_WebGL.physicsDt -= g_Box2D.time_step;
	}
	g_WebGL.interpolate(g_WebGL.physicsDt);
	g_WebGL.last_time = time_now;
}
/* ~ WebGL helper functions*/



/*WebGL functions*/
g_WebGL.initGL = function() {
	// Get A WebGL context
	g_WebGL.canvas = document.getElementById("canvas");
	g_WebGL.gl = getWebGLContext(g_WebGL.canvas);
	if (!g_WebGL.gl) {
		alert("WebGL init fail");
	}
}
//initialize shaders
g_WebGL.initShaders = function() {
	// setup GLSL program
	var vertexShader = createShaderFromScriptElement(g_WebGL.gl, "2d-vertex-shader");
	var fragmentShader = createShaderFromScriptElement(g_WebGL.gl, "2d-fragment-shader");
	var program = createProgram(g_WebGL.gl, [vertexShader, fragmentShader]);
	g_WebGL.gl.useProgram(program);

	// look up where the vertex data needs to go
	g_WebGL.shader.positionLocation = g_WebGL.gl.getAttribLocation(program, "a_position");

	// lookup uniforms
	g_WebGL.shader.resolutionLocation = g_WebGL.gl.getUniformLocation(program, "u_resolution");
	g_WebGL.shader.colorLocation = g_WebGL.gl.getUniformLocation(program, "u_color");
	g_WebGL.shader.translationLocation = g_WebGL.gl.getUniformLocation(program, "u_translation");
	g_WebGL.shader.rotationLocation = g_WebGL.gl.getUniformLocation(program, "u_rotation");

	// set the resolution
	g_WebGL.gl.uniform2f(g_WebGL.shader.resolutionLocation, g_WebGL.canvas.width, g_WebGL.canvas.height);
}
//initialize buffers with the body.shape's buffer member object
g_WebGL.initBuffers = function(bodyBuffer) {
	g_WebGL.gl.bindBuffer(g_WebGL.gl.ARRAY_BUFFER, bodyBuffer);
	g_WebGL.gl.enableVertexAttribArray(g_WebGL.shader.positionLocation);
	g_WebGL.gl.vertexAttribPointer(g_WebGL.shader.positionLocation, 2, g_WebGL.gl.FLOAT, false, 0, 0);
}
//set the color
g_WebGL.setColor = function(color) {
	g_WebGL.gl.uniform4f(g_WebGL.shader.colorLocation, color.red, color.green, color.blue, 1);
}
// Draw the scene.
g_WebGL.drawScene = function(number_vertices) {
	// Set the translation.
	g_WebGL.gl.uniform2fv(g_WebGL.shader.translationLocation, g_WebGL.translation);
	// Set the rotation.
	g_WebGL.gl.uniform2fv(g_WebGL.shader.rotationLocation, g_WebGL.rotation);
	// Draw the geometry.
	g_WebGL.gl.drawArrays(g_WebGL.gl.TRIANGLE_FAN, 0, number_vertices);
}
/* ~ WebGL functions*/




g_Helper.degToRad = function(n) {
	return (Math.PI / 180) * n;
}
//checks if num is a number and a <= num <= b
g_Helper.liesIn = function(num, a, b) {
	if(typeof num === "number" && (num >= a && num <= b)) return 1;
	else return 0;
}
Object.prototype.copy = function() {
	var F = function() {};
	F.prototype = this;
	return new F();
};
//finds mid-point of p_vertices
g_Helper.midPoint = function(p_vertices) {
	var sum1 = 0, sum2 = 0;
	for(var i = 0; i < p_vertices.length; i++) {
		sum1 += p_vertices[i].x;
		sum2 += p_vertices[i].y;
	}
	return g_Box2D.vector2D(sum1/p_vertices.length, sum2/p_vertices.length);
};

	
	


//starts here
function start() {
	g_WebGL.initGL();
	g_WebGL.initShaders();
	g_Box2D.initWorld();
	g_WebGL.canvas.addEventListener("mousedown", g_Helper.fetchMouseDown, false);
	g_WebGL.canvas.addEventListener("mouseup", g_Helper.fetchMouseUp, false);
	g_WebGL.canvas.addEventListener("mousemove", g_Helper.fetchMoveCoords, false);
	g_WebGL.canvas.addEventListener("keydown", g_Helper.fetchKeyDown, false);
	g_WebGL.canvas.addEventListener("keyup", g_Helper.fetchKeyUp, false);
	//add some bodies
	(g_Box2D.createBody(b2Body.b2_dynamicBody, g_Box2D.rectangleShape(25.0, 46.0), g_Box2D.vector2D(135.0, 150.0), 0.54, g_Box2D.vector2D(10.0, 0.0), g_Box2D.attributes(1.0, 0.5, 0.2), g_Box2D.color(1.0, 0.5, 0.0), "id2")).add();
	(g_Box2D.createBody(b2Body.b2_staticBody, g_Box2D.rectangleShape(1000.0, 25.0), g_Box2D.vector2D(350.0, 10.0), 0, g_Box2D.vector2D(0.0, 0.0), g_Box2D.attributes(1.0, 0.5, 0.2), g_Box2D.color(0.2, 0.5, 1.0), "id1")).add();
	(g_Box2D.createBody(b2Body.b2_dynamicBody, g_Box2D.polygonShape([g_Box2D.vector2D(30.0, 30.0), g_Box2D.vector2D(-30.0, 30.0), g_Box2D.vector2D(-10.0, -17.0)]), g_Box2D.vector2D(370.0, 300.0), 0.5, g_Box2D.vector2D(-20.0, 0.0), g_Box2D.attributes(1.0, 0.5, 0.2), g_Box2D.color(0.75, 0.2, 0.5), "id3")).add();
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
		g_Box2D.buffer_next[i] = g_WebGL.buffer(g_Box2D.vector2D(g_Box2D.bodies[i].position.x, g_Box2D.bodies[i].position.y), g_Box2D.bodies[i].angle);
	}
	g_Box2D.update();
	g_WebGL.last_time = new Date().getTime();
	g_WebGL.tick(); //start the animation
}
