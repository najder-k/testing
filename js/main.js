'use strict'
$(document).ready(function () {
	document.getElementById('clickMe').addEventListener('click', () => runSimulation())
	document.getElementById('mocker').addEventListener('click', () => mockSimulation())
	document.getElementById('pause').addEventListener('click', () => pausePls())
	document.getElementById('rewind').addEventListener('click', () => simulation.rewind())

	$('input[type=range]').change(function () {

		var data = $(this).val();
		$(this).parent().find('.range-value.percent').html(`${data}%`);
		$(this).parent().find('.range-value.frames').html(`${data} frames per second`);

	}).change();

	$('input[type=color]').change(function () {
		colorMap[$(this).attr('name')] = $(this).val();
		simulation.redrawCurrentFrame();
	});
})

let fps = () => $('form input[name="speed"]').val();
let colorMap = {
	"X": rgb(217, 102, 255),
	"O": rgb(222, 222, 255),
	"H": rgb(102, 179, 255)
}

let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');

function empty2dArray(x, y) {
	return [...Array(x).keys()].map(i => Array(y));
}

let simulation = {
	deltaFrames: [],
	frames: [],
	chartData: [],
	currFrame: 0,
	paused: false,
	timeout: null,
	sizeX: 0,
	sizeY: 0,
	cellSize: 0,
	connection: null,
	rewind: function () {
		this.currFrame = 0;
	},
	reset: function () {
		this.deltaFrames = [];
		this.frames = [];
		this.chartData = [];
		this.currFrame = 0;
		this.cellSize = 0;
		this.sizeX = 0;
		this.sizeY = 0;
		this.paused = false;

		if (this.timeout) clearTimeout(this.timeout);
		this.timeout = null;

		if (this.connection) this.connection.close();
		this.connection = null;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
	},
	nextDeltaFrame: function () {
		let frame = this.deltaFrames[this.currFrame];
		this.currFrame += 1;
		return frame
	},
	isFinished: function () {
		return this.currFrame >= this.deltaFrames.length;
	},
	pause: function () {
		return this.paused = !this.paused
	},
	updateChart: function (frame) {
		let chartStat = {
			X: 0, O: 0, H: 0
		}
		frame.forEach((arr) => arr.forEach((state) => chartStat[state] += 1));
		this.chartData.push(chartStat);
	},
	newDeltaFrame: function (deltaFrame) {
		this.deltaFrames.push(deltaFrame);

		let newFrame = null;
		if (this.frames.length == 0) {
			newFrame = empty2dArray(this.sizeX, this.sizeY);
		} else {
			newFrame = JSON.parse(JSON.stringify(this.frames[this.frames.length - 1]));
		}
		deltaFrame.forEach((obj) => newFrame[obj.x][obj.y] = obj.state);

		this.frames.push(newFrame);
		this.updateChart(newFrame);
	},
	newFullFrame: function (frame) {
		this.frames.push(frame);

		let newDeltaFrame = null;
		if (frames.length == 0) {
			newDeltaFrame = frame.map((arr, x) => arr.map((state, y) => { return { x: x, y: y, state: state } })).reduce((x, y) => x.concat(y), []);
		} else {
			let oldFrame = frames[frames.length - 1];
			newDeltaFrame = []
			for (var i = 0; i < this.sizeX; i++) {
				for (var j = 0; j < this.sizeY; i++) {
					if (oldFrame[i][j] != frame[i][j])
						newDeltaFrame.push({ x: i, y: j, state: frame[i][j] })
				}
			}
		}

		this.deltaFrames.push(newDeltaFrame);
		this.updateChart(frame);

	},
	redrawCurrentFrame: function () {
		let fullFrame = this.frames[this.currFrame - 1];
		range(0, this.sizeX).forEach(x => {
			range(0, this.sizeY).forEach(y => {
				let state = fullFrame[x][y];
				highlightCell(x, y, colorMap[state], this.size);
			})
		})
	}
}

// function rgb(r, g, b) {
// 	return { r: r, g: g, b: b }
// }
function rgb(r, g, b) {
	return "rgb(" + r + ", " + g + ", " + b + ")";
}
function rgbStr(color) {
	return "rgb(" + color.r + ", " + color.g + ", " + color.b + ")";
}
function modifyColor(color, modifier) {
	let f = (col) => Math.min(Math.floor(col * modifier), 255)
	return { r: f(color.r), g: f(color.g), b: f(color.b) }
}

// function highlightCell(x, y, color, size) {
// 	ctx.fillStyle = rgbStr(color);
// 	ctx.fillRect(x * size, y * size, size, size);
// 	if (size > 3) {
// 		ctx.lineWidth = 1;
// 		ctx.strokeStyle = rgbStr(modifyColor(color, 1.5));
// 		ctx.strokeRect(x * size, y * size, size, size);
// 	}
// }
function highlightCell(x, y, color, size) {
	ctx.fillStyle = color;
	ctx.fillRect(x * size, y * size, size, size);
}

function range(from, to) {
	return [...Array(to - from).keys()].map((n) => n + from)
}

function mockSimulation() {

	simulation.reset();

	let randomState = (t, x, y) => "XOOHXOHHX"[Math.floor((Math.sin(t * 0.05) + 1) * x + (Math.sin(t * 0.08) + 1) * y * 0.3 + Math.sin(Math.random() * 3.14) + 13) % 5 + Math.floor((Math.sin(t * 0.02)) * 2 + 2)]

	let x = $('form input[name="x"]').val();
	let y = $('form input[name="y"]').val();
	let size = Math.floor(600 / Math.max(x, y));
	let numOfFrames = $('form input[name="frames"]').val();

	let generateOneFrame = (t) => {
		return range(0, x).map((i) =>
			range(0, y).map((j) => {
				return randomState(t, i, j);
			})
		)
	}

	simulation.cellSize = size;
	simulation.sizeX = +x;
	simulation.sizeY = +y;
	range(0, numOfFrames).map((t) => simulation.newFullFrame(generateOneFrame(t)))
	simulation.timeout = setTimeout(() => run(), 10);
}

function runSimulation() {
	simulation.reset();

	let x = $('form input[name="x"]').val();
	let y = $('form input[name="y"]').val();
	let size = Math.floor(600 / Math.max(x, y));

	let options = {
		sizeX: +x,
		sizeY: +y,
		p: $('form input[name="persistence"]').val() / 100.0,
		q: $('form input[name="infect"]').val() / 100.0,
		i: +$('form input[name="immune"]').val(),
		initDiseased: $('form input[name="initial"]').val() / 100.0,
		length: +$('form input[name="frames"]').val()
	}

	let conn = new WebSocket("ws://localhost:9000/automata");

	conn.addEventListener('open', function (event) {
		conn.send(JSON.stringify(options));
	});



	simulation.connection = conn;
	simulation.cellSize = size;
	simulation.sizeX = +x;
	simulation.sizeY = +y;
	simulation.connection.onmessage = (event) => {
		simulation.newDeltaFrame(JSON.parse(event.data));
	}

	simulation.timeout = setTimeout(() => run(), 500);
}

function step() {
	let frame = simulation.nextDeltaFrame();
	frame.map(cell => highlightCell(cell.x, cell.y, colorMap[cell.state], simulation.cellSize));
}

function run() {
	if (!simulation.isFinished()) {
		step();
		if (!simulation.paused)
			simulation.timeout = setTimeout(() => run(), 1000 / fps());
	} else {
		simulation.paused = true;
		generateChart(simulation.chartData);
	}
}

function pausePls() {
	simulation.pause()
	if (simulation.paused) {
		clearTimeout(simulation.timeout);
	} else {
		simulation.timeout = setTimeout(() => run(), 1000 / fps());
	}
}
function generateChart(chartData) {
	let xData = [],
		oData = [],
		hData = [];
	chartData.map((i, e) => {
		xData.push(i.X);
		oData.push(i.O);
		hData.push(i.H);
	});
	Highcharts.chart('chart', {
		chart: {
			type: 'spline',
			height: 400,
			events: {
				click: function(e){
					console.log(e);
				}
			}
		},
		title: {
			text: 'Choróbska'
		},
		legend: {
			layout: 'vertical',
			align: 'left',
			verticalAlign: 'top',
			x: 150,
			y: 100,
			floating: true,
			borderWidth: 1,
			backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF'
		},
		xAxis: {
			categories: Object.keys(chartData)
		},
		yAxis: {
			title: {
				text: '?'
			}
		},
		tooltip: {
			shared: true,
			valueSuffix: ' units'
		},
		plotOptions: {
			areaspline: {
				fillOpacity: 0.5
			},
			series: {
				area: {
					events: {
						click: function (e) {
							console.log(e);
						}
					}
				}
			}
		},
		series: [{
			name: 'x',
			data: xData,
			color: colorMap.X
		}, {
			name: 'o',
			data: oData,
			color: colorMap.O

		}, {
			name: 'h',
			data: hData,
			color: colorMap.H
		}]

	});
}
