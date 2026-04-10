# Guia de Atividade: Mineração (Mining)

Este documento detalha as regras de negócio, a lógica de sincronização e o cálculo de lucros para a atividade de Mineração no EasyEve.

## 1. Janela de Sincronização
Para garantir a captura de dados devido ao atraso de processamento da API da ESI (Mining Ledger), o sistema aplica as seguintes regras:

- **Atividades Ativas:** Sincronização automática a cada 5 minutos.
- **Atividades Finalizadas:** O sistema continua a sincronizar automaticamente por **1 hora** após o término da atividade. Isso é crucial porque o ledger da ESI pode levar de 30 a 60 minutos para atualizar após a mineração ser realizada.
- **Sincronização Manual:** Disponível a qualquer momento através do botão "Sync API" no card da atividade.

## 2. Regras de Sincronização e Ledger (ESI)
A sincronização utiliza o endpoint `/mining/ledger` da ESI, que possui características específicas:

- **Agrupamento Diário:** Os dados são consolidados por dia (Data), Personagem, Tipo de Minério e Sistema Solar.
- **Janela de Data:** O sistema processa todas as entradas do ledger cuja data seja igual ou posterior ao dia de início da atividade.
- **Persistência de Dados:** O sistema armazena o maior valor de quantidade (`quantity`) encontrado para cada combinação de Personagem/Minério/Sistema. Se o valor na ESI aumentar, o sistema atualiza o registro local.

## 3. Cálculo de Lucro e Valorização
Ao contrário do Ratting (que usa transações reais), o valor do Mining é estimativo e baseado no mercado:

- **Preços de Jita:** O sistema busca os preços de venda (`sell`) mais baixos em Jita para cada tipo de minério sincronizado.
- **Frequência de Preços:** Os preços de Jita são cacheados por 5 minutos para evitar sobrecarga na API de mercado.
- **Cálculo de Lucro:** `Lucro = Quantidade Sincronizada * Preço Unitário (Jita Sell)`.
- **Impostos de Corporação:** **Não são deduzidos**. O valor exibido reflete o valor bruto de mercado do minério extraído.

## 4. Fluxo de Trabalho Recomendado
1. **Início:** Certifique-se de que os personagens participantes estão com o token SSO ativo.
2. **Durante:** O auto-sync atualizará o volume extraído a cada 5 minutos (sujeito ao delay da ESI).
3. **Fim:** Ao clicar em "Finalizar", o tracker registrará o horário de término.
4. **Pós-Atividade:** Deixe o dashboard aberto ou retorne em breve; o sistema continuará tentando capturar os últimos minérios minerados por até 60 minutos.

---
> [!TIP]
> Como o ledger da ESI é disponibilizado apenas uma vez por dia por personagem/minério/sistema, se você minerar o mesmo tipo de minério no mesmo sistema antes de iniciar a atividade no EasyEve, esses valores aparecerão imediatamente como "minerados" no início da sessão.
