const express = require('express');
const morgan = require('morgan');
const http = require('http');
const websocket = require('ws');
const app = express();
const port = 3001;

const server = http.createServer(app);
const wss = new websocket.Server({server})
app.use(morgan('tiny'));

enum PumpCodes {
    Inactive,
    Active
}
enum SwitchCodes {
    Off,
    On
}

enum PeristalticPumpDirection {
    COUNTERCLOCKWISE,
    CLOCKWISE
}
let stringToDirection = {
    "clockwise": PeristalticPumpDirection.CLOCKWISE,
    "counter-clockwise": PeristalticPumpDirection.COUNTERCLOCKWISE
}

interface PeristalticPumpStatus {
    direction: PeristalticPumpDirection,
    on: boolean
}

interface IPump {
    id: number;
    name: string;
    status: PumpCodes;
    setStatus(status: PumpCodes): void;
}


class Pump implements IPump {
    id: number;
    name: string;
    status: PumpCodes;

    constructor(name) {
        this.id = Date.now();
        this.name = name;
        this.status = PumpCodes.Inactive;
    }

    setStatus(status) {
        this.status = status;
    }
}

interface ISwitch {
    id: number;
    name: string;
    status: SwitchCodes;
    setStatus(status: SwitchCodes): void;
}

interface IPeristalticPump {
    id: number;
    name: string;
    status: PeristalticPumpStatus;
    setStatus(status: PeristalticPumpStatus): void;
}

class PeristalticPump implements IPeristalticPump {
    id: number;
    name: string;
    status: PeristalticPumpStatus;
    constructor(name, status) {
        this.id = Date.now();
        this.name = name;
        this.status = status;
    }

    setStatus(status: PeristalticPumpStatus) {
        this.status = status;
    }
}

interface ISwitch {
    id: number;
    name: string;
    status: SwitchCodes;
    setStatus(status: SwitchCodes): void;
}

class Switch {
    id: number;
    name: string;
    status: SwitchCodes;

    constructor(name) {
        this.id = Date.now();
        this.name = name;
        this.status = SwitchCodes['Off'];
    }

    setStatus(status) {
        this.status = status;
    }
}

interface IState {
    pumps: IPump[];
    switches: ISwitch[];
    peristalticPumps: IPeristalticPump[];

    addPump(name: string): void;

    getPump(id: string): IPump;

    addSwitch(name: string): void;

    getSwitch(id: string): ISwitch;

    addPeristalticPump(name: string, status: PeristalticPumpStatus): void;

    getPeristalticPump(id: string): IPeristalticPump;
}


class State implements IState {
    pumps: IPump[];
    switches: ISwitch[];
    peristalticPumps: IPeristalticPump[];

    constructor() {
        this.pumps = [];
        this.switches = [];
        this.peristalticPumps = [];
    }

    addPump(name) {
        this.pumps.push(new Pump(name));
    }

    getPump(id) {
        return this.pumps.find(pump => pump.name === id);
    }

    addSwitch(name) {
        this.switches.push(new Switch(name));
    }

    getSwitch(id) {
        return this.switches.find(Switch => Switch.name === id);
    }

    addPeristalticPump(name, status) {
        this.peristalticPumps.push(new PeristalticPump(name, status));
    }
    getPeristalticPump(id) {
        return this.peristalticPumps.find(peristalticPump => peristalticPump.name === id);
    }
}

class WebSocketServer {
    ws: typeof wss;
    constructor(server) {
        this.ws = server
    }

    sendState() {
        this.ws.clients.forEach((client) => {
            client.send(JSON.stringify(state));
        });
    }
}

interface fullNetworkResponse {
    pumps: {
        [key: string]: PumpCodes
    },
    peristaltic_pumps: {
        [key: string]: PeristalticPumpStatus
    }
    float_switches: {
        [key: string]: SwitchCodes
    }
}


let state = new State();
const wsServer = new WebSocketServer(wss);

function init()  {
    fetch('http://espgarden.local').then(res => res.json()).then((data: fullNetworkResponse) => { //change data type, probably the bug is here
        if(data) {
            for(const pump in data.pumps) {
                state.addPump(pump);
                state.getPump(pump).setStatus(data.pumps[pump]);
            }
            for(const Switch in data.float_switches) {
                state.addSwitch(Switch);
                state.getSwitch(Switch).setStatus(data.float_switches[Switch]);
            }
            for(const PeristalticPump in data.peristaltic_pumps) {
                state.addPeristalticPump(PeristalticPump, data.peristaltic_pumps[PeristalticPump]);
            }
            console.log(state)
            console.log('Data received from server')
            console.log(data)
            wsServer.sendState();
        } else {
            console.log('No data received from server');
        }
    }).catch(err => {
        console.log(err);
    })
}

init();

wss.on('connection', () => {
    console.log('establish websocket connection');
    wsServer.sendState();
});

app.get('/init', (req, res) => {
    state = new State();
    wsServer.sendState();
    res.json({"info": "Server initialized", "server_time": Date.now()})
});

app.get('/pump/init/:id', (req, res) => {
    if(state.pumps.find(pump => pump.name === req.params.id)) {
        res.json({"info": "Pump already initialized"})
    } else {
        state.addPump(req.params.id);
        wsServer.sendState();
        res.json(state.getPump(req.params.id));
    }
});
app.get('/pump/start/:id', (req, res) => {
    if(state.pumps.find(pump => pump.name === req.params.id)) {
        state.getPump(req.params.id).setStatus(PumpCodes.Active);
    } else {
        state.addPump(req.params.id);
    }
    wsServer.sendState();
    res.json(state.getPump(req.params.id));
});
app.get('/pump/stop/:id', (req, res) => {
    if(state.pumps.find(pump => pump.name === req.params.id)) {
        state.getPump(req.params.id).setStatus(PumpCodes.Inactive);
    } else {
        state.addPump(req.params.id);
    }
    wsServer.sendState();
    res.json(state.getPump(req.params.id));
});

app.get('/status', (req, res) => {
    res.json(state)
});

app.get('/switch/init/:id/:status', (req, res) => {
    if(state.switches.find(Switch => Switch.name === req.params.id)) {
        res.json({"info": "Switch already initialized"})
    } else {
        state.addSwitch(req.params.id);
        wsServer.sendState();
        res.json(state.getSwitch(req.params.id));
    }
});
app.get('/switch/:id/:status', (req, res) => {
    if(state.switches.find(Switch => Switch.name === req.params.id)) {
        state.getSwitch(req.params.id).setStatus(parseInt(req.params.status));
    } else {
        state.addSwitch(req.params.id);
    }
    wsServer.sendState();
    res.json(state.getSwitch(req.params.id));
})

app.get('/peristaltic_pump/init/:id/:direction', (req, res) => {
    if(state.peristalticPumps.find(peristalticPump => peristalticPump.name === req.params.id)) {
        res.json({"info": "Peristaltic Pump already initialized"})
    } else {
        state.addPeristalticPump(req.params.id, {direction: stringToDirection[req.params.direction], on: false});
        console.log(state.getPeristalticPump(req.params.id));
        wsServer.sendState();
        res.json(state.getPeristalticPump(req.params.id));
    }
})

app.get('/peristaltic_pump/start/:id/:direction', (req, res) => {
    if(state.peristalticPumps.find(peristalticPump => peristalticPump.name === req.params.id)) {
        state.getPeristalticPump(req.params.id).setStatus({direction: stringToDirection[req.params.direction], on: true});
    } else {
        state.addPeristalticPump(req.params.id, {direction: stringToDirection[req.params.direction], on: true});
    }
    console.log(state.getPeristalticPump(req.params.id));
    wsServer.sendState();
    res.json(state.getPeristalticPump(req.params.id));
});

app.get('/peristaltic_pump/stop/:id/:direction', (req, res) => {
    if(state.peristalticPumps.find(peristalticPump => peristalticPump.name === req.params.id)) {
        state.getPeristalticPump(req.params.id).setStatus({direction: stringToDirection[req.params.direction], on: false});
    } else {
        state.addPeristalticPump(req.params.id, {direction: stringToDirection[req.params.direction], on: false});
    }
    console.log(state.getPeristalticPump(req.params.id));
    wsServer.sendState();
    res.json(state.getPeristalticPump(req.params.id));
});

app.get("*", (req, res) => {
    res.send("Hitting" + req.url)
})

server.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`)
})