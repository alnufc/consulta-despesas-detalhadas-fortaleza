// ================= CONFIGURAÇÕES =================

//quantidade de linhas por página
const nLinhasPagina = 20;

//pagina atual
let paginaAtual = 1;

//array com todos os dados
let arrayData = [];

//array após filtros e ordenação
let arrayFiltrado = [];

//nome das colunas
let nomeColunas = [];

//controle de ordenação
let colunaOrdenada = null;
let ordemAscendente = true;



async function carregarCSV() {
    try {
        const resposta = await fetch("src/dados/Despesas_detalhadas.csv");

        if (!resposta.ok) {
            throw new Error("Erro HTTP " + resposta.status);
        }

        const csv = await resposta.text();

        const rows = csv.split("\n").filter(r => r.trim() !== "");

        //cria cabeçalho das colunas
        nomeColunas = rows[0].split(";").map(h => h.trim());
        nomeColunas.unshift("ID");

        //identifica colunas de data
        const dateIndexes = nomeColunas
            .map((h, i) => h.toLowerCase().includes("data") ? i : -1)
            .filter(i => i !== -1);

        //monta array principal
        arrayData = rows.slice(1).map((row, index) => {
            const cols = row.split(";").map(c => normalizeValue(c.trim()));

            cols.forEach((value, i) => {
                if (dateIndexes.includes(i + 1)) {
                    cols[i] = formatDate(value);
                }
            });

            return [index + 1, ...cols];
        });

        arrayFiltrado = [...arrayData];

        renderizarTabela();
        updatePagination();
        atualizarCards();

    } catch (erro) {
        console.error("Erro ao carregar CSV:", erro);
    }
}



//converte null e undefined em indefinido
function normalizeValue(value) {
    if (!value || value.toLowerCase() === "null" || value.toLowerCase() === "undefined") {
        return "Indefinido";
    }
    return value;
}



function formatDate(value) {
    if (value === "Indefinido") return value;

    const isoTZ = value.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (isoTZ) return `${isoTZ[3]}/${isoTZ[2]}/${isoTZ[1]}`;

    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

    return value;
}



function aplicarFiltros() {

    const ocultarIndefinidos =
        document.getElementById("filtroValoresIndefinidos").checked;

    const valorMin =
        parseFloat(document.getElementById("filtroValorMinimo").value);

    const valorMax =
        parseFloat(document.getElementById("filtroValorMaximo").value);

    const tipoFavorecido =
        document.querySelector(".filtroCPF\\/CNPJ").value;

    arrayFiltrado = arrayData.filter(row => {

        const valorIndex = nomeColunas.indexOf("Valor");
        const cpfCnpjIndex = nomeColunas.indexOf("CPF/CNPJ");

        const valor = parseFloat(
            row[valorIndex]?.replace(".", "").replace(",", ".")
        );

        const cpfCnpj = row[cpfCnpjIndex];

        if (ocultarIndefinidos && row.includes("Indefinido")) return false;

        if (!isNaN(valorMin) && (isNaN(valor) || valor < valorMin)) return false;

        if (!isNaN(valorMax) && (isNaN(valor) || valor > valorMax)) return false;

        if (tipoFavorecido !== "AMBOS") {
            if (tipoFavorecido === "CPF" && cpfCnpj?.length > 14) return false;
            if (tipoFavorecido === "CNPJ" && cpfCnpj?.length <= 14) return false;
        }

        return true;
    });

    aplicarOrdenacao();

    paginaAtual = 1;
    renderizarTabela();
    updatePagination();
    atualizarCards();
}



function ordenarPorColuna(index) {

    if (colunaOrdenada === index) {
        ordemAscendente = !ordemAscendente;
    } else {
        colunaOrdenada = index;
        ordemAscendente = true;
    }

    aplicarOrdenacao();
    renderizarTabela();
}

function aplicarOrdenacao() {

    if (colunaOrdenada === null) return;

    arrayFiltrado.sort((a, b) => {
        let valA = a[colunaOrdenada];
        let valB = b[colunaOrdenada];

        const numA = parseFloat(valA?.replace(".", "").replace(",", "."));
        const numB = parseFloat(valB?.replace(".", "").replace(",", "."));

        if (!isNaN(numA) && !isNaN(numB)) {
            return ordemAscendente ? numA - numB : numB - numA;
        }

        return ordemAscendente
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
    });
}



function renderizarTabela() {

    const thead = document.querySelector("#tabelaCSV thead");
    const tbody = document.querySelector("#tabelaCSV tbody");

    thead.innerHTML = "";
    tbody.innerHTML = "";

    //header com ordenação
    const trHead = document.createElement("tr");
    nomeColunas.forEach((col, index) => {
        const th = document.createElement("th");
        th.textContent = col;
        th.style.cursor = "pointer";

        th.addEventListener("click", () => ordenarPorColuna(index));
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);

    const start = (paginaAtual - 1) * nLinhasPagina;
    const end = start + nLinhasPagina;

    arrayFiltrado.slice(start, end).forEach(row => {
        const tr = document.createElement("tr");
        row.forEach(col => {
            const td = document.createElement("td");
            td.textContent = col;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}



function updatePagination() {
    const totalPages = Math.ceil(arrayFiltrado.length / nLinhasPagina);

    document.getElementById("pageInfo").textContent =
        `Página ${paginaAtual} de ${totalPages}`;

    document.getElementById("prev").disabled = paginaAtual === 1;
    document.getElementById("next").disabled = paginaAtual === totalPages;
}

document.getElementById("next").addEventListener("click", () => {
    const totalPages = Math.ceil(arrayFiltrado.length / nLinhasPagina);
    if (paginaAtual < totalPages) {
        paginaAtual++;
        renderizarTabela();
        updatePagination();
    }
});

document.getElementById("prev").addEventListener("click", () => {
    if (paginaAtual > 1) {
        paginaAtual--;
        renderizarTabela();
        updatePagination();
    }
});



function atualizarCards() {

    let totalGasto = 0;
    let totalAnulado = 0;
    let contadorValores = 0;

    const valorIndex = nomeColunas.indexOf("Valor");
    const anuladoIndex = nomeColunas.indexOf("Valor anulado");

    arrayFiltrado.forEach(row => {

        const valor = parseFloat(
            row[valorIndex]?.replace(".", "").replace(",", ".")
        );

        if (!isNaN(valor)) {
            totalGasto += valor;
            contadorValores++;
        }

        const anulado = parseFloat(
            row[anuladoIndex]?.replace(".", "").replace(",", ".")
        );

        if (!isNaN(anulado)) totalAnulado += anulado;
    });

    const valorMedio = contadorValores > 0
        ? totalGasto / contadorValores
        : 0;

    document.getElementById("valor-totalGasto").textContent =
        totalGasto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    document.getElementById("valor-total-anulado").textContent =
        totalAnulado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    document.getElementById("valor-quantidadeRegistros").textContent =
        arrayFiltrado.length.toLocaleString("pt-BR");

    document.getElementById("valor-medio").textContent =
        valorMedio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}



document.getElementById("filtroValoresIndefinidos")
    .addEventListener("change", aplicarFiltros);

document.getElementById("filtroValorMinimo")
    .addEventListener("input", aplicarFiltros);

document.getElementById("filtroValorMaximo")
    .addEventListener("input", aplicarFiltros);

document.querySelector(".filtroCPF\\/CNPJ")
    .addEventListener("change", aplicarFiltros);



carregarCSV();

const btnTheme = document.getElementById("toggle-theme");

btnTheme.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});
