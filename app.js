class Particle {
    constructor(x, y, color) {
        this.color = color;
        this.x = x;
        this.y = y;
        this.size = Math.random() * 20 + 10;
        this.vx = Math.random() * 400 - 200;
        this.vy = Math.random() * 400 - 200;
    }

    tick(duration) {
        this.x += this.vx * duration;
        this.y += this.vy * duration;
        this.vy += 50 * duration;
    }

    draw(context) {
        context.beginPath();
        context.shadowBlur=15;
        context.shadowColor='#009933';
        context.fillStyle=this.color;
        context.arc(this.x, this.y, this.size, 0, Math.PI*2, true);
        context.closePath();
        context.fill();
    }
}

class Chart {
    constructor(app) {
        this.app = app;
        this.sinceLastBar = 0;
        this.bars = [];
        this.nextBarInfo = new Map();
    }

    addColor(color) {
        this.nextBarInfo.set(color, (this.nextBarInfo.get(color) || 0) + 1);
    }

    tick(duration) {
        this.sinceLastBar += duration;
        if (this.sinceLastBar > 3) {
            this.sinceLastBar = 0;
            const total = Array.from(this.nextBarInfo.values()).reduce(function(first, second) {
                return first + second;
            }, 0);
            if (total > 0) {
                const nextBar = Array.from(this.nextBarInfo.entries()).map(function([color, count]) {
                    return {
                        color,
                        percentage: count / total,
                    };
                }.bind(this)).sort(function(first, second) {
                    return first.color.localeCompare(second.color);
                });
                this.bars.push(nextBar);
                if (this.bars.length > 600) {
                    this.bars.shift();
                }
            }
            this.nextBarInfo = new Map();
        }
    }

    draw(context) {
        context.shadowBlur=0;
        context.shadowColor='none';
        const height = 200;
        const width = 50;
        const distance = 20;
        const count = this.app.canvas.width / (width + distance);
        const start = Math.max(0, this.bars.length - count);
        this.bars.slice(start).forEach((function(bar, i) {
            let offset = 0;
            bar.forEach((function(part) {
                context.fillStyle = part.color;
                const partHeight = height * part.percentage;
                context.fillRect(distance * i + width * i, this.app.canvas.height - (partHeight + offset), width, partHeight);
                offset += partHeight;
            }).bind(this));
        }).bind(this));
    }
}

function handleErrors(response) {
    if (!response.ok) {
        throw Error(response.statusText);
    }
    return response;
}

export class App {
    constructor(canvas) {
        this.canvas = canvas;
        this.particles = [];
        this.chart = new Chart(this);
        this.sliders = new Sliders(this)
    }


    

    addParticle() {
        
        fetch('./color', {
            method: "POST",
            body: JSON.stringify(this.sliders.GetValues()),
        }).then(handleErrors)
        .then(function(res) {
            return res.json();
        }).then((function(color) {
            this.particles.unshift(new Particle(this.canvas.width / 2, this.canvas.height * 0.2, color));
            this.particles = this.particles.slice(0, 50);
            this.chart.addColor(color);
        }).bind(this));
    }

    getObjects() {
        return [...this.particles, this.chart];
    }

    run() {
        const context = this.canvas.getContext('2d');
        let prevDate = new Date();

        const draw = function() {
            const nextPrevDate = new Date();
            const duration = (nextPrevDate.getTime() - prevDate.getTime()) / 1000;
            this.getObjects().forEach((obj) => obj.tick && obj.tick(duration));
            prevDate = nextPrevDate;

            context.fillStyle = 'rgba(39,12,83,0.8)';
            context.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.getObjects().forEach((obj) => obj.draw(context));
        }.bind(this);

        setInterval(draw, 15);
        setInterval(this.addParticle.bind(this), 100);
        draw();
    }
}

export class Sliders {
    constructor(app) {
        this.app = app;
        this.return502 = document.getElementById("return502");
        this.return404 = document.getElementById("return404");
        this.delayPecent = document.getElementById("delayPecent");
        this.delayLength = document.getElementById("delayLength");

    }

    draw(context) {
        context.shadowBlur=0;
        context.shadowColor='none';
        const height = 600;
        const width = 300;
        const xoffset = 50;
        const yoffset = 50;

        const xStart = this.app.canvas.width - width - xoffset;
        context.fillRect(xStart, yoffset, xStart + width, height + yoffset);
    }

    GetValues() {
        return {
            "return502": parseInt(this.return502.value),
            "return404": parseInt(this.return404.value),
            "delayPecent": parseInt(this.delayPecent.value),
            "delayLength": parseInt(this.delayLength.value)
        }
    }

}