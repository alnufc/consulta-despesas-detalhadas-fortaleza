const nLinhasPagina = 20; //contagem de elementos por pagina
let paginaAtual = 1; //pagina padrão
let arrayData = []; 
let nomeColunas = []; //

async function carregarCSV() {
    try {
        const resposta = await fetch("src/dados/Despesas_detalhadas.csv"); // realiza o fetch do csv

        if (!resposta.ok) {
            throw new Error("Erro HTTP " + resposta.status);
        }

        const csv = await resposta.text();

        const rows = csv.split("\n").filter(r => r.trim() !== "");

        // cria o cabeçalho colunas
        nomeColunas = rows[0].split(";").map(h => h.trim());
        nomeColunas.unshift("ID");

        // Identifica índices das colunas de data
        const dateIndexes = nomeColunas
            .map((h, i) => h.toLowerCase().includes("data") ? i : -1)
            .filter(i => i !== -1);

        arrayData = rows.slice(1).map((row, index) => {
            const cols = row.split(";").map(c => normalizeValue(c.trim()));
            cols.forEach((value, i) => {
                if (dateIndexes.includes(i + 1)) {
                    cols[i] = formatDate(value);
                }
            });
            return [index + 1, ...cols];
        });

        renderizarTabela();
        updatePagination();

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

//formata todas as datas da tabela 
function formatDate(value) {
    if (value === "Indefinido") return value;

    // formatação timezone 
    const isoTZ = value.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (isoTZ) {
        return `${isoTZ[3]}/${isoTZ[2]}/${isoTZ[1]}`;
    }

    // deixa padrão brasileiro data
    const iso = value.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})$/);
    if (iso) {
        return `${iso[3]}/${iso[2]}/${iso[1]}`;
    }

    // verificase ja num ta pouco usado
    const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) {
        return value;
    }

    return value;
}


function renderizarTabela() {
    const table = document.getElementById("tabelaCSV"); //pega o id html da tabela
    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");

    thead.innerHTML = "";
    tbody.innerHTML = "";

    //criação header coluna
    const trHead = document.createElement("tr");
    nomeColunas.forEach(h => {
        const th = document.createElement("th");
        th.textContent = h;
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);

    // Paginação
    const start = (paginaAtual - 1) * nLinhasPagina;
    const end = start + nLinhasPagina;
    const pageData = arrayData.slice(start, end);

    pageData.forEach(row => {
        const tr = document.createElement("tr");
        row.forEach(col => {
            const td = document.createElement("td");
            td.textContent = col;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
}

//atualiza a pagina
function updatePagination() {
    const totalPages = Math.ceil(arrayData.length / nLinhasPagina);

    document.getElementById("pageInfo").textContent =
        `Página ${paginaAtual} de ${totalPages}`;

    document.getElementById("prev").disabled = paginaAtual === 1;
    document.getElementById("next").disabled = paginaAtual === totalPages;
}

//evento de passar a pagina
document.getElementById("next").addEventListener("click", () => {
    const totalPages = Math.ceil(arrayData.length / nLinhasPagina);
    if (paginaAtual < totalPages) {
        paginaAtual++;
        renderizarTabela();
        updatePagination();
    }
});

//evento de voltar pagina
document.getElementById("prev").addEventListener("click", () => {
    if (paginaAtual > 1) {
        paginaAtual--;
        renderizarTabela();
        updatePagination();
    }
});

carregarCSV();