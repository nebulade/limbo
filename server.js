#!/usr/bin/env node

'use strict';

const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(require('express').static('.'));

server.listen(3000);

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