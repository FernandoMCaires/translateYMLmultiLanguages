const fs = require('fs');
const path = require('path'); 
const readline = require('readline'); 
const translate = require('google-translate-api-x'); 

const inputFile = './pt-br.yml'; // Arquivo fonte com textos em português para traduzir
const idiomas = process.argv.slice(2); // Captura idiomas passados via linha de comando (ex: node script.js en es)

// Verifica se o usuário passou pelo menos um idioma para tradução
if (idiomas.length === 0) {
  console.error('❌ Informe pelo menos um idioma. Ex: node traduzir-linhas.js en');
  process.exit(1);
}


function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função para limpar o valor da string, removendo espaços e aspas extras
function cleanValue(valor) {
  return valor.trim()                  
    .replace(/^["']|["']$/g, '')       
    .trim();                          
}

// Função assíncrona para traduzir uma linha de texto para o idioma destino
async function traduzirLinha(valor, idiomaDestino, tentativas = 5, espera = 1000) {
  try {
    // Chama a API de tradução, de 'pt' para o idioma destino
    const res = await translate(valor, { from: 'pt', to: idiomaDestino });
    // Remove quebras de linha no texto traduzido para evitar problemas no YML
    return res.text.replace(/\n/g, ' ');
  } catch (err) {
    // Caso dê erro, cria uma pasta 'logs' se não existir para armazenar logs de erro
    const logDir = path.resolve(__dirname, 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }

    // Caminho do arquivo de log específico para o idioma (ex: logs/erro-traducao-en.log)
    const logFile = path.join(logDir, `erro-traducao-${idiomaDestino}.log`);

    // Conteúdo do log contendo data, texto original e mensagem do erro
    const logContent = `[${new Date().toISOString()}] "${valor}" - Erro: ${err.message}\n`;

    // Anexa o conteúdo no arquivo de log, criando-o se não existir
    fs.appendFileSync(logFile, logContent, 'utf8');

    // Se acabou o número de tentativas, exibe erro definitivo e retorna o texto original
    if (tentativas === 0) {
      console.error(`❌ Falha definitiva ao traduzir: "${valor}". Erro: ${err.message}`);
      return valor; // Para não travar o script, retorna o texto original
    } else {
      // Se ainda há tentativas, exibe aviso e espera um tempo (backoff exponencial)
      console.warn(`⚠️ Erro ao traduzir "${valor}": ${err.message}. Tentando novamente em ${espera}ms...`);
      await delay(espera); // Pausa para evitar saturar a API
      // Tenta traduzir de novo, diminuindo uma tentativa e dobrando o tempo de espera
      return traduzirLinha(valor, idiomaDestino, tentativas - 1, espera * 2);
    }
  }
}

// Função principal para traduzir o arquivo para um idioma específico
async function traduzirParaIdioma(idioma) {
  // Cria uma interface para ler o arquivo linha a linha, evitando carregar tudo na memória
  const rl = readline.createInterface({
    input: fs.createReadStream(inputFile, 'utf8'), // Stream do arquivo de entrada
    crlfDelay: Infinity, // Trata corretamente diferentes quebras de linha (CRLF/LF)
  });

  const linhasTraduzidas = []; // Array para armazenar as linhas já traduzidas/formatadas
  let bufferPromises = []; // Buffer para acumular Promises de traduções paralelas
  let bufferIndices = [];  // Índices das linhas que serão substituídas no array final
  let contador = 0;        // Contador de linhas processadas (útil para logs e salvamentos parciais)

  // Função para processar o buffer de traduções em paralelo
  async function processaBuffer() {
    // Espera todas as traduções terminarem (Promise.all)
    const resultados = await Promise.all(bufferPromises);
    // Substitui os placeholders no array de linhas traduzidas pelos textos traduzidos
    for (let i = 0; i < resultados.length; i++) {
      linhasTraduzidas[bufferIndices[i]] = resultados[i];
    }
    // Limpa os buffers para próxima rodada
    bufferPromises = [];
    bufferIndices = [];
  }

  // Loop assíncrono para ler o arquivo linha a linha
  for await (const linha of rl) {
    // Se a linha não contém ':' (não é chave:valor), apenas copia para saída
    if (!linha.includes(':')) {
      linhasTraduzidas.push(linha);
      contador++;
      if (contador % 100 === 0) console.log(`✔️ ${idioma}: ${contador} linhas processadas`);
      continue; // pula para próxima linha
    }

    // Separa chave e valor pelo primeiro ':' encontrado
    const [chaveCrua, ...resto] = linha.split(':');
    const chave = chaveCrua.trim();                // limpa espaços da chave
    const valorOriginal = cleanValue(resto.join(':')); // junta o resto e limpa o valor

    // Se o valor original estiver vazio, já insere linha vazia e segue
    if (!valorOriginal) {
      linhasTraduzidas.push(`  ${chave}: ''`);
      contador++;
      if (contador % 100 === 0) console.log(`✔️ ${idioma}: ${contador} linhas processadas`);
      continue;
    }

    // Adiciona ao buffer uma Promise que traduzirá essa linha, formatando para YML
    bufferPromises.push(
      traduzirLinha(valorOriginal, idioma)
        .then(texto => `  ${chave}: '${texto}'`)
    );
    bufferIndices.push(contador);
    linhasTraduzidas.push(null); // placeholder para ser substituído depois

    contador++;

    // Quando o buffer atingir 5 traduções simultâneas, processa e aguarda (VOCE PODE ALTERAR ESSE NÚMERO, MAS CORRE O RISCO DE TRAVAR A API)
    if (bufferPromises.length >= 5) {
      await processaBuffer();
      await delay(2000);  // PAUSA de 2 segundos para não sobrecarregar a API
    }

    // A cada 500 linhas processadas, salva parcialmente o arquivo traduzido
    if (contador % 500 === 0) {
      // Substitui eventuais nulls para evitar linhas vazias
      for(let i = 0; i < linhasTraduzidas.length; i++){
        if(linhasTraduzidas[i] === null) linhasTraduzidas[i] = linhasTraduzidas[i] || '';
      }
      // Salva arquivo parcial em disco
      fs.writeFileSync(`./${idioma}.yml`, linhasTraduzidas.filter(l => l !== null).join('\n'), 'utf8');
      console.log(`💾 ${idioma}: Salvo parcial em ${contador} linhas`);
    }
  }

  // Após terminar o loop, processa o que sobrou no buffer
  if (bufferPromises.length > 0) {
    await processaBuffer();
  }

  // Remove qualquer null residual e salva o arquivo final
  const linhasFinal = linhasTraduzidas.filter(l => l !== null);
  fs.writeFileSync(`./${idioma}.yml`, linhasFinal.join('\n'), 'utf8');
  console.log(`✅ ${idioma}: Tradução concluída e arquivo salvo.`);
}

// Função autoexecutável para rodar a tradução para todos os idiomas passados como parâmetro
(async () => {
  for (const idioma of idiomas) {
    await traduzirParaIdioma(idioma); // Processa idioma por idioma de forma sequencial
  }
})();
