const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, onChildAdded, query, orderByChild, limitToLast } = require('firebase/database');

// ✅ Configura tu Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCKgGK9L0F1_a4LeA4K8rNVEuGGSU4PTuQ",
    authDomain: "checklist-limpieza-de-rastras.firebaseapp.com",
    databaseURL: "https://checklist-limpieza-de-rastras-default-rtdb.firebaseio.com",
    projectId: "checklist-limpieza-de-rastras",
    storageBucket: "checklist-limpieza-de-rastras.appspot.com",
    messagingSenderId: "652586987001",
    appId: "1:652586987001:web:31a5dcc73ff78c0ceea128"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ Crear cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot-whatsapp", dataPath: "./session" }),
    puppeteer: { headless: true }
});


// Mostrar QR en consola
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('📱 Escanea este QR con tu WhatsApp de trabajo');
});

// Cuando el cliente esté listo
client.on('ready', async () => {
    console.log('✅ Bot conectado a WhatsApp!');

    const chats = await client.getChats();
    console.log("📋 Lista de grupos encontrados:");
    chats.filter(c => c.isGroup).forEach(c => console.log(`- "${c.name}"`));

    // Grupos a los que se enviarán alertas
    const grupos = ["Producción CD1 CSD", "Transferencia Nixapa"];


    // Lista de tableros a escuchar
    const tableros = [
        "tablero1", "tablero2", "tablero3",
        "tablero4", "tablero5", "tablero6",
        "tablero7", "tablero8", "tablero9",
        "tablero10", "tablero11"
    ];

 

    // Escuchar cada tablero
    // 🔇 Esperar unos segundos al iniciar para evitar mensajes viejos
    let botListo = false;
    setTimeout(() => {
        botListo = true;
        console.log("✅ Bot listo para enviar alertas nuevas.");
    }, 15000); // puedes ajustar el tiempo (5 segundos es suficiente)

    // Escuchar cada tablero
    tableros.forEach(t => {
        const condicionesRef = ref(db, `${t}/condicionesInseguras`);
        const q = query(condicionesRef, orderByChild('timestamp'), limitToLast(1));

        onChildAdded(q, async (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            // Ignorar registros que aparecen al iniciar
            if (!botListo) {
                console.log(`⏩ Ignorado (inicio): ${t} - ${data.descripcion}`);
                return;
            }

            const mensaje = `⚠️ Nueva Condición Insegura en *${t}*\n\n📍 Área: ${data.area}\n📝 Descripción: ${data.descripcion}`;

            for (let nombre of grupos) {
                try {
                    const grupo = (await client.getChats()).find(chat => chat.name === nombre);
                    if (!grupo) {
                        console.log(`⚠️ No se encontró el grupo "${nombre}".`);
                        continue;
                    }

                    if (!mensaje || mensaje.trim() === '') {
                        console.log(`⚠️ Mensaje vacío, no se envió a "${nombre}".`);
                        continue;
                    }

                    await client.sendMessage(grupo.id._serialized, mensaje);
                    console.log(`📤 Alerta enviada a ${nombre} (desde ${t})`);
                } catch (error) {
                    console.error(`❌ Error enviando mensaje a "${nombre}":`, error.message);
                }
            }

        });
    });

    console.log("👂 Escuchando condiciones inseguras en todos los tableros...");
});


// Inicializar cliente fuera del on('ready')
client.initialize();








