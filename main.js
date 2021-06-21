const PX_PER_ROW = 20;
const ROWS = 10;
const REFRESH_INTERVAL_MS = 100;
const BAR_HEIGHT = 50;
const MAX_BARS = 30;

const colorsContainer = document.getElementById("colors");
let availableColors = {};

class App {
	constructor() {
		this.colors = new Colors();
		this.interval = null;

		this.startButton = document.querySelector(".button--start");
		this.startButton.addEventListener("click", this.start.bind(this));

		this.stopButton = document.querySelector(".button--stop");
		this.stopButton.addEventListener("click", this.stop.bind(this));

		this.grid = new Grid();
		this.bars = new Bars();
	}

	start() {
		this.interval = setInterval(() => {
			this.load();
		}, REFRESH_INTERVAL_MS);
		this.on = true;
		this.startButton.classList.add("button--selected");
		this.stopButton.classList.remove("button--selected")
	}	

	stop() {
		clearInterval(this.interval);
		this.on = false;
		this.startButton.classList.remove("button--selected");
		this.stopButton.classList.add("button--selected")
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
		var sendTime = (new Date()).getTime();
	    fetch('./color', {
	        method: "POST",
	        body: this.req(),
	    })
	    .then(function(res) {
	       return res.json().then(color => ({ color, res }))
	    }).then((function(res) {
	    	const {color, status} = res;
	    	this.colors.add(color);
	        var receiveTime = (new Date()).getTime();
	        var responseTimeMs = receiveTime - sendTime;

	        this.grid.lightRand(color);
	        this.bars.push({colors: this.colors.available});
	    }).bind(this));
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
			const c = new Color(color, () => this.setSelected(color));
	    	this.container.appendChild(c.container);
	    	this.available[color] = c;
		}
	}

	setSelected(color) {
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
	        "delayPercent": 100,
	        "delayLength": parseInt(this.latency, 10)
	    }
	}
}

class Grid {
	constructor() {
		this.container = document.getElementById("grid");
		this.pixels = [];
		for (const r of Array(ROWS).keys()) {
			this.pixels.push([]);
			const row = document.createElement("div");
			row.className = "row";
			row.id = `row-${r}`
			for (const c of Array(PX_PER_ROW).keys()) {
				const px = new Pixel(r, c);
				this.pixels[r][c] = px;
				row.appendChild(px.container);
			}
			this.container.appendChild(row);
		}
	}

	light(row, col, color) {
		let px = false;
		if (this.pixels[row]) {
			const px = this.pixels[row][col];
			if (px) {
				px.light(color, 1000 * 1800);
			}
		}
	}

	lightRand(color) {
		const [x, y] = this.randCoord();
		this.light(x, y, color);
	}

	randCoord() {
		const row = Math.round(Math.random() * ROWS);
		const col = Math.round(Math.random() * PX_PER_ROW);
		return [row, col];
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

	light(color, ms) {
		const className = `pixel__${color || 'on'}`;
		setTimeout(() => this.container.classList.remove(className), ms);
		this.container.className = '';
		this.container.classList.add('pixel');
		this.container.classList.add(className);
	}
}

class Bars {
	constructor() {
		this.container = document.getElementById("bars");
		this.size = 0;
	}

	push(bar) {
		let el = null;
		if (this.size >= MAX_BARS) {
			el = document.getElementById("bar--0");
			this.size = this.size - 1;
		} else {
			el = document.createElement("div");
			el.id = `bar--${this.size}`;
		}
		el.className = "bar";
		for (const color of Object.keys(bar.colors)) {
			const c = document.createElement("div");
			c.className = `bar__${color}`;
			el.appendChild(c);
		}
		this.size = this.size + 1;
		this.container.append(el);
	}
}

const app = new App();
app.start();