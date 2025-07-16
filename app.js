import express from 'express'
import morgan from 'morgan'
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import crypto from 'crypto';

import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const app = express()
const upload = multer({ dest: 'uploads/' });

const __dirname = dirname(fileURLToPath(import.meta.url))
app.set('port', process.env.PORT || 3000)

app.use(morgan('dev'))
app.use(express.urlencoded({ limit: '5mb', extended: true }))
app.use(express.json({ limit: '5mb' }))
app.use(express.static(join(__dirname, 'public')))
app.use('/firmados', express.static(join(__dirname, 'firmados')));

app.get("/", (req, res) => {
    res.sendFile(join(__dirname, 'public/index.html'))
})

const clavesDir = path.resolve('claves');
const firmadosDir = path.resolve('firmados');

if (!fs.existsSync(clavesDir)) fs.mkdirSync(clavesDir);
if (!fs.existsSync(firmadosDir)) fs.mkdirSync(firmadosDir);

const publicKeyPath = path.join(clavesDir, 'public.key');
const privateKeyPath = path.join(clavesDir, 'private.key');

app.post('/generar-llaves', (req, res) => {
    try {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
        });

        fs.writeFileSync(privateKeyPath, privateKey.export({ type: 'pkcs1', format: 'pem' }));
        fs.writeFileSync(publicKeyPath, publicKey.export({ type: 'pkcs1', format: 'pem' }));

        res.json({ message: 'Llaves generadas correctamente.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/descargar-llave/:tipo', (req, res) => {
    const tipo = req.params.tipo;
    let filePath = tipo === 'privada' ? privateKeyPath : publicKeyPath;
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('Llave no encontrada. Genera las llaves primero.');
    }
    res.download(filePath);
});

app.post('/firmar', (req, res) => {
    const { mensaje, hash } = req.body;
    if (!fs.existsSync(privateKeyPath)) {
        return res.status(400).json({ error: 'Genera las llaves primero.' });
    }
    try {
        const privKey = fs.readFileSync(privateKeyPath, 'utf8');
        const firma = crypto.sign(hash || 'sha256', Buffer.from(mensaje), {
        key: privKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
        });
        const firmaBase64 = firma.toString('base64');

        const contenidoTxt = `Mensaje original:\n${mensaje}\n\nFirma (base64):\n${firmaBase64}`;
        const archivoFirmado = path.join(firmadosDir, `mensaje_firmado_${Date.now()}.txt`);
        fs.writeFileSync(archivoFirmado, contenidoTxt);

        const rutaRelativa = path.relative(path.join(__dirname, 'public'), archivoFirmado).replace(/\\/g, '/');
        res.json({ mensaje, firma: firmaBase64, archivo: rutaRelativa });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/verificar', upload.fields([{ name: 'llave' }, { name: 'mensajeFirmado' }]), (req, res) => {
    try {
        const pubKeyFile = req.files['llave']?.[0];
        const mensajeFile = req.files['mensajeFirmado']?.[0];

        if (!pubKeyFile || !mensajeFile) {
        return res.status(400).json({ error: 'Faltan archivos.' });
        }

        const pubKey = fs.readFileSync(pubKeyFile.path, 'utf8');
        const contenido = fs.readFileSync(mensajeFile.path, 'utf8');

        const matchMensaje = contenido.match(/Mensaje original:\n([\s\S]*?)\n\nFirma/);
        const matchFirma = contenido.match(/Firma \(base64\):\n([\s\S]*)$/);

        if (!matchMensaje || !matchFirma) {
            return res.status(400).json({ error: 'Formato de archivo de mensaje firmado incorrecto.' });
        }

        const mensaje = matchMensaje[1].trim();
        const firmaBase64 = matchFirma[1].trim();
        const firmaBuffer = Buffer.from(firmaBase64, 'base64');

        const esValida = crypto.verify('sha256', Buffer.from(mensaje), {
            key: pubKey,
            padding: crypto.constants.RSA_PKCS1_PADDING,
        }, firmaBuffer);

        fs.unlinkSync(pubKeyFile.path);
        fs.unlinkSync(mensajeFile.path);

        res.json({ valido: esValida, mensaje: esValida ? 'Firma válida' : 'Firma no válida' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(app.get('port'), () => {
    console.log('Server listening on port', app.get('port'));
    console.log('http://localhost:' + app.get('port'));
});





