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
colors[0] = '#ffffff';

colors[10] = '#d3d3d3';
colors[11] = '#0444b2';
colors[12] = '#05ff19';
colors[13] = '#d8bf03';
colors[14] = '#e3c7a0';
colors[15] = '#603e22';
colors[16] = '#8d73fa';
colors[17] = '#ff07fe';
colors[18] = '#ff9002';
colors[19] = '#bc0605';

colors[20] = '#878787';
colors[21] = '#73eff9';
colors[22] = '#208235';
colors[23] = '#f4ff0a';
colors[24] = '#d8d4a4';
colors[25] = '#6c6038';
colors[26] = '#9c02ff';
colors[27] = '#fcb4f3';
colors[28] = '#ac4906';
colors[29] = '#fc3812';

let currentQuestionIndex = 0;
let question = null;
const questions = [];
const rawQuestions = fs.readFileSync(path.join(__dirname, 'questions.txt'), 'utf8').split('\n');
let questionNr = 1;
for (let i = 0; i < rawQuestions.length; i += 3) {
    questions.push({
        nr: questionNr++,
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
    console.log('next question:', currentQuestionIndex);
}
setNextQuestion();

let drawingNr = 0;
try {
    drawingNr = parseInt(fs.readFileSync(path.join(process.env.CLOUDRON ? '/app/data/' : __dirname, 'drawing.nr'), 'utf8'));
} catch (e) {
    console.error('No drawing nr file found. Starting with 0.', e);
}
console.log('Drawings already counted:', drawingNr);
function advanceDrawingNr() {
    drawingNr++;

    try {
        fs.writeFileSync(path.join(__dirname, 'drawing.nr'), String(drawingNr), 'utf8');
    } catch (e) {
        console.error('Failed to stash drawing nr.', e);
    }
}

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

        io.emit('state', { state });

        if (state.a.done && state.b.done) {
            setTimeout(function () {
                console.log('All done, trigger printing now!');

                io.emit('printing', {});

                const canvasPath = path.join(STORAGE_PATH, 'csv', Date.now() + '.csv');
                const pdfPath = path.join(STORAGE_PATH, 'pdf', Date.now() + '.pdf');
                console.log(`saving to ${canvasPath} and ${pdfPath}`);

                fs.writeFileSync(canvasPath, strokes.map(function (s) { return `${s.x0},${s.y0},${s.x1},${s.y1},${s.d},${s.color},${s.brush}`; }).join('\n') + '\n');

                printer.print(question, colors, strokes, pdfPath, drawingNr, function () {
                    console.log('printing done, reset all clients');

                    setTimeout(function () {
                        state.a.done = false;
                        state.b.done = false;
                        strokes = [];

                        setNextQuestion();
                        advanceDrawingNr();

                        io.emit('reset', { question });
                    }, 5000);
                });
            }, 2000);
        }
    });
});

console.log('Server running on http://localhost:3000');
