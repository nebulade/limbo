'use strict';

exports = module.exports = {
    print
};

const { createCanvas } = require('canvas'),
    fs = require('fs');

function draw(context, colors, x, y, d, color, brush) {
    var penSize = brush;
    context.beginPath();
    context.fillStyle = 'rgba(' + colors[color] +', ' + ( 0.7 - d )  + ')';
    context.arc(x, y, penSize, 0, Math.PI*2, true);
    context.closePath();
    context.fill();
}

function print(colors, strokes, pdfPath) {
    // https://www.din-formate.de/reihe-a-din-groessen-mm-pixel-dpi.html with 300ppi
    const canvas = createCanvas(2480, 1748, 'pdf');
    const ctx = canvas.getContext('2d');

    strokes.forEach(function (data) {
        draw(ctx, colors, data.x, data.y, data.d, data.color, data.brush);
    });

    // Write "Awesome!"
    ctx.font = '30px Arial';
    ctx.fillText('Awesome!', 50, 100);

    const out = fs.createWriteStream(pdfPath);
    const stream = canvas.createPDFStream();
    stream.pipe(out);
    out.on('finish', () =>  console.log('The file was created.'));
}
