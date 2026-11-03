// Broker MQTT 3.1.1 mínimo sobre WebSocket para las pruebas del multijugador (sin dependencias).
// Soporta CONNECT (con LWT), SUBSCRIBE/UNSUBSCRIBE con comodines + y #, PUBLISH QoS 0 con retención,
// PINGREQ y DISCONNECT. Uso: node tests/mqtt_test_broker.mjs [puerto]   (por defecto 18830)
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.argv[2] || process.env.PORT || 18830);
const clients = new Set();
const retained = new Map();
let published = 0;

const match = (filter, topic) => {
    const f = filter.split('/'), t = topic.split('/');
    for (let i = 0; i < f.length; i++) {
        if (f[i] === '#') return true;
        if (i >= t.length) return false;
        if (f[i] !== '+' && f[i] !== t[i]) return false;
    }
    return f.length === t.length;
};
const str = (s) => { const b = Buffer.from(s); return Buffer.concat([Buffer.from([b.length >> 8, b.length & 255]), b]); };
const pkt = (type, body) => {
    const len = []; let n = body.length;
    do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; len.push(d); } while (n > 0);
    return Buffer.concat([Buffer.from([type, ...len]), body]);
};
const pubPkt = (topic, payload, retain) => pkt(0x30 | (retain ? 1 : 0), Buffer.concat([str(topic), payload]));

function wsSend(sock, data) {
    const len = data.length;
    let head;
    if (len < 126) head = Buffer.from([0x82, len]);
    else if (len < 65536) head = Buffer.from([0x82, 126, len >> 8, len & 255]);
    else { head = Buffer.alloc(10); head[0] = 0x82; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
    try { sock.write(Buffer.concat([head, data])); } catch (_) { /* noop */ }
}

function route(topic, payload, retain, from) {
    published++;
    if (retain) { if (payload.length) retained.set(topic, payload); else retained.delete(topic); }
    for (const c of clients) {
        if (!c.ok) continue;
        if ([...c.subs].some(f => match(f, topic))) wsSend(c.sock, pubPkt(topic, payload, false));
    }
}

function onPacket(c, type, body) {
    switch (type >> 4) {
        case 1: { // CONNECT
            let p = 0;
            const rd = () => { const l = body.readUInt16BE(p); const v = body.subarray(p + 2, p + 2 + l); p += 2 + l; return v; };
            rd(); const level = body[p++]; const flags = body[p++]; p += 2;
            c.id = rd().toString();
            if (flags & 0x04) c.will = { topic: rd().toString(), payload: Buffer.from(rd()), retain: !!(flags & 0x20) };
            c.ok = level === 4;
            wsSend(c.sock, Buffer.from([0x20, 2, 0, c.ok ? 0 : 1]));
            break;
        }
        case 3: { // PUBLISH
            const tl = body.readUInt16BE(0), topic = body.subarray(2, 2 + tl).toString();
            let p = 2 + tl; if ((type >> 1) & 3) p += 2;
            route(topic, body.subarray(p), !!(type & 1), c);
            break;
        }
        case 8: { // SUBSCRIBE
            const id = body.readUInt16BE(0); let p = 2; const codes = [];
            while (p < body.length) {
                const l = body.readUInt16BE(p); const f = body.subarray(p + 2, p + 2 + l).toString(); p += 3 + l;
                c.subs.add(f); codes.push(0);
                for (const [t, pl] of retained) if (match(f, t)) wsSend(c.sock, pubPkt(t, pl, true));
            }
            wsSend(c.sock, pkt(0x90, Buffer.from([id >> 8, id & 255, ...codes])));
            break;
        }
        case 10: { // UNSUBSCRIBE
            const id = body.readUInt16BE(0); let p = 2;
            while (p < body.length) { const l = body.readUInt16BE(p); c.subs.delete(body.subarray(p + 2, p + 2 + l).toString()); p += 2 + l; }
            wsSend(c.sock, Buffer.from([0xB0, 2, id >> 8, id & 255]));
            break;
        }
        case 12: wsSend(c.sock, Buffer.from([0xD0, 0])); break; // PINGREQ
        case 14: c.graceful = true; c.sock.end(); break;            // DISCONNECT
    }
}

function onMqttData(c, chunk) {
    c.mbuf = Buffer.concat([c.mbuf, chunk]);
    for (;;) {
        const b = c.mbuf; if (b.length < 2) return;
        let mult = 1, len = 0, i = 1, byte;
        do { if (i >= b.length) return; byte = b[i++]; len += (byte & 127) * mult; mult *= 128; } while ((byte & 128) && i < 5);
        if (b.length < i + len) return;
        const type = b[0], body = b.subarray(i, i + len);
        c.mbuf = b.subarray(i + len);
        onPacket(c, type, Buffer.from(body));
    }
}

function onWsData(c, chunk) {
    c.wbuf = Buffer.concat([c.wbuf, chunk]);
    for (;;) {
        const b = c.wbuf; if (b.length < 2) return;
        const op = b[0] & 15, masked = b[1] & 128; let len = b[1] & 127, p = 2;
        if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); p = 4; }
        else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); p = 10; }
        const mask = masked ? b.subarray(p, p + 4) : null; if (masked) p += 4;
        if (b.length < p + len) return;
        const data = Buffer.from(b.subarray(p, p + len));
        if (mask) for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
        c.wbuf = b.subarray(p + len);
        if (op === 8) { c.sock.end(); return; }
        if (op === 9) { c.sock.write(Buffer.concat([Buffer.from([0x8A, data.length]), data])); continue; }
        if (op === 2 || op === 0) onMqttData(c, data);
    }
}

const server = http.createServer((req, res) => {
    if (req.url === '/stats') { res.end(JSON.stringify({ clients: clients.size, retained: [...retained.keys()], published })); return; }
    res.writeHead(426); res.end('WebSocket only');
});
server.on('upgrade', (req, sock) => {
    const key = req.headers['sec-websocket-key'];
    const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\nSec-WebSocket-Protocol: mqtt\r\n\r\n`);
    sock.setNoDelay(true);
    const c = { sock, subs: new Set(), wbuf: Buffer.alloc(0), mbuf: Buffer.alloc(0), ok: false, will: null, graceful: false };
    clients.add(c);
    sock.on('data', (d) => onWsData(c, d));
    const gone = () => {
        if (!clients.delete(c)) return;
        if (c.will && !c.graceful) route(c.will.topic, c.will.payload, c.will.retain, c);
    };
    sock.on('close', gone); sock.on('error', gone);
});
server.listen(PORT, () => console.log('MQTT/WS de pruebas en ws://localhost:' + PORT));
