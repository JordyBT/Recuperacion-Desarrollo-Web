
const datos = [
    {id:1, nombre:"Juan Pérez", dpi:"1234567890102", lote:"15", cuota:1000, cuotas:Array(50).fill(1000), pagos:[]},
    {id:2, nombre:"Ana López", dpi:"1234567890101", lote:"A-15", cuota:10000, cuotas:Array(12).fill(10000), pagos:[]},
    {id:3, nombre:"María García", dpi:"1234567890103", lote:"C-08", cuota:2000, cuotas:Array(20).fill(2000), pagos:[]}
];

const $ = id => document.getElementById(id);
const dinero = n => "Q " + n.toLocaleString("en-US", {
    minimumFractionDigits:2,
    maximumFractionDigits:2
});
const redondear = n => Math.round(n * 100) / 100;

let clientes;

try {
    clientes = JSON.parse(localStorage.getItem("clientesLasMarias"));
    if (!Array.isArray(clientes) || clientes.length === 0) clientes = datos;
} catch {
    clientes = datos;
}

let actual = clientes[0].id;

function cliente() {
    return clientes.find(c => c.id === actual);
}

function saldo(c) {
    return redondear(c.cuotas.reduce((a,b) => a+b, 0));
}

function guardar() {
    localStorage.setItem("clientesLasMarias", JSON.stringify(clientes));
}

function buscarCliente() {
    let texto = $("buscar").value.toLowerCase();
    let lista = $("clientes");
    lista.innerHTML = "";

    clientes.forEach(c => {
        if ((c.nombre + c.dpi + c.lote).toLowerCase().includes(texto)) {
            let opcion = document.createElement("option");
            opcion.value = c.id;
            opcion.textContent = c.nombre + " - Lote " + c.lote;
            lista.appendChild(opcion);
        }
    });

    lista.value = actual;
}

function mostrarCliente() {
    let c = cliente();

    $("saldo").textContent = dinero(saldo(c));
    $("cuota").textContent = dinero(c.cuota);
    $("lote").textContent = c.lote;
    $("historial").innerHTML = "";
    $("recibo").hidden = true;

    c.pagos.slice().reverse().forEach(p => {
        let fila = document.createElement("tr");

        [p.fecha, p.tipo, dinero(p.monto), p.numero].forEach(dato => {
            let celda = document.createElement("td");
            celda.textContent = dato;
            fila.appendChild(celda);
        });

        $("historial").appendChild(fila);
    });

    calcular();
}

function calcular() {
    let c = cliente();
    let tipo = document.querySelector('input[name="tipo"]:checked').value;
    let total = 0;

    $("grupoMeses").hidden = tipo !== "meses";
    $("grupoMonto").hidden = tipo === "meses";

    if (tipo === "meses") {
        let cantidad = Number($("meses").value);
        total = c.cuotas.filter(x => x > 0)
            .slice(0, cantidad)
            .reduce((a,b) => a+b, 0);
    } else {
        total = Number($("monto").value) || 0;
    }

    if (total < 0 || !Number.isFinite(total)) total = 0;

    $("total").textContent = dinero(total);
    return redondear(total);
}

function registrarPago() {
    let c = cliente();
    let tipo = document.querySelector('input[name="tipo"]:checked').value;
    let monto = calcular();

    if (monto <= 0 || monto > saldo(c)) {
        alert("Ingrese un monto válido.");
        return;
    }

    if (!$("fecha").value) {
        alert("Seleccione una fecha.");
        return;
    }

    let restante = monto;

    if (tipo === "capital") {
        for (let i = c.cuotas.length - 1; i >= 0 && restante > 0; i--) {
            let abono = Math.min(restante, c.cuotas[i]);
            c.cuotas[i] = redondear(c.cuotas[i] - abono);
            restante = redondear(restante - abono);
        }
    } else {
        for (let i = 0; i < c.cuotas.length && restante > 0; i++) {
            let abono = Math.min(restante, c.cuotas[i]);
            c.cuotas[i] = redondear(c.cuotas[i] - abono);
            restante = redondear(restante - abono);
        }
    }

    let nombres = {
        meses:"Mensualidades",
        capital:"Abono a capital",
        variable:"Pago variable"
    };

    let pago = {
        numero:"REC-" + Date.now(),
        fecha:$("fecha").value,
        tipo:nombres[tipo],
        monto:monto,
        metodo:$("metodo").value,
        referencia:$("referencia").value
    };

    c.pagos.push(pago);
    guardar();
    mostrarCliente();

    $("mensaje").textContent = "Pago registrado correctamente.";

    $("datosRecibo").textContent =
        "Recibo: " + pago.numero +
        " | Cliente: " + c.nombre +
        " | Lote: " + c.lote +
        " | Fecha: " + pago.fecha +
        " | Concepto: " + pago.tipo +
        " | Total: " + dinero(monto) +
        " | Método: " + pago.metodo;

    $("recibo").hidden = false;
    $("monto").value = "";
    $("referencia").value = "";
}

function agregarCliente() {
    let nombre = $("nuevoNombre").value.trim();
    let dpi = $("nuevoDpi").value.trim();
    let lote = $("nuevoLote").value.trim();
    let monto = Number($("nuevoSaldo").value);
    let cuota = Number($("nuevaCuota").value);

    if (!nombre || !dpi || !lote || monto <= 0 || cuota <= 0 ||
        !Number.isFinite(monto) || !Number.isFinite(cuota)) {
        alert("Complete todos los datos correctamente.");
        return;
    }

    if (clientes.some(c => c.dpi === dpi)) {
        alert("Este DPI ya está registrado.");
        return;
    }

    if (clientes.some(c => c.lote.toLowerCase() === lote.toLowerCase())) {
        alert("Este lote ya está asignado.");
        return;
    }

    monto = redondear(monto);
    cuota = redondear(cuota);

    let cantidad = Math.ceil(monto / cuota);
    let cuotas = [];

    if (cantidad > 600) {
        alert("El financiamiento supera el límite del prototipo.");
        return;
    }

    for (let i = 0; i < cantidad; i++) {
        cuotas.push(redondear(Math.min(cuota, monto - i * cuota)));
    }

    let nuevo = {
        id: Date.now(),
        nombre:nombre,
        dpi:dpi,
        lote:lote,
        cuota:cuota,
        cuotas:cuotas,
        pagos:[]
    };

    clientes.push(nuevo);
    actual = nuevo.id;
    guardar();

    $("buscar").value = "";
    buscarCliente();
    mostrarCliente();

    $("nuevoNombre").value = "";
    $("nuevoDpi").value = "";
    $("nuevoLote").value = "";
    $("nuevoSaldo").value = "";
    $("nuevaCuota").value = "";

    alert("Cliente agregado correctamente.");
}

function eliminarCliente() {
    let c = cliente();

    if (clientes.length === 1) {
        alert("Debe existir al menos un cliente.");
        return;
    }

    if (!confirm("¿Desea eliminar a " + c.nombre + " y todos sus pagos?")) {
        return;
    }

    clientes = clientes.filter(x => x.id !== actual);
    actual = clientes[0].id;

    guardar();

    $("buscar").value = "";
    buscarCliente();
    mostrarCliente();

    alert("Cliente eliminado correctamente.");
}

$("buscar").addEventListener("input", buscarCliente);

$("clientes").addEventListener("change", function() {
    actual = Number(this.value);
    mostrarCliente();
});

document.querySelectorAll('input[name="tipo"]').forEach(radio => {
    radio.addEventListener("change", calcular);
});

$("meses").addEventListener("change", calcular);
$("monto").addEventListener("input", calcular);
$("registrar").addEventListener("click", registrarPago);
$("agregarCliente").addEventListener("click", agregarCliente);
$("eliminarCliente").addEventListener("click", eliminarCliente);

$("fecha").value = new Date().toLocaleDateString("en-CA");

buscarCliente();
mostrarCliente();
