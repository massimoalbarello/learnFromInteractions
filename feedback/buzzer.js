const Gpio = require("onoff").Gpio;


exports.Buzzer = class {
    constructor(pin) {
        this.buzzer = new Gpio(pin, 'out')
        this.buzzer.write(0);
    }

    start() {
        this.doubleBeep()
        setTimeout(() => this.doubleBeep(), 400);
    }

    beep() {       
        this.buzzer.write(1);
        setTimeout(() => this.buzzer.write(0), 500);
    }

    doubleBeep() {       
        this.buzzer.write(1);
        setTimeout(() => this.buzzer.write(0), 100);
        setTimeout(() => this.buzzer.write(1), 200);
        setTimeout(() => this.buzzer.write(0), 300);
    }

    trainingBeep() {
        return new Promise((resolve) => {
            this.buzzer.write(1);
            setTimeout(() => this.buzzer.write(0), 500);
            setTimeout(() => this.buzzer.write(1), 700);
            setTimeout(() => this.buzzer.write(0), 1200);
            setTimeout(() => this.buzzer.write(1), 1400);
            setTimeout(() => this.buzzer.write(0), 1900);
            setTimeout(() => resolve(), 2000);
        })
    }

    alarm() {
        this.buzzer.write(1);
        setTimeout(() => this.buzzer.write(0), 2000);
        setTimeout(() => this.alarm(), 4000);
    }
}