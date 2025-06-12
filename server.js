// server.js
const mqtt = require('mqtt');
const WebSocket = require('ws');

// --- Konfigurasi MQTT Maqiatto (SAMA DENGAN DI ESP32) ---
const MQTT_HOST = 'mqtt://maqiatto.com'; // Gunakan mqtt:// untuk port 1883
const MQTT_PORT = 1883; // Port standar MQTT untuk koneksi dari Node.js
const MQTT_USERNAME = 'uzairheebat@gmail.com';
const MQTT_PASSWORD = 'Akunmqtt123';
const MQTT_CLIENT_ID = 'NodeJSServer_' + Math.random().toString(16).substr(2, 8);

const TOPIC_PH = 'uzairheebat@gmail.com/pH';
const TOPIC_SUHU = 'uzairheebat@gmail.com/Suhu Air';

// --- Setup WebSocket Server ---
// Akan berjalan di localhost pada port 8080 (Anda bisa ganti jika perlu)
const WSS_PORT = 8080;
const wss = new WebSocket.Server({ port: WSS_PORT });
console.log(`WebSocket server dimulai di port ${WSS_PORT}`);

wss.on('connection', (ws) => {
    console.log('Klien dashboard terhubung ke WebSocket server');
    ws.on('close', () => {
        console.log('Klien dashboard terputus dari WebSocket server');
    });
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Fungsi untuk broadcast data ke semua klien WebSocket yang terhubung
function broadcastToDashboards(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(data));
            } catch (error) {
                console.error('Gagal mengirim data ke klien WebSocket:', error);
            }
        }
    });
}

// --- Koneksi ke MQTT Maqiatto ---
const mqttClientOptions = {
    clientId: MQTT_CLIENT_ID,
    username: MQTT_USERNAME,
    password: MQTT_PASSWORD,
    port: MQTT_PORT,
    // host: MQTT_HOST, // host sudah termasuk dalam URL jika diawali mqtt://
    clean: true, // Bersihkan sesi jika koneksi terputus
    reconnectPeriod: 5000, // Coba konek ulang setiap 5 detik
    connectTimeout: 10 * 1000 // Timeout koneksi 10 detik
};

console.log(`Mencoba terhubung ke MQTT Broker: <span class="math-inline">\{MQTT\_HOST\}\:</span>{MQTT_PORT}`);
const client = mqtt.connect(MQTT_HOST, mqttClientOptions);

client.on('connect', () => {
    console.log('Terhubung ke Broker MQTT Maqiatto!');
    client.subscribe([TOPIC_PH, TOPIC_SUHU], (err) => {
        if (!err) {
            console.log(`Berhasil subscribe ke topik: ${TOPIC_PH} dan ${TOPIC_SUHU}`);
        } else {
            console.error('Gagal subscribe ke topik:', err);
        }
    });
});

client.on('message', (topic, payload) => {
    console.log(`Pesan diterima dari topik [${topic}]: ${payload.toString()}`);
    try {
        const data = JSON.parse(payload.toString());
        // Tambahkan informasi topik agar HTML tahu data apa yang datang
        const dataToSend = {
            topic: topic,
            payload: data
        };
        broadcastToDashboards(dataToSend);
    } catch (error) {
        console.error('Gagal parse JSON dari MQTT atau mengirim ke WebSocket:', error);
    }
});

client.on('error', (err) => {
    console.error('Koneksi MQTT Error:', err);
    // client.end(); // Anda mungkin ingin mencoba reconnect di sini juga atau menangani error
});

client.on('reconnect', () => {
    console.log('Mencoba menghubungkan kembali ke MQTT...');
});

client.on('close', () => {
    console.log('Koneksi MQTT terputus.');
});

client.on('offline', () => {
    console.log('MQTT Client offline.');
});