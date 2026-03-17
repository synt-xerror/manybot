![ManyBot Logo](logo.png)

ManyBot é um bot para WhatsApp que roda 100% localmente, sem depender da API oficial do WhatsApp. Ele utiliza a biblioteca `whatsapp-web.js`, que automatiza o WhatsApp Web sem depender de gráficos (headless).

Algumas funcionalidades desse bot incluem:
- Suporte a múltiplos chats em uma única sessão
- Comandos de jogos
- Download de mídia via yt-dlp
- Gerador de figurinhas

# Screenshots


---

# Requisitos
- Node.js
- NPM
- Sistema Linux ou Windows

obs: Sistemas Android e iOS ainda não são 100% compatíveis. O suporte para Termux está em fases de testes e sem garantia de funcionamento correto.

# Instalação (Linux)

1. Clone o repositório e entre:
```
git clone https://github.com/synt-xerror/manybot
cd manybot
```

2. Crie e abra o arquivo de configuração (use o editor de sua preferência):
```
touch manybot.conf
nano manybot.conf
```

3. Nele você pode configurar algumas coisas do ManyBot. Esse é o arquivo base para que possa modificar:
```
CLIENT_ID=manybot
BOT_PREFIX=🤖 *ManyBot:*
CMD_PREFIX=!
CHATS=[
    123456789@c.us,
    123456789@g.us
]
```
- **CLIENT_ID:** ID do cliente, serve para identificar sua sessão.
- **BOT_PREFIX:** Prefixo/nome do bot, o que aparece sempre que manda uma mensagem.
- **CMD_PREFIX:** Prefixo do comando, o caractere que você usa para executar um comando (!many, !figurinha).
- **CHATS:** ID dos chats no qual você quer que o bot assista. Use o utilitário: `src/utils/get_id.js` para descobrir os IDs. Deixe vazio caso queira que funcione com qualquer chat.

4. Execute o script de instalação:
```
bash ./setup
```

5. Rode o bot pela primeira vez:
```
node ./src/main.js
```
Ele vai pedir para que escaneie o QR Code com seu celular.

No WhatsApp:
Menu (três pontos) > Dispositivos conectados > Conectar um dispositivo

# Instalação (Windows)

O uso desse bot foi pensado para rodar em um terminal Linux. No entanto, você pode usar o Git Bash, que simula um terminal Linux com Bash real:

1. Para baixar o Git Bash: https://git-scm.com/install/windows
Selecione a versão que deseja (portátil ou instalador)

2. Para baixar o Node.js: https://nodejs.org/pt-br/download
Role a tela e selecione "Instalador Windows (.msi)"
Ou se preferir, use um gerenciador de pacotes como mostra no conteúdo inicial

Depois de instalar ambos, abra o Git Bash e execute exatamente os mesmos comandos mostrados na seção Linux.

# Uso

Feito a instalação, você pode executar o bot apenas rodando:
```
node ./src/main.js
```

## Atualizações

É recomendável sempre ter a versão mais recente do ManyBot. Para isso, temos um utilitário logo na raíz. Para executar:
```
bash ./update
```

## Criando um serviço (opcional)

Se estiver rodando numa VPS ou apenas quer mais controle, é recomendável criar um serviço systemd. Siga os passos abaixo para saber como criar, habilitar e gerenciar um.

1. Configurando o diretório 

Primeiro passo é garantir que o diretório do ManyBot esteja no local adequado, é recomendável guardar em `/root/manybot` (os passos a seguir supõem que esteja essa localização)

2. Criando o serviço

Abra o arquivo:
```
/etc/systemd/system/manybot.service
```

E cole o seguinte conteúdo:
```
[Unit]
Description=ManyBot
After=network.target

[Service]
ExecStart=/usr/bin/env node /root/manybot/src/main.js
WorkingDirectory=/root/manybot
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

3. Iniciando e habilitando o serviço:

Primeiro reinicie o daemon do systemd:
```
systemctl daemon-reload
```

Inicie o serviço:
```
systemctl start manybot
```

Habilite para que ele seja iniciado junto com o seu sistema (opcional):
```
systemctl enable manybot
```

## Comandos

O ManyBot vem com alguns comandos pré-definidos, sendo esses:

- `video <link>`: baixa um vídeo da internet
- `audio <link>`: também baixa um vídeo, mas manda apenas o áudio
- `figurinha`: gerador de figurinhas
- `adivinhação`: jogo simples de adivnhação de um número entre 1 a 100

O prefixo para ativá-los depende da sua configuração, mas por padrão é o ponto de exclamação (`!`).

# Considerações

ManyBot é distribuído sob a licença GPLv3. Você pode usar, modificar e redistribuir o software conforme os termos da licença. 

Saiba mais sobre as permissões lendo o arquivo [[LICENSE]] ou em: https://www.gnu.org/licenses/quick-guide-gplv3.pt-br.html