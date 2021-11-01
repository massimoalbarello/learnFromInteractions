const gpio = require("gpio");


exports.Buzzer = class {
    constructor(pin) {
        this.buzzer = gpio.export(pin, {
            direction: gpio.DIRECTION.OUT,
            ready: function() {
                // console.log("GPIO 4 set up for output");
            }
        });
        this.buzzer.reset();
    }

    beep() {       
        this.buzzer.set();
        setTimeout(() => this.buzzer.reset(), 500);
    }

    doubleBeep() {       
        this.buzzer.set();
        setTimeout(() => this.buzzer.reset(), 100);
        setTimeout(() => this.buzzer.set(), 200);
        setTimeout(() => this.buzzer.reset(), 300);
    }

}