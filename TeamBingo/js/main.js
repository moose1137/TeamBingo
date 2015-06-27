'use strict';

var connections = [];

var startButton = document.getElementById('startSession');
startButton.disabled = false;
startButton.onclick = createPeer;

var sessionID = document.getElementById('sessionID');
var password = document.getElementById('password');
var username = document.getElementById('username');
var colorValue = document.getElementById('color');
var seed = document.getElementById('seed');
//var userList = document.getElementById('userList');

var peer;

function trace(text) {
	console.log((window.performance.now() / 1000).toFixed(3) + ': ' + text);
}

function createPeer() {
	peer = new Peer(sessionID.value, {key: '0wq3bjluay5vcxr'});
	
	peer.on('error', function(err){
		trace(err.type);
		if(err.type == 'unavailable-id'){
			peer.destroy();
			peer = new Peer({key: '0wq3bjluay5vcxr'});
			
			peer.on('error', function(err1){
				trace(err1.type);
				if(err1.type == 'network'){
					peer.reconnect();
				}
			});
			
			peer.on('open', function(id){
				trace('Connected to server');
				createConnection(sessionID.value);
			});
		}else if(err.type == 'network'){
			peer.reconnect();
		}else{
			$("#warning").html(err1.type + " error");
		}
	});
	
	peer.on('open', function(id){
		trace('Connected to server');
		createConnection(sessionID.value);
	});
	
	bingosetup(seed.value, colorValue.value);
	
	$("#userList").html("<div class=\"" + colorValue.value + "List\">" + username.value + "</div>");
	
	sessionID.disabled = true;
	password.disabled = true;
	username.disabled = true;
	colorValue.disabled = true;
	seed.disabled = true;
	startButton.disabled = true;
}

function createConnection(id){
	peer.on('connection', function(conn){
		newConnection(conn);
	});

	if(id != peer.id){
		newConnection(peer.connect(id, {"reliable": true}));
	}
	
	trace('Joined session: ' + id);
}

function newConnection(conn){
	conn.on('data', function(data){
		receiveData(data);
	});
	
	conn.on('error', function(err){
		trace(err.type);
	});

	conn.on('open', function(){
		var flag = true;
	
		//Prevents duplicate bug, not sure what the cause is
		for(var i = 0; i < connections.length; i++){
			if(connections[i].conn.peer == this.peer){
				flag = false;
			}
		}
	
		if(flag){
		var user;
			if(peer.id == sessionID.value){
				user = {"accepted": false, "conn": conn};
			}else{
				sendSelfInfo(conn);
				
				user = {"accepted": true, "conn": conn};
				
				
			}
			
			connections.push(user);
			
			trace('Connection created: ' + conn.peer);
		}
	});
}

function sendSelfInfo(conn){
	var jsonObject = {"messageType": "selfInfo", "username": username.value,
		"password": CryptoJS.SHA1(password.value).toString(CryptoJS.enc.Hex), "color": colorValue.value,
		"seed": seed.value, "id": peer.id};
	
	var jsonString = JSON.stringify(jsonObject);
	
	conn.send(jsonString);
	
	trace('Sent self info to: ' + conn.peer);
}

function sendConnections(conn) {
	if(connections.length > 0){
	
		var jsonObject = {"messageType": "connections", "ids": []};
		for(var i = 0; i < connections.length; i++){
			if(connections[i].active == true){
				jsonObject.ids.push(connections[i].conn.peer);
			}
		}
		
		var jsonString = JSON.stringify(jsonObject);
		
		conn.send(jsonString);
		
		trace('Sent data to: ' + conn.peer);
	}
}

function sendChange(square, color){
	if(connections.length > 0){
		var jsonObject = {"messageType": "change", "square": square, "color": color};
		var jsonString = JSON.stringify(jsonObject);
		
		for(var i = 0; i < connections.length; i++){
			if(connections[i].active == true){
				connections[i].conn.send(jsonString);
			}
		}
		
		trace('Sent change to all');
	}
}

function sendDenial(conn, reason){
	var jsonObject = {"messageType": "deniedAccess", "reason":  reason};
	var jsonString = JSON.stringify(jsonObject);
	
	conn.send(jsonString);
	
	trace('Sent denial ' + reason + ' to: ' + conn.peer);
}

function receiveData(data){
	var jsonObject = JSON.parse(data);
	
	if(jsonObject.messageType == "connections"){
		for(var i = 0; i < jsonObject.ids.length; i++){
			if(jsonObject.ids[i] != peer.id){
				createConnection(jsonObject.ids[i]);
			}
		}
	}else if(jsonObject.messageType == "selfInfo"){
		for(var i = 0; i < connections.length; i++){
			if(connections[i].conn.peer == jsonObject.id && connections[i].username === undefined){
				if(jsonObject.password != CryptoJS.SHA1(password.value)){
					sendDenial(connections[i].conn, "Incorrect Password");
					var conn = connections[i].conn;
					connections.splice(i, 1);
					setTimeout(function(){conn.close();}, 1000);
					break;
				}
				if(jsonObject.seed != seed.value){
					sendDenial(connections[i].conn, "Incorrect Seed");
					var conn = connections[i].conn;
					connections.splice(i, 1);
					setTimeout(function(){conn.close();}, 1000);
					break;
				}
				
				connections[i].username = jsonObject.username;
				connections[i].color = jsonObject.color;
				connections[i].active = true;
				
				if(peer.id == sessionID.value){
					sendSelfInfo(connections[i].conn);
					sendConnections(connections[i].conn);
				}
				
				$("#userList").html($("#userList").html() + "<div class=\"" + jsonObject.color + "List\">" + jsonObject.username + "</div>");
				
				trace('password accepted: ' + connections[i].conn.peer);
				break;
			}
		}
	}else if(jsonObject.messageType == "deniedAccess"){
		connections[0].conn.close;
		
		$("#warning").html(jsonObject.reason);
		trace('Denied Access: ' + jsonObject.reason);
	}else if(jsonObject.messageType == "change"){
		if($("#" + jsonObject.square).hasClass(jsonObject.color)){
			$("#" + jsonObject.square).removeClass(jsonObject.color).addClass("blacksquare");
		}else if($("#" + jsonObject.square).hasClass("blacksquare")){
			$("#" + jsonObject.square).removeClass("blacksquare").addClass(jsonObject.color);
		}
		
		trace("Recieved change: " + jsonObject.square);
	}
}