'use strict'
$(document).ready(function () {
	generateChart();

	document.getElementById('clickMe').addEventListener('click', () => runSimulation())
	document.getElementById('pause').addEventListener('click', () => pausePls())
	
	$('input[type=range]').change(function () {
		var data = $(this).val();
		$(this).parent().find('.range-value.percent').html(`${data}%`);
		$(this).parent().find('.range-value.frames').html(`${data} frames per second`);
	}).change();

	$('input[type=color]').change(function () {
		let name = $(this).attr('name');
		let color = $(this).val();
		colorMap[name] = color;
		drawFullFrame(simulation.currentFrame());
		chart.series.forEach(s => {
			if (s.name == name) s.update({color: color})
		})
	});

	gridCtx.globalAlpha=0.3;


})

let automataIp = "localhost:8080"

let fps = () => $('form input[name="speed"]').val();
let colorMap = {
	"S": "rgb(102, 179, 255)",
	"I": "rgb(217, 102, 255)",
	"R": "rgb(222, 222, 255)"
}

let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');

let grid = document.getElementById('grid');
let gridCtx = grid.getContext('2d');

var chart = null;

function empty2dArray(x, y) {
	return [...Array(x).keys()].map(i => Array(y));
}

let simulation = {
	deltaFrames: [],
	frames: [],
	chartData: [],
	currFrame: 0,
	totalFrames: 0,
	paused: false,
	timeout: null,
	sizeX: 0,
	sizeY: 0,
	cellSize: 0,
	connection: null,
	resumeOnFrame: true,
	setFrame: function (frame) {
		if ((frame >= 0) && (frame <= this.totalFrames)) {
			this.currFrame = frame;
			setPlotLine(frame - 1);
			drawFullFrame(this.frames[frame - 1]);
		}
	},
	reset: function () {
		this.deltaFrames = [];
		this.frames = [];
		this.chartData = [];
		this.currFrame = 0;
		this.totalFrames = 0;
		this.cellSize = 0;
		this.sizeX = 0;
		this.sizeY = 0;
		this.paused = false;
		this.resumeOnFrame = true;

		if (this.timeout) clearTimeout(this.timeout);
		this.timeout = null;

		if (this.connection) this.connection.close();
		this.connection = null;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		gridCtx.clearRect(0, 0, grid.width, grid.height);
	},
	nextDeltaFrame: function () {
		let frame = this.deltaFrames[this.currFrame];
		setPlotLine(this.currFrame);	
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
		let chartStat = {S: 0, I: 0, R: 0}
		frame.forEach((arr) => arr.forEach((state) => chartStat[state] += 1));
		this.chartData.push(chartStat);
		if (chart) {
			chart.series.forEach(s => {
				let type = s.name;
				s.addPoint(chartStat[type], false);
			})
			chart.redraw(false);
		}

	},
	newDeltaFrame: function (deltaFrame) {
		this.totalFrames += 1;
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
		this.totalFrames += 1;
		this.frames.push(frame);

		let newDeltaFrame = null;
		if (frames.length == 0) {
			newDeltaFrame = frame.map((arr, x) => arr.map((state, y) => { return { x: x, y: y, state: state } })).reduce((x, y) => x.concat(y), []);
		} else {
			let oldFrame = frames[frames.length - 1];
			newDeltaFrame = [];
			frame.forEach((row, x) => row.forEach((state, y) => {
				if (oldFrame[x][y] != state) newDeltaFrame.push({x: x, y: y, state: state})
			}));
		}

		this.deltaFrames.push(newDeltaFrame);
		this.updateChart(frame);

	},
	currentFrame: function () {
		return this.frames[this.currFrame - 1];
	}
}

function highlightCell(x, y, color, size) {
	ctx.fillStyle = color;
	ctx.fillRect(x * size, y * size, size, size);
}

function range(from, to) {
	return [...Array(to - from).keys()].map((n) => n + from)
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

	chart.series.forEach(s => s.update({data: []}));
	chart.update({xAxis:{minRange: options.length, max: options.length}});

	let conn = new WebSocket("ws://" + automataIp + "/automata");

	conn.addEventListener('open', function (event) {
		conn.send(JSON.stringify(options));
	});
 	gridCtx.beginPath();
    gridCtx.lineWidth = 2;
    gridCtx.strokeStyle = "#ffffff";
	range(0, x).forEach(i => {
        gridCtx.moveTo(size*i + 1, 0);
        gridCtx.lineTo(size*i + 1, grid.height);
	})
	range(0, y).forEach(i => {
		gridCtx.moveTo(0, size*i + 1);
        gridCtx.lineTo(grid.width, size*i + 1);
	})
	gridCtx.stroke();

	simulation.connection = conn;
	simulation.cellSize = size;
	simulation.sizeX = +x;
	simulation.sizeY = +y;
	simulation.connection.onmessage = (event) => {
		simulation.newDeltaFrame(JSON.parse(event.data));
		if (simulation.resumeOnFrame) {
			simulation.resumeOnFrame = false;
			simulation.paused = false;
			simulation.timeout = setTimeout(() => run(), 1);
		}
	}

}

function drawDeltaFrame(frame) {
	frame.forEach(cell => highlightCell(cell.x, cell.y, colorMap[cell.state], simulation.cellSize));
}

function drawFullFrame(frame) {
	frame.forEach((row, x) => row.forEach((state, y) => highlightCell(x, y, colorMap[state], simulation.cellSize)));
}

function step() {
	drawDeltaFrame(simulation.nextDeltaFrame());
}

function run() {
	if (!simulation.isFinished()) {
		step();
		if (!simulation.paused)
			simulation.timeout = setTimeout(() => run(), 1000 / fps());
	} else {
		simulation.paused = true;
		simulation.resumeOnFrame = true;
	}
}

function pausePls() {
	simulation.pause()
	if (simulation.paused) {
		clearTimeout(simulation.timeout);
		simulation.resumeOnFrame = false;
	} else {
		simulation.timeout = setTimeout(() => run(), 1000 / fps());
	}
}

function setPlotLine(idx) {
	let plotLine = chart.xAxis[0].plotLinesAndBands[0].options;
	plotLine.value = idx;
	chart.xAxis[0].update({
		plotLines: [plotLine]
	});
}

function generateChart() {
	chart = Highcharts.chart('chart', {
		chart: {
			type: 'spline',
			height: 200,
			events: {
				click: function(e){
					let frame = Math.round(e.xAxis[0].value);
					simulation.setFrame(frame + 1);
				}
			}
		},
		legend: {
			layout: 'vertical',
			align: 'left',
			verticalAlign: 'top',
			x: 0,
			y: 0,
			floating: true,
			borderWidth: 1,
			backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF'
		},
		boost: {
	        useGPUTranslations: true
	    },
		tooltip: {
			shared: true,
			valueSuffix: ' units'
		},
		yAxis: {
			title: {
	            text: 'Count'
	        },
		},
		xAxis: {
			min: 0,
			title: {
	            text: 'Time'
	        },
	        plotLines: [{
			    color: 'red',
			    value: 0,
			    width: 1
			}]
		},
		title: {
			text: null
		},
		plotOptions: {
			areaspline: {
				fillOpacity: 0.5
			},
			series: {
		         cursor: 'pointer',
		         point: {
		             events: {
		                click: function(e){
							let frame = e.point.index;
							simulation.setFrame(frame + 1);
						}
		            }
		        }
		    }
		},

		series: Object.keys(colorMap).map(name => { return {
			name: name, 
			data: [], 
			color: colorMap[name]
		}})
	});
}