'use strict';

exports = module.exports = {
    print
};

const { createCanvas, registerFont } = require('canvas'),
    execSync = require('child_process').execSync,
    path = require('path'),
    fs = require('fs');

registerFont(path.join(__dirname, 'public/assets/Sligoil-Micro copy.otf'), { family: 'sigoil' });

function draw(context, colors, x0, y0, x1, y1, d, color, brush) {
    var penSize = brush;

    var a = x0 - x1;
    var b = y0 - y1;
    var distance = Math.sqrt( a*a + b*b );

    // draw point instead of line if distance is small
    if (distance < 5) {
        context.beginPath();
        context.fillStyle = 'rgb(' + colors[color] +')';
        context.arc(x1, y1, penSize, 0, Math.PI*2, true);
        context.closePath();
        context.fill();
    } else {
        context.beginPath();
        context.strokeStyle = 'rgb(' + colors[color] +')';
        context.lineWidth = penSize*2;
        context.lineCap = 'round';
        context.moveTo(x0,y0);
        context.lineTo(x1,y1);
        context.stroke();
    }
}

function print(colors, strokes, pdfPath, callback) {
    // https://www.din-formate.de/reihe-a-din-groessen-mm-pixel-dpi.html with 300ppi
    // const canvas = createCanvas(2480, 1748, 'pdf');
    const canvas = createCanvas(1024, 768, 'pdf');
    const ctx = canvas.getContext('2d');

    strokes.forEach(function (data) {
        draw(ctx, colors, data.x0, data.y0, data.x1, data.y1, data.d, data.color, data.brush);
    });

    // Write "Awesome!"
    ctx.font = '30px sigoil';
    ctx.fillText('Awesome!', 50, 100);

    const out = fs.createWriteStream(pdfPath);
    const stream = canvas.createPDFStream();
    stream.pipe(out);
    out.on('finish', function () {
        console.log('The file was created.');

        if (process.env.PRINTING) execSync(`lp -o number-up=2 ${pdfPath}`);

        callback();
    });
}
