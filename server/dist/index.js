var express = require('express');
var morgan = require('morgan');
var http = require('http');
var websocket = require('ws');
var app = express();
var port = 3001;
var server = http.createServer(app);
var wss = new websocket.Server({ server: server });
app.use(morgan('tiny'));
var PumpCodes;
(function (PumpCodes) {
    PumpCodes[PumpCodes["Inactive"] = 0] = "Inactive";
    PumpCodes[PumpCodes["Active"] = 1] = "Active";
})(PumpCodes || (PumpCodes = {}));
var SwitchCodes;
(function (SwitchCodes) {
    SwitchCodes[SwitchCodes["Off"] = 0] = "Off";
    SwitchCodes[SwitchCodes["On"] = 1] = "On";
})(SwitchCodes || (SwitchCodes = {}));
var PeristalticPumpDirection;
(function (PeristalticPumpDirection) {
    PeristalticPumpDirection[PeristalticPumpDirection["COUNTERCLOCKWISE"] = 0] = "COUNTERCLOCKWISE";
    PeristalticPumpDirection[PeristalticPumpDirection["CLOCKWISE"] = 1] = "CLOCKWISE";
})(PeristalticPumpDirection || (PeristalticPumpDirection = {}));
var stringToDirection = {
    "clockwise": PeristalticPumpDirection.CLOCKWISE,
    "counter-clockwise": PeristalticPumpDirection.COUNTERCLOCKWISE
};
var Pump = /** @class */ (function () {
    function Pump(name) {
        this.id = Date.now();
        this.name = name;
        this.status = PumpCodes.Inactive;
    }
    Pump.prototype.setStatus = function (status) {
        this.status = status;
    };
    return Pump;
}());
var PeristalticPump = /** @class */ (function () {
    function PeristalticPump(name, status) {
        this.id = Date.now();
        this.name = name;
        this.status = status;
    }
    PeristalticPump.prototype.setStatus = function (status) {
        this.status = status;
    };
    return PeristalticPump;
}());
var Switch = /** @class */ (function () {
    function Switch(name) {
        this.id = Date.now();
        this.name = name;
        this.status = SwitchCodes['Off'];
    }
    Switch.prototype.setStatus = function (status) {
        this.status = status;
    };
    return Switch;
}());
var State = /** @class */ (function () {
    function State() {
        this.pumps = [];
        this.switches = [];
        this.peristalticPumps = [];
    }
    State.prototype.addPump = function (name) {
        this.pumps.push(new Pump(name));
    };
    State.prototype.getPump = function (id) {
        return this.pumps.find(function (pump) { return pump.name === id; });
    };
    State.prototype.addSwitch = function (name) {
        this.switches.push(new Switch(name));
    };
    State.prototype.getSwitch = function (id) {
        return this.switches.find(function (Switch) { return Switch.name === id; });
    };
    State.prototype.addPeristalticPump = function (name, status) {
        this.peristalticPumps.push(new PeristalticPump(name, status));
    };
    State.prototype.getPeristalticPump = function (id) {
        return this.peristalticPumps.find(function (peristalticPump) { return peristalticPump.name === id; });
    };
    return State;
}());
var WebSocketServer = /** @class */ (function () {
    function WebSocketServer(server) {
        this.ws = server;
    }
    WebSocketServer.prototype.sendState = function () {
        this.ws.clients.forEach(function (client) {
            client.send(JSON.stringify(state));
        });
    };
    return WebSocketServer;
}());
var state = new State();
var wsServer = new WebSocketServer(wss);
function init() {
    fetch('http://espgarden.local').then(function (res) { return res.json(); }).then(function (data) {
        if (data) {
            for (var pump in data.pumps) {
                state.addPump(pump);
                state.getPump(pump).setStatus(data.pumps[pump]);
            }
            for (var Switch_1 in data.float_switches) {
                state.addSwitch(Switch_1);
                state.getSwitch(Switch_1).setStatus(data.float_switches[Switch_1]);
            }
            for (var PeristalticPump_1 in data.peristaltic_pumps) {
                state.addPeristalticPump(PeristalticPump_1, data.peristaltic_pumps[PeristalticPump_1]);
            }
            console.log(state);
            console.log('Data received from server');
            console.log(data);
            wsServer.sendState();
        }
        else {
            console.log('No data received from server');
        }
    }).catch(function (err) {
        console.log(err);
    });
}
init();
wss.on('connection', function () {
    console.log('establish websocket connection');
    wsServer.sendState();
});
app.get('/init', function (req, res) {
    state = new State();
    wsServer.sendState();
    res.json({ "info": "Server initialized", "server_time": Date.now() });
});
app.get('/pump/init/:id', function (req, res) {
    if (state.pumps.find(function (pump) { return pump.name === req.params.id; })) {
        res.json({ "info": "Pump already initialized" });
    }
    else {
        state.addPump(req.params.id);
        wsServer.sendState();
        res.json(state.getPump(req.params.id));
    }
});
app.get('/pump/start/:id', function (req, res) {
    if (state.pumps.find(function (pump) { return pump.name === req.params.id; })) {
        state.getPump(req.params.id).setStatus(PumpCodes.Active);
    }
    else {
        state.addPump(req.params.id);
    }
    wsServer.sendState();
    res.json(state.getPump(req.params.id));
});
app.get('/pump/stop/:id', function (req, res) {
    if (state.pumps.find(function (pump) { return pump.name === req.params.id; })) {
        state.getPump(req.params.id).setStatus(PumpCodes.Inactive);
    }
    else {
        state.addPump(req.params.id);
    }
    wsServer.sendState();
    res.json(state.getPump(req.params.id));
});
app.get('/status', function (req, res) {
    res.json(state);
});
app.get('/switch/init/:id/:status', function (req, res) {
    if (state.switches.find(function (Switch) { return Switch.name === req.params.id; })) {
        res.json({ "info": "Switch already initialized" });
    }
    else {
        state.addSwitch(req.params.id);
        wsServer.sendState();
        res.json(state.getSwitch(req.params.id));
    }
});
app.get('/switch/:id/:status', function (req, res) {
    if (state.switches.find(function (Switch) { return Switch.name === req.params.id; })) {
        state.getSwitch(req.params.id).setStatus(parseInt(req.params.status));
    }
    else {
        state.addSwitch(req.params.id);
    }
    wsServer.sendState();
    res.json(state.getSwitch(req.params.id));
});
app.get('/peristaltic_pump/init/:id/:direction', function (req, res) {
    if (state.peristalticPumps.find(function (peristalticPump) { return peristalticPump.name === req.params.id; })) {
        res.json({ "info": "Peristaltic Pump already initialized" });
    }
    else {
        state.addPeristalticPump(req.params.id, { direction: stringToDirection[req.params.direction], on: false });
        console.log(state.getPeristalticPump(req.params.id));
        wsServer.sendState();
        res.json(state.getPeristalticPump(req.params.id));
    }
});
app.get('/peristaltic_pump/start/:id/:direction', function (req, res) {
    if (state.peristalticPumps.find(function (peristalticPump) { return peristalticPump.name === req.params.id; })) {
        state.getPeristalticPump(req.params.id).setStatus({ direction: stringToDirection[req.params.direction], on: true });
    }
    else {
        state.addPeristalticPump(req.params.id, { direction: stringToDirection[req.params.direction], on: true });
    }
    console.log(state.getPeristalticPump(req.params.id));
    wsServer.sendState();
    res.json(state.getPeristalticPump(req.params.id));
});
app.get('/peristaltic_pump/stop/:id/:direction', function (req, res) {
    if (state.peristalticPumps.find(function (peristalticPump) { return peristalticPump.name === req.params.id; })) {
        state.getPeristalticPump(req.params.id).setStatus({ direction: stringToDirection[req.params.direction], on: false });
    }
    else {
        state.addPeristalticPump(req.params.id, { direction: stringToDirection[req.params.direction], on: false });
    }
    console.log(state.getPeristalticPump(req.params.id));
    wsServer.sendState();
    res.json(state.getPeristalticPump(req.params.id));
});
app.get("*", function (req, res) {
    res.send("Hitting" + req.url);
});
server.listen(port, function () {
    console.log("App listening at http://localhost:".concat(port));
});
