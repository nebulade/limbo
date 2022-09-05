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

const STORAGE_PATH = path.join(process.env.CLOUDRON ? '/app/data/' : __dirname, 'paintings');
fs.mkdirSync(path.join(STORAGE_PATH, 'csv'), { recursive: true });
fs.mkdirSync(path.join(STORAGE_PATH, 'pdf'), { recursive: true });

const colors = [];
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

let currentQuestionIndex = 0;
let question = null;
const questions = [];
const rawQuestions = fs.readFileSync(path.join(__dirname, 'questions.txt'), 'utf8').split('\n');
for (let i = 0; i < rawQuestions.length; i += 3) {
    questions.push({
        de: rawQuestions[i],
        en: rawQuestions[i+1],
        hit: false
    });
}

function getRandomDifferent(arr, last) {
    let num = 0;
    do {
        num = Math.floor(Math.random() * arr.length);
    } while (num === last);

    return num;
}

function setNextQuestion() {
    currentQuestionIndex = getRandomDifferent(questions, currentQuestionIndex);
    question = questions[currentQuestionIndex];
    question.hit = true;
    console.log('next question: ', currentQuestionIndex);
}
setNextQuestion();

// random question tester
// var i = 0;
// while (!questions.every(function (q) { return q.hit; })) {
//     console.log(currentQuestionIndex, 'after', i++);
//     setNextQuestion();
// }

io.sockets.on('connection', function (socket) {
    console.log('new Connection');

    socket.emit('init', { state, strokes, colors, question });

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

                fs.writeFileSync(canvasPath, strokes.map(function (s) { return `${s.x0},${s.y0},${s.x1},${s.y1},${s.d},${s.color},${s.brush}`; }).join('\n') + '\n');

                printer.print(colors, strokes, pdfPath, function () {
                    console.log('printing done, reset all clients');

                    state.a.done = false;
                    state.b.done = false;
                    strokes = [];

                    setNextQuestion();

                    io.emit('reset', { question });
                });
            }, 1000);
        }
    });
});

console.log('Server running on http://localhost:3000');
