# 🚀 InstaFilter Pro - Documentação Técnica

Este arquivo serve como um guia detalhado do funcionamento interno e da arquitetura de APIs da extensão.

---

## 🧠 1. Scripts de Segundo Plano (`scripts/background.js`)

O `background.js` atua como o *Service Worker* da extensão. Ele roda de forma isolada do navegador e gerencia eventos globais do ciclo de vida do app.

### Métodos e APIs Utilizadas:

* **`chrome`**: Objeto global injetado pelo navegador que serve como porta de entrada para todas as APIs da extensão. Ele é a "porta de entrada" para absolutamente tudo o que envolve o ecossistema do navegador. Se você quer fechar uma aba, ler o histórico ou mexer na extensão, você precisa começar chamando o chrome
* **`chrome.sidePanel`**: API nativa do Manifest V3 dedicada a controlar o painel lateral direito do navegador Chrome.
* **`setPanelBehavior`**: Método assíncrono (`await`) que define o comportamento padrão do painel lateral da extensão.
* **`({ openPanelOnActionClick: true })`**: significa literalmente: "Abrir o painel lateral quando o ícone de ação (o botão da extensão) for clicado".

* **`chrome.runtime.onInstalled.addListener(...)`**: Evento (gatilho) disparado quando a extensão é instalada ou atualizada. Ele ativa a função de configuração para registrar o comportamento do painel.
    * **`chrome.runtime`**:É uma das APIs mais importantes do ecossistema. Ela cuida do "ciclo de vida" da extensão, das mensagens em segundo plano e de ler os arquivos do seu pacote.
    * **`onInstalled`**: É um evento (gatilho) específico do runtime. Ele dispara uma única vez em situações muito específicas: quando a extensão é instalada pela primeira vez, quando ela é atualizada para uma nova versão (ex: da v1.3 para a v1.4) ou quando você recarrega a extensão manualmente na página de testes (chrome://extensions).
    * **`addListener(...)`**: É um método que funciona como um "ouvinte" ou "vigia". Você está dizendo ao Chrome: "Fique vigiando o gatilho onInstalled. No momento em que ele disparar, chame a função configurarPainelDireto imediatamente".

* **`chrome.runtime.onStartup.addListener(...)`**: Evento disparado toda vez que o navegador Chrome é aberto do zero, garantindo que o comportamento do painel seja reconfigurado na inicialização.
    * **`chrome.runtime`**: É uma das APIs mais importantes do ecossistema. Ela cuida do "ciclo de vida" da extensão, das mensagens em segundo plano e de ler os arquivos do seu pacote.
    * **`onStartup`**: É outro evento (gatilho). Diferente do onInstalled, este aqui dispara toda vez que o perfil do navegador Chrome é aberto do zero (quando o usuário liga o computador e abre o navegador para navegar na internet).
    * **`addListener(...)`**: O vigia novamente. Ele garante que, assim que o Chrome iniciar, a configuração do painel lateral seja reativada e registrada na memória do navegador para aquele dia de uso.
---

## 💻 2. Interface do Usuário (`sidepanel/sidepanel.js`)
Este script gerencia o comportamento visual e lógico do painel lateral. Ele coleta os dados digitados pelo usuário, gerencia as abas ativas e envia ordens para a página do Instagram.

### Função: `garantirScriptInjetado(tabId)`

Esta função atua como um mecanismo de redundância e segurança para garantir que a extensão consiga ler a tela do Instagram, injetando o script de conteúdo sob demanda caso a conexão nativa falhe.

* **`async function`**: Define uma função assíncrona. Ela avisa ao JavaScript que os comandos lá dentro podem demorar um pouco (como ler arquivos ou injetar scripts) e, por isso, usará o controle de espera (`await`).
* **Parâmetro `tabId` (ou qualquer nome de variável desejado)**: É apenas o nome dado ao argumento da função. Ele funciona como uma "caixa" que transporta o valor recebido. O que importa é o conteúdo dessa caixa: o "RG" ou identificador numérico único que o Chrome atribui a cada aba aberta, ou seja, neste caso, é o identificador da própria aba.
* **`chrome.scripting`**: API (Módulo) global do Chrome que agrupa funções/métodos para manipulação, injeção e remoção de scripts e estilos em páginas web.
* **`executeScript({...})`**: Método (Função) específico pertencente à API `chrome.scripting`. É o executor da ação que realiza a injeção dinâmica do arquivo JavaScript na aba alvo, aceitando um objeto de configuração com os parâmetros `target` e `files`
    * **`target: { tabId: tabId }`**: É o **alvo** da injeção. Especifica para o navegador exatamente em qual aba o script deve ser "atravessado". Sem o `target`, o Chrome não saberia se deve rodar o código na aba do Instagram, do YouTube ou do Google. Aqui existe uma regra estrita do Chrome. A propriedade interna `tabId` (antes dos dois pontos) **deve se chamar obrigatoriamente assim**, pois é como a API do navegador foi programada para reconhecer o alvo. Já o valor passado para ela (depois dos dois pontos) é a variável que criamos para carregar o número da aba.
    * **`files: ["scripts/content.js"]`**: É um array (lista) de strings que define o caminho relativo dos arquivos JavaScript locais da extensão que devem ser executados na aba alvo. A API aceita múltiplos arquivos nesta lista, executando-os na ordem em que foram declarados.
* **Tratamento de Erros (`try { ... } catch (e) { ... }`)**: Uma rede de proteção essencial. 
    * O código tenta executar o bloco `try`. 
    * Se o script já tiver sido injetado anteriormente, ou se o usuário estiver em uma página restrita pelo sistema do navegador (como `chrome://extensions`), o Chrome jogará um erro. 
    * Em vez de quebrar e travar a extensão inteira, o bloco `catch (e)` captura esse erro de forma segura e apenas exibe um aviso controlado no console do desenvolvedor via `console.log`.

### Função: do evento do click do botão btnAddInput.addEventListener

É uma função de evento de click do usuário, quando o mesmo clica para adicionar mais um filtro. Quando ele clica no botão, um novo campo do tipo imput aparece logo abaixo. A função só permite 10 campos.

* **`.placeholder = `Filtro ${inputCount}``**: Define o texto cinza de fundo do campo. Usa crases (Template Literals) para juntar a palavra "Filtro " com o número atual do contador, fazendo com que cada caixinha nova criada venha automaticamente com o texto "Filtro 2", "Filtro 3", e assim por diante.
* **`inputsContainer.appendChild(newInput)`**: Pega o campo de texto que foi gerado na memória do computador e o joga fisicamente para dentro da caixa de filtros (`inputsContainer`) no HTML. É esse método que faz o novo campo aparecer visualmente na tela para o usuário.

### Função: do evento do click do botão btnAddInput.addEventListener

É a função quando o usuário clica no botão "filtrar"

* **`document.querySelectorAll('.filter-input')`**: O método querySelectorAll faz uma varredura no HTML buscando todos os elementos que usam a classe .filter-input. E porque? Por que todos os campos imput que o usuário digita para definir os filtros, possuem esta classe. Logo esse método está selecionando todos os imputs de filtro que o usuário utilizou.
O Detalhe Técnico: Ele não retorna um Array (lista) comum. Ele retorna um objeto especial chamado NodeList (uma coleção de nós do HTML). Guarde essa informação, ela explica a complexidade da próxima linha!


* **`Array.from(inputs)`**: Como inputs é uma NodeList (e não um Array de verdade), ela não tem superpoderes como mapear ou filtrar dados. O método Array.from() pega essa coleção do HTML e a transforma em um Array legítimo de JavaScript.
* **`.map(i => i.value.trim())`**: O método .map() passa de caixinha em caixinha do array. Para cada input (que chamamos aqui de i), ele faz duas coisas:
    * **`i.value`**: Pega o texto que o usuário digitou dentro dele.
    * **`.trim():`**: Um método de texto que remove espaços inúteis do começo e do fim (ex: se o usuário digitou "  promocao   ", o trim limpa e deixa apenas "promocao")
* **`.map(i => i.value.trim())`**: O método .filter() serve para fazer uma limpa. Ele analisa cada palavra filtrada (que chamamos de k) e diz: "Só vai continuar na lista se a palavra for DIFERENTE (!==) de um texto vazio """. Isso serve para eliminar caixas de texto que o usuário criou mas deixou em branco.
* **`Resultado final em keywords`**: Um array limpo apenas com as palavras reais digitadas (ex: ["sorteio", "ganhador"]).


* **`keywords.length === 0`**: Verifica se o tamanho do array de palavras é zero (ou seja, o usuário não digitou nada em campo nenhum).
* **`return:`**: O comando return aqui funciona como um ponto final de emergência. Ele faz o JavaScript sair imediatamente da função do botão, impedindo que o resto do código abaixo seja executado à toa.


* **`chrome.tabs.query`**: API nativa do Chrome que vasculha as abas do navegador baseada nas configurações fornecidas.
* **`{ active: true, currentWindow: true }`**: O filtro da busca. Diz ao Chrome: "Me traga a aba que está ativa (sendo visualizada agora) na janela atual do usuário".
* **`await`**: Pausa a execução do botão até o Chrome trazer a resposta da aba de segundo plano.
* **`const [tab]`**: Isso se chama Desestruturação. Como a API do Chrome sempre devolve uma lista (mesmo que só tenha uma aba ativa), usar os colchetes na variável faz o JavaScript extrair automaticamente o primeiro item dessa lista e jogá-lo direto na constante tab.


* **`if (!tab || !tab.url || !tab.url.includes("instagram.com")) { ... return; }`**
A Condição: Verifica três possíveis problemas usando o operador || ("OU"):
    * **`!tab`**: Se a aba não foi encontrada.
    * **`!tab.url`**: Se a aba não tem uma URL visível.
    * **`!tab.url.includes("instagram.com")`**: Se o endereço da aba não inclui o texto "instagram.com".
* **`resultsList.innerHTM`**: resultsList é variável do campo onde os resultados dos comentários filtrados serão exibidos. A propriedade innerHTML substitui todo o conteúdo interno da sua lista de resultados por um bloco de HTML customizado (uma caixinha vermelha estilizada com a mensagem de erro). 
* **`return`**: Outro ponto final. Interrompe o código para que a busca não aconteça fora do Instagram.


* **`chrome.tabs.sendMessage(tab.id, { action: "extract_comments", keywords }, async (response) => {`**
    * **`chrome.tabs.sendMessage(...)`**:É um método nativo das extensões do Chrome. Ele serve para disparar uma mensagem (uma ordem) do seu painel lateral diretamente para um script que está rodando dentro de uma aba (que neste caso é o nosso content.js). Ele recebe 3 parâmetros fundamentais aqui:
        * **`tab.id`**: O identificador da aba ativa do Instagram que descobrimos no bloco anterior. Diz ao Chrome exatamente para onde enviar a mensagem.
        * **`{ action: "extract_comments", keywords }`**: É o objeto contendo os dados que você está enviando, que neste caso é o rótulo (definido como action com a string extract_comments, para que o content.js venha saber o que fazer), e também as palavras que o usuário digitou nos campos inputs, que foi colocado no array keybords anteriormente. Você definiu uma propriedade action (um rótulo para o content.js saber o que fazer) e está passando o seu array de palavras-chave (keywords).
        * **`async (response) => { ... }`**: É uma Função de Callback Assíncrona. Ela fica esperando o content.js terminar de raspar os comentários do Instagram. Quando ele termina, ele envia uma resposta de volta, que cai dentro desse parâmetro response. Você a marcou como async porque vai usar o nosso conhecido await ali dentro.
        * **`if (chrome.runtime.lastError)`**: É uma propriedade do Chrome. Se o navegador tentar enviar a mensagem e algo der errado (por exemplo, se o content.js ainda não tiver sido injetado na página do Instagram), o Chrome joga o erro dentro dessa propriedade. "Se houver algum erro de tempo de execução... faça o seguinte".
            * **`console.warn(...)`**: Método que imprime um aviso amarelo de alerta no console do desenvolvedor para fins de depuração.
            * **`setTimeout(() => {chrome.tabs.sendMessage(tab.id, { action: "extract_comments", keywords }, (secondResponse) =>`**
                * **`setTimeout(...)`**: É uma função global nativa do JavaScript. Ela serve para atrasar a execução de um bloco de código. Ela recebe dois parâmetros: uma função com o código a ser rodado e o tempo de espera em milissegundos (500 ms = meio segundo). Por que esse atraso é necessário? Para dar tempo do navegador processar e registrar o script que você acabou de injetar com o await.
                * **`chrome.tabs.sendMessage(...)`**: (A Segunda Chance): Dentro do cronômetro, você tenta enviar a exata mesma mensagem novamente. Mas dessa vez, espera-se que o script já esteja injetado e pronto para responder. O resultado cai em secondResponse
                    * **`renderizarComentarios(secondResponse)`**:  Chama a função responsável por desenhar os comentários que já foram filtrados na tela do painel, passando os dados obtidos na segunda tentativa de sucesso.
        * **`else { renderizarComentarios(response) }`**
            * **`else`**: Caso o chrome.runtime.lastError seja falso (ou seja, correu tudo bem na primeira tentativa e a ponte de comunicação funcionou de primeira).
            * **`renderizarComentarios(response)`**: Envia a resposta inicial (que já veio com os comentários filtrados do Instagram) direto para a função que desenha a lista na tela.

* **`function renderizarComentarios(response) { resultsList.innerHTML = "";`**
    * **`resultsList.innerHTML = ""`**: Antes de desenhar os novos comentários filtrados, você limpa a lista. Isso apaga aquele texto "<li>Buscando...</li>" que havíamos colocado antes, deixando a área em branco pronta para os novos dados.
    * **`if (response && response.comments)`**: Uma checagem de segurança dupla. Verifica se o response existe E se dentro dele existe a propriedade .comments. Se der falso, pula direto lá para o else da linha 42.
            * **`let commentsToDisplay = response.comments`**: Uma variável para facilitar a leitura, armazenando o array de comentários recebidos.
            * **`if (commentsToDisplay.length === 0)`**: Se a lista de comentários estiver vazia (tamanho zero), significa que o script procurou no Instagram, mas nenhum comentário batia com as palavras digitadas. Ele escreve o aviso de "Nenhum comentário corresponde..." e dá um return; para parar a função ali mesmo.
        * **`commentsToDisplay.forEach(c => {`**: É um método de arrays que serve para fazer um ciclo, uma repetição. Ele vai pegar a sua lista de comentários e vai executar o bloco de código abaixo para cada um dos comentários encontrados, um por um. Chamamos o comentário da vez de c.
            * **`document.createElement('li')`**: Cria um item de lista (<li>) na memória do computador. Cada comentário será um item <li>.
            * **`li.className = 'comment-item'`**: Injeta a classe CSS nele.
            * **`li.style = "..."`**: Injeta estilos CSS diretamente na tag (estilização inline), definindo bordas, espaçamentos (padding), cor de fundo branca e cantos arredondados (border-radius) para criar o visual de "caixinha de rede social".
            * **`li.innerHTML = ` ... ``**: Aqui você usa crases para injetar um bloco inteiro de HTML estruturado dentro do <li>. Dentro dele, usamos a interpolação ${} para preencher os dados reais do comentário c:
                * **`${c.user}`**: Injeta o nome do usuário do Instagram (ex: @joao). Note que ele recebe a classe class="btn-profile".
                * **`${c.text}`**: Injeta o texto do comentário.
                * **`${c.meta ? ... : ''}`**: Isso se chama Operador Ternário (um if/else disfarçado em uma linha). Ele verifica: Se existir dados em c.meta (como a data ou curtidas do comentário), desenhe uma div cinza com o conteúdo; caso contrário, não desenhe nada ('').
                * **`<button class="btn-locate">`**: Desenha o botão azul com o texto "📍 LOCALIZAR COMENTÁRIO".
            * **`lli.querySelector('.btn-profile').addEventListener('click', () => {`**: Faz uma busca apenas dentro desse item de lista específico procurando o elemento com a classe .btn-profile (o nome do usuário), e cria um evento de click nele.
                * **`${c.text}`**: Método de texto que remove o símbolo @ do nome do usuário, substituindo-o por nada. É necessário porque o link do Instagram não aceita o arroba.
                * **`window.open(..., '_blank')`**: Método nativo do navegador para abrir um endereço web em uma nova aba em branco. Ele monta o link correto usando o nome limpo do usuário.
            * **`li.querySelector('.btn-locate').addEventListener('click', async () => {`**: Captura o botão azul de localizar de dentro dessa caixinha que criamos.
                * **`await chrome.tabs.query(...)`**: Pausa e captura os dados da aba atual do Instagram.
                * **`chrome.tabs.sendMessage(...)`**: Dispara uma nova mensagem para a página do Instagram!
                    Dessa vez, o crachá (action) é "highlight_comment" (mudar o foco/destacar comentário).
                    Ele envia junto o nome do usuário (c.user) e o texto exato do comentário (c.text) para que o content.js procure esse elemento no HTML do Instagram e role a página até ele, destacando-o visualmente.
            * **`resultsList.appendChild(li)`**: Lembra do nosso amigo de injeção estrutural? Ele pega essa caixinha do comentário que acabamos de montar e configurar na memória e a insere fisicamente na tela do painel lateral. O ciclo do .forEach acaba aqui e pula para o próximo comentário da lista, repetindo o processo até o fim do array.
    * **`else { resultsList.innerHTML = "<li>Nenhum comentário encontrado. Tente recarregar...</li>";`**: Esse else é acionado se a resposta falhar por completo ou se a estrutura vier com defeito (quebrando a condição da linha 4). Ele limpa o painel e exibe uma mensagem pedindo para recarregar a página do Instagram.
---

## 🕵️‍♂️ 3. Infiltrado na Página (`scripts/content.js`)
Este script é injetado automaticamente no milissegundo em que a página do Instagram termina de carregar através do manifes.json. Sim, o manifest será lido a todo momento pelo Chrome, para verficar se uma das regras bate. Quando ele perceber que está no site do instagram ele injeta o script do content.js, e o mesmo fica lá, escutando, esperando alguma ordem para que venha a ser executado.
Neste script nós temos a operação de filtrar todos os comentários, e a operação de localizar/destacar um comenetário específico (após o usuário clicar em "localizar comentário"). 