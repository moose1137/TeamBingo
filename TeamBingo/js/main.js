'use strict';

/* globals webkitRTCPeerConnection */


var connections = [];

var startButton = document.getElementById('startSession');
startButton.disabled = false;
startButton.onclick = createPeer;

var sessionID = document.getElementById('sessionID');
var password = document.getElementById('password');
var username = document.getElementById('username');
var seed = document.getElementById('seed');

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
			
			peer.on('open', function(id){
				trace('Connected to server');
				createConnection(sessionID.value);
			});
		}
	});
	
	peer.on('open', function(id){
		trace('Connected to server');
		createConnection(sessionID.value);
	});
	
	startButton.disabled = true;
}

function createConnection(id){
	peer.on('connection', function(conn){
		newConnection(conn);
	});

	if(id != peer.id){
		newConnection(peer.connect(id));
	}
	
	trace('Joined session: ' + id);
}

function newConnection(conn){
	conn.on('data', function(data){
		receiveData(data);
	});

	conn.on('open', function(){
		sendConnections(conn);
		
		connections.push(conn);
		
		trace('Connection created: ' + conn.peer);
	});
}

function sendConnections(connection) {
	if(connections.length > 0){
	
		var jsonObject = {"messageType": "connections", "ids": []};
		for(var i = 0; i < connections.length; i++){
			jsonObject.ids.push(connections[i].peer);
		}
		
		var jsonString = JSON.stringify(jsonObject);
	
		connection.send(jsonString);
		
		trace('Sent data to: ' + connection.peer);
	}
}

function sendChange(square, color){
	if(connections.length > 0){
		var jsonObject = {"messageType": "change", "square": square, "color": color};
		var jsonString = JSON.stringify(jsonObject);
		
		for(var i = 0; i < connections.length; i++){
			connections[i].send(jsonString);
		}
		
		trace('Sent change to all');
	}
}

function receiveData(data){
	var jsonObject = JSON.parse(data);
	
	if(jsonObject.messageType == "connections"){
		for(var i = 0; i < jsonObject.ids.length; i++){
			var idExists = false;
			for(var j = 0; j < connections.length; j++){
				if(jsonObject.ids[i] == connections[j].peer){
					idExists = true;
					break;
				}
			}
			
			if(!idExists){
				createConnection(jsonObject.ids[i]);
			}
		}
	}else if(jsonObject.messageType == "change"){
		if(jsonObject.color == "green"){
			$("#" + jsonObject.square).addClass("greensquare");
		}else if(jsonObject.color == "red"){
			$("#" + jsonObject.square).addClass("redsquare").removeClass("greensquare");
		}else if(jsonObject.color == "black"){
			$("#" + jsonObject.square).removeClass("redsquare");
		}
		
		trace("Recieved change: " + jsonObject.square);
	}
}