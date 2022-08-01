#!/usr/bin/env node

'use strict';

const path =  require('path'),
    fs = require('fs');

const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(require('express').static('public'));

server.listen(3000);

var strokes = [];

const STORAGE_PATH = path.join(__dirname, 'paintings');

function ensureStoragePath() {
    fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

ensureStoragePath();

io.sockets.on('connection', function (socket) {
    console.log('new Connection');

    socket.emit('init', strokes);

    socket.on('draw', function (data) {
        strokes.push(data);
        socket.broadcast.emit('draw', data);
    });

    socket.on('color', function (data) {
        socket.broadcast.emit('color', data);
    });

    socket.on('clear', function () {
        console.log('clearing canvas');
        strokes = [];
        socket.broadcast.emit('clear');
    });

    socket.on('save', function () {
        ensureStoragePath();

        const canvasPath = path.join(STORAGE_PATH, Date.now() + '.csv');
        console.log('saving canvas to', canvasPath);
        fs.writeFileSync(canvasPath, strokes.filter(function (s) { return s.x && s.y && s.color; }).map(function (s) { return `${s.x},${s.y},${s.color}`; }).join('\n') + '\n');
    });
});

console.log('Server running on http://localhost:3000');
