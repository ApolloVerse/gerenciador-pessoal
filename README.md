# Gerenciador de Investimentos e IR

Aplicativo para gestão de ativos financeiros e auxílio na declaração de Imposto de Renda.

## Como implantar no GitHub Pages

Este projeto está configurado para ser implantado automaticamente no GitHub Pages usando GitHub Actions.

### Passos para implantação:

1.  **Crie um repositório no GitHub** e envie seu código para lá.
2.  **Habilite o GitHub Pages**:
    -   Vá em **Settings** > **Pages**.
    -   Em **Build and deployment** > **Source**, selecione **GitHub Actions**.
3.  **Configuração da IA**:
    -   Como o GitHub Pages é um ambiente estático, você precisará inserir sua própria **Chave de API do Gemini** nas configurações do aplicativo (ícone de engrenagem/IA no cabeçalho).
    -   Sua chave será salva localmente no seu navegador e não será exposta publicamente.
4.  **Sistema de Versões e Snapshots**:
    -   O aplicativo agora possui um sistema de **Pontos de Restauração (Snapshots)**.
    -   Sempre que o sistema for atualizado, você verá a nova versão no cabeçalho.
    -   Você pode criar pontos de restauração manuais dos seus dados. Se algo mudar no comportamento do sistema e você quiser voltar seus dados para um estado anterior, basta usar a função de restauração no menu de **Versões**.

## Funcionalidades

-   Gestão de múltiplas corretoras.
-   Importação de Notas de Corretagem e Informes de Rendimentos via PDF (usando IA).
-   Cálculo automático de preço médio e patrimônio.
-   Relatório detalhado para preenchimento do IRPF (Bens e Direitos, Rendimentos Isentos, etc.).
-   Gráficos de alocação e dividendos.
