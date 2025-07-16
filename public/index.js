async function generar() {
    try {
        const res = await fetch('/generar-llaves', {
            method: 'POST'
        });
        const data = await res.json();
        alert(data.message);
    } catch (error) {
        alert('Error al generar llaves: ' + error.message);
    }
}

async function firmar() {
    const mensaje = document.getElementById('mensaje').value.trim();
    const hash = document.getElementById('hash').value;

    if (!mensaje) {
        alert('Por favor, escribe un mensaje para firmar.');
        return;
    }

    try {
        const res = await fetch('/firmar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensaje, hash })
        });

        const data = await res.json();

        if (data.error) {
            document.getElementById('resultado').innerText = 'Error: ' + data.error;
            return;
        }

        document.getElementById('resultado').innerText = `Mensaje firmado:\n${data.firma}`;

        if (data.archivo) {
            const link = document.createElement('a');
            link.href = data.archivo;
            link.download = 'mensaje_firmado.txt';
            document.body.appendChild(link);
            link.click();
            link.remove();
        }
    } catch (error) {
        document.getElementById('resultado').innerText = 'Error al firmar: ' + error.message;
    }
}

window.generar = generar;
window.firmar = firmar;
