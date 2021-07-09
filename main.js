const MIN_ROWS = 4;
const MAX_ROWS = 14;

const REFRESH_INTERVAL_MS = 20;

const PIXEL_TIMEOUT = 4000;
const PIXEL_SIZE = 35;
const PIXEL_GUTTER = 5;

const BUCKET_SECONDS = 5;

const COLORS = ["red", "orange", "yellow", "green", "blue", "purple"];

class App {
	constructor() {
		this.colors = new Colors();
		this.interval = null;

		this.startButton = new Button("start", this.start.bind(this));
		this.stopButton = new Button("stop", this.stop.bind(this));

		this.resizeButton = new Button("resize", this.resize.bind(this));
		this.resizeButton.hide();

		const c = this.getColumns();
		this.columns = c;
		const r = this.getRows();
		this.rows = r;
		this.grid = new Grid(r, c);
		this.graph = new Graph(c);
	}

	stateChange() {
		if (document.hidden) {
			this.stop();
		} else {
			this.start();
		}
	}

	resized() {
		this.resizeButton.show();
	}

	resize() {
		const c = this.getColumns();
		this.columns = c;
		const r = this.getRows();
		this.rows = r;
		this.grid.resize(r, c);
		this.graph.resize(c);
		this.resizeButton.hide();
	}

	start() {
		this.interval = setInterval(() => {
			this.load();
		}, REFRESH_INTERVAL_MS);
		this.on = true;
		this.startButton.select();
		this.stopButton.deselect();
	}	

	stop() {
		clearInterval(this.interval);
		this.on = false;
		this.startButton.deselect();
		this.stopButton.select();
		window.stop()
	}

	req() {
		const colors = Object.keys(this.colors.available) || [];
		if (colors.length == 0) {
            return "[]"
        }
        let values = []
        colors.forEach(color => {
            values.push(this.colors.available[color].values())
        })
		return JSON.stringify(values);
	}

	load(body) {
	    fetch('./color', {
	        method: "POST",
	        body: this.req(),
	    })
	    .then(function(res) {
	       return res.json().then(color => ({ color, res }))
	    }).then((function(res) {
	    	const {color} = res;
	    	const error = res.res.status === 500;
	    	this.colors.add(color);
	        this.grid.light(this.randCoord(), color, error);
	        this.graph.record(color, error);
	    }).bind(this));
	}

	randCoord() {
		const row = Math.round(Math.random() * this.rows);
		const col = Math.round(Math.random() * this.columns);
		return [row, col];
	}

	getColumns() {
		return Math.round(window.innerWidth / (PIXEL_SIZE + PIXEL_GUTTER)) - 2;
	}

	getRows() {
		var rows = Math.round(window.innerHeight / (PIXEL_SIZE + PIXEL_GUTTER)) - 10;
		rows = Math.min(rows, MAX_ROWS);
		rows = Math.max(rows, MIN_ROWS);
		return rows;
	}
}

class Button {
	constructor(suffix, onClick) {
		this.container = document.querySelector(`.button--${suffix}`);
		this.container.addEventListener("click", onClick);
	}

	select() {
		this.container.classList.add("button--selected");
	}

	deselect() {
		this.container.classList.remove("button--selected");
	}

	hide() {
		this.container.style.visibility = "hidden";
	}

	show() {
		this.container.style.visibility = "visible";
	}
}

class Slider {
	constructor(name, unitLabel, onChange) {
		this.slider = document.getElementById(name);
		this.label = document.getElementById(`${name}-label`);
		this.unit = unitLabel;
		this.update();
		this.onChange = onChange.bind(this);
		this.slider.oninput = this.update.bind(this);
	}

	format(val) {
		return `${Math.round(val * 10) / 10 || 0}${this.unit}`;
	}

	update() {
		this.value = this.slider.value;
		this.onChange && this.onChange(this.value);
		this.label.innerHTML = this.format(this.value);
	}

	setValue(val) {
		this.value = val || 0;
		this.label.innerHTML = this.format(this.value);
		this.slider.value = this.value;
	}
}

class Colors {
	constructor() {
		this.available = {};
		this.container = document.getElementById("colors");
		this.selected = null;

    	this.latencySlider = new Slider("latency", "s", l => {
    		if (this.selected) {
    			this.available[this.selected].latency = l;
    		}
    	});
		this.errorSlider = new Slider("error", "%", e => {
    		if (this.selected) {
    			this.available[this.selected].error = e;
    		}
    	});
	}

	add(color) {
		if (!this.available[color]) {
			const c = new Color(color, () => this.select(color));
	    	this.container.appendChild(c.container);
	    	this.available[color] = c;
	    	this.select(color);
		}
	}

	select(color) {
		if (this.selected !== color) {
			if (this.selected) {
				this.available[this.selected].container.classList.remove('colors__selected');
			}
			this.selected = color;
			this.available[color].container.classList.add('colors__selected');
			this.latencySlider.setValue(this.available[color].latency);
			this.errorSlider.setValue(this.available[color].error);
		}
	}

	list() {
		return Object.keys(this.available);
	}
}

class Color {
	constructor(name, onClick) {
		this.name = name;
		const el = document.createElement("div");
    	el.classList.add(`colors__${name}`);
    	el.addEventListener("click", onClick.bind(this));
    	this.container = el;
		this.latency = 0;
		this.error = 0;
	}

	values() {
		return {
	        "color": this.name,
	        "return500": parseInt(this.error, 10),
	        "delayLength": parseFloat(this.latency),
	    }
	}
}

class Grid {
	constructor(r, c) {
		this.container = document.getElementById("grid");
		this.resize(r, c);
	}

	resize(rows, col) {
		this.container.innerHTML = null;
		this.pixels = [];
		for (const r of Array(rows).keys()) {
			this.pixels.push([]);
			const row = document.createElement("div");
			row.className = "row";
			row.id = `row-${r}`
			for (const c of Array(col).keys()) {
				const px = new Pixel(r, c);
				this.pixels[r][c] = px;
				row.appendChild(px.container);
			}
			this.container.appendChild(row);
		}		
	}

	light(coord, color, error) {
		let [row, col] = coord;
		let px = false;
		if (this.pixels[row]) {
			const px = this.pixels[row][col];
			if (px) {
				px.light(color, error, PIXEL_TIMEOUT);
			}
		}
	}
}

class Pixel {
	constructor(row, col) {
		this.row = row;
		this.col = col;
		const container = document.createElement("div");
		container.className = "pixel";
		container.id = `pixel--${row},${col}`;
		this.container = container;
	}

	genClassName(color) {
		return `pixel__${color || 'on'}`;
	}

	dim(color) {
		this.container.classList.remove(this.genClassName(color));
		this.container.classList.remove('pixel--error');
	}

	light(color, error, ms) {
		setTimeout(() => this.dim(color), ms);
		const className = this.genClassName(color);
		this.container.className = '';
		this.container.classList.add('pixel');
		this.container.classList.add(className);
		if (error) {
			this.container.classList.add('pixel--error');
		}
	}
}

class Graph {
	constructor(c) {
		this.container = document.getElementById("graph");
		this.cur = 0;
		this.buckets = [];
		this.resize(c);
		setInterval(this.tick.bind(this), BUCKET_SECONDS * 1000)
	}

	record(color, error) {
		const curBucket = this.buckets[this.buckets.length-1];
		if (!curBucket) {
			return;
		}
		curBucket.drip(color, error);
	} 

	resize(col) {
		const bucketLen = this.buckets.length
		if (col < bucketLen) {
			for (let i = 0; i < bucketLen - col; i++) {
				this.buckets.pop();
				this.container.removeChild(this.container.firstChild);
			}
		} else if (col > bucketLen) {
			for (let i = 0; i < col - bucketLen; i++) {
				this.buckets.unshift(new Bucket());
				const bar = document.createElement("div");
				bar.classList.add('bar');
				this.container.prepend(bar);
			}
		}
	}

	tick() {
		this.container.removeChild(this.container.firstChild);
		const el = this.buckets[this.buckets.length-1].full();
		this.container.append(el);
		this.buckets.shift();
		this.buckets.push(new Bucket());
	}
}

class Bucket {
	constructor() {
		const reqPerSecond = 1000 / REFRESH_INTERVAL_MS;
		this.capacity = BUCKET_SECONDS * reqPerSecond;
		this.amounts = {};
	}

	drip(color, error) {
		if (!this.amounts[color]) {
			this.amounts[color] = {ok: 0, error: 0};
		}
		if (error) {
			this.amounts[color].error += 1;
		} else {
			this.amounts[color].ok += 1;
		}
	}

	genFill(amount, c, error) {
		const fill = document.createElement("div");
		fill.classList.add('bar__fill');
		fill.classList.add(`graph__${c}`);
		if (error) {
			fill.classList.add(`bar__fill--error`);
		}
		fill.style.height = `${100 * amount/this.capacity}%`;
		return fill;
	}

	full() {
		const el = document.createElement("div");
		el.classList.add('bar');
		for (const c of COLORS) {
			if (!this.amounts[c]) {
				continue
			}
			const ok = this.amounts[c].ok;
			if (ok > 0) {
				const okFill = this.genFill(this.amounts[c].ok, c, false);
				el.appendChild(okFill);	
			}
			const errors = this.amounts[c].error;
			if (errors > 0) {
				const errFill = this.genFill(this.amounts[c].error, c, true);
				el.appendChild(errFill);
			}
		}
		return el;
	}
}

const app = new App();
app.start();
window.addEventListener("resize", app.resized.bind(app));
document.addEventListener("visibilitychange", app.stateChange.bind(app));