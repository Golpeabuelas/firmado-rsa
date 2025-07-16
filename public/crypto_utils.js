import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export function generarLlaves() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
    });

    fs.writeFileSync('./claves/private.key', privateKey.export({ type: 'pkcs1', format: 'pem' }));
    fs.writeFileSync('./claves/public.key', publicKey.export({ type: 'pkcs1', format: 'pem' }));

    return { publicKey, privateKey };
}

export function firmarMensaje(mensaje, privateKeyPath, hash = 'sha256') {
    const privKey = fs.readFileSync(privateKeyPath, 'utf8');
    const firma = crypto.sign(hash, Buffer.from(mensaje), {
        key: privKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
    });

    return firma.toString('base64');
}

export function verificarFirma(mensaje, firmaBase64, publicKeyPath, hash = 'sha256') {
    const pubKey = fs.readFileSync(publicKeyPath, 'utf8');
    const firma = Buffer.from(firmaBase64, 'base64');

    return crypto.verify(hash, Buffer.from(mensaje), {
        key: pubKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
    }, firma);
}

