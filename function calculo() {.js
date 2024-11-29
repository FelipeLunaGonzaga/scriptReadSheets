function calcular() {

    voos = parseFloat(document.getElementById("voos").value);

    if (isNaN(voos) || voos < 0) {
        alert("Insira um valor válido de voos, companheiro(a).");
        return;
    } 

    const consoles = 0.0845 * voos + 0.0506;
    const controladores = 0.0833 * voos + 2.1224;
    
    const consolesArredondado = consoles.toFixed(2);
    const controladoresArredondado = consoles.toFixed(2);

    document.getElementById("result").innerHTML = `
    
    Para ${voos} voos:<br>
    Consoles necessárias: ${consolesArredondado}<br>
    Controladores necessários: ${controladoresArredondado}
    `;
}   