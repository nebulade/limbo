#!/usr/bin/env node

'use strict';

const app = require('http').createServer(handler);
const { Server } = require('socket.io');
const fs = require('fs');

var io = new Server(app);

app.listen(3000);

function handler (req, res) {
  fs.readFile(__dirname + '/index.html', function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(data);
  });
}

var users = [];
var strokes = [];

io.sockets.on('connection', function (socket) {
  console.log('new Connection');

	socket.emit('userlist', users);
	socket.emit('init', strokes);

	const name = 'user_'+Math.floor(Math.random()*101);
	users.push(name);
	socket.emit('user', {userid: name});
	io.sockets.emit('user connected', {userid: name});

	socket.on('draw', function(data){
		strokes.push(data);
		socket.broadcast.emit('draw', data);
	});	
	
	socket.on('mousedown', function(data){
		socket.broadcast.emit('mousedown', data);
	});	
	
	socket.on('color', function(data){
		socket.broadcast.emit('color', data);
	});
});