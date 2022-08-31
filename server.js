#!/usr/bin/env node

'use strict';

const path =  require('path'),
    fs = require('fs');

const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const printer = require('./printer.js');

app.use(require('express').static('public'));

server.listen(3000);

var strokes = [];
var state = {
    a: {
        done: false
    },
    b: {
        done: false
    }
};

var colors = [];
colors[0] = '255,255,255';

colors[11] = '255,0,0';
colors[12] = '255,100,255';
colors[13] = '255,83,237';
colors[14] = '255,28,36';
colors[15] = '255,200,7';

colors[21] = '0,255,0';
colors[22] = '255,100,255';
colors[23] = '28,255,237';
colors[24] = '237,255,36';
colors[25] = '39,255,7';

var questions = [{
    en: '',
    de: ''
}, {
    en: '',
    de: ''
}];

const STORAGE_PATH = path.join(__dirname, 'paintings');

function ensureStoragePath() {
    fs.mkdirSync(path.join(STORAGE_PATH, 'csv'), { recursive: true });
    fs.mkdirSync(path.join(STORAGE_PATH, 'pdf'), { recursive: true });
}

ensureStoragePath();

io.sockets.on('connection', function (socket) {
    console.log('new Connection');

    socket.emit('init', { state, strokes, colors });

    socket.on('draw', function (data) {
        strokes.push(data);
        socket.broadcast.emit('draw', data);
    });

    socket.on('clear', function () {
        console.log('clearing canvas');
        strokes = [];
        io.emit('clear');
    });

    socket.on('done', function (data) {
        console.log('Done', data);

        state[data.client].done = true;

        console.log('new state', state);

        if (state.a.done && state.b.done) {
            setTimeout(function () {
                console.log('All done, trigger printing now!');

                io.emit('printing', {});

                const canvasPath = path.join(STORAGE_PATH, 'csv', Date.now() + '.csv');
                const pdfPath = path.join(STORAGE_PATH, 'pdf', Date.now() + '.pdf');
                console.log(`saving to ${canvasPath} and ${pdfPath}`);

                const filteredStrokes = strokes.filter(function (s) {
                    return s.x && s.y && typeof s.d !== 'undefined' && typeof s.color !== 'undefined' && s.brush;
                });

                fs.writeFileSync(canvasPath, filteredStrokes.map(function (s) { return `${s.x},${s.y},${s.d},${s.color},${s.brush}`; }).join('\n') + '\n');
                printer.print(colors, filteredStrokes, pdfPath);

                setTimeout(function () {
                    console.log('printing done, reset all clients');
                    state.a.done = false;
                    state.b.done = false;
                    strokes = [];

                    io.emit('reset', {});
                }, 2000);
            }, 1000);
        }
    });
});

console.log('Server running on http://localhost:3000');
