# Guia de Atualização Segura (Gerenciador de IR)

Este documento explica como você deve proceder caso queira solicitar novas alterações (features, melhorias ou correções) para a inteligência artificial, garantindo que o que já funciona não seja quebrado.

## Regra de Ouro: Teste Localmente Primeiro

Sempre que a inteligência artificial fizer uma alteração no código para você, **NÃO faça o deploy para a Vercel imediatamente**. Siga os passos abaixo:

### Passo 1: Iniciar o Ambiente de Teste
Abra o terminal na pasta do projeto e inicie o servidor de desenvolvimento:
```bash
npm run dev
```
Acesse `http://localhost:3000` em seu navegador.

### Passo 2: Validar as Alterações
Navegue pelo aplicativo e verifique se as partes do sistema que funcionavam antes continuam funcionando.
1. Faça Login.
2. Tente cadastrar uma operação manual.
3. Tente importar um PDF (verifique se processa normalmente).

### Passo 3: Preparar para Produção (Build)
Se tudo estiver funcionando, você precisará confirmar se o código está pronto para ir para a internet. Cancele o `npm run dev` (Ctrl+C) e rode o processo de empacotamento:
```bash
npm run build
```
- **Se apresentar sucesso (`✓ built in...`)**: O código está seguro e otimizado. Vá para o Passo 4.
- **Se apresentar erro (linhas vermelhas)**: Mande os erros para a IA consertar imediatamente.

### Passo 4: Fazer o Upload (Deploy)
Você pode usar o Git ou a interface da Vercel. 
Se estiver usando a CLI da Vercel:
```bash
vercel --prod
```
Ou simplesmente faça o commit e push para o GitHub se tiver o repositório linkado à Vercel. 

---

## Como Rastrear Atualizações?

Para saber se a atualização funcionou online, verifique a etiqueta (tag) no canto superior direito do seu sistema (ex: `v1.1.0`).

> [!TIP]
> Se a IA adicionar tabelas novas no Supabase, ela vai gerar instruções em um script SQL. Sempre execute scripts `.sql` novos no painel do Supabase antes de fazer o deploy.
