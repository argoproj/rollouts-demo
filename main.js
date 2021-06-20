const PX_PER_ROW = 20;
const ROWS = 10;
const REFRESH_INTERVAL_MS = 1000;

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
		if ((Object.keys(this.colors.available) || []).length == 0) {
            return "[]"
        }
        // let values = []
        // this.availableColors.forEach(color => {
        //     values.push(color.GetSliderValues())
        // })

		return "[]";
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
		this.colors = {};

    	this.latencySlider = new Slider("latency", "s", l => {
    		if (this.selected) {
    			this.colors[this.selected] = {...this.colors[this.selected], latency: l}
    		}
    	});
		this.errorSlider = new Slider("error", "%", e => {
    		if (this.selected) {
    			this.colors[this.selected] = {...this.colors[this.selected], error: e}
    		}
    	});
	}

	add(color) {
		if (!this.available[color]) {
			const el = document.createElement("div");
	    	el.classList.add(`colors__${color}`);
	    	el.addEventListener("click", () => this.setSelected(color));
	    	this.container.appendChild(el);
	    	this.colors[color] = {el};
		}
		this.available[color] = true;
	}

	setSelected(color) {
		if (this.selected !== color) {
			if (this.selected) {
				this.colors[this.selected].el.classList.remove('colors__selected');
			}
			this.selected = color;
			this.colors[color].el.classList.add('colors__selected');
			this.latencySlider.setValue(this.colors[color].latency);
			this.errorSlider.setValue(this.colors[color].error);
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

	light(row, col) {
		this.pixels[row][col].light();
	}

	randCoord() {
		const row = Math.round(Math.random() * PX_PER_ROW);
		const col = Math.round(Math.random() * ROWS);
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

	light() {
		this.container.classList.add("pixel--on")
	}
}

const getBody = (color, error, latency) => {
    
}

const toggle = (onButton, offButton) => {
	onButton.classList.add("button--selected");
	offButton.classList.remove("button--selected");
}



const app = new App();
app.start();