# 🛡️ Guia de Atividade: Ratting

Este guia explica as regras, a lógica financeira e os mecanismos de sincronização automática para a atividade de **Ratting** no EasyEve.

---

## 1. Visão Geral
A atividade de Ratting foi projetada para rastrear frotas de combate a NPCs, capturando lucros de **Bounties** e **ESS Payouts** diretamente da API ESI da EVE Online, minimizando a necessidade de entrada manual de dados.

---

## 2. Regras de Sincronização (Sync Engine)

O EasyEve utiliza um motor de sincronização inteligente que segue janelas de tempo específicas para garantir que nenhum tick de ISK seja perdido.

### A. Janelas de Tempo
*   **Buffer de Início (30 min):** O sistema busca transações que ocorreram até **30 minutos antes** do início oficial da atividade. Isso garante que lucros de sites recém-terminados antes de você clicar em "Start" sejam capturados.
*   **Buffer de Fim (2.5 horas):** Após você finalizar a atividade (`Status: Completed`), o sistema continua monitorando a carteira por **2 horas e 30 minutos**. Isso é crucial para capturar os pagamentos do ESS (Main Bank), que levam tempo para serem processados pelo jogo.

### B. Auto-Sync
*   **Frequência:** Ocorre a cada **5 minutos** enquanto o dashboard estiver aberto.
*   **Alvo:** Todas as atividades de Ratting marcadas como `Active` ou `Completed` recentemente (dentro da janela de 2.5h).

---

## 3. Lógica Financeira e Filtros

### Transações Capturadas
O sistema filtra automaticamente o histórico da carteira (`Wallet Journal`) em busca de tipos específicos de transações:
1.  **Bounties (`bounty_payout`):** Recompensas diretas de kills de NPCs.
2.  **ESS Payouts (`ess_payout`):** Pagamentos do tesouro do Encounter Surveillance System.

### Transações Ignoradas
*   **Impostos (Tax):** O EasyEve **não captura nem subtrai** impostos de corporação. O valor exibido como "Net Profit" é a soma das recompensas líquidas que entraram na carteira, sem as deduções fiscais manuais ou automáticas.
*   **Transações Pessoais:** Compras no mercado, transferências e pagamentos de contratos dentro do período da atividade são ignorados, focando apenas no lucro do combate.

---

## 4. Métricas de Performance

### ISK/Hora (Efficiency Rating)
O cálculo de eficiência é feito em tempo real:
`Efficiency = (Total Net Profit) / (Tempo Decorrido em Horas)`

*   Se a atividade for interrompida e reiniciada, o tempo é calculado com base no `startTime` original.
*   Tendências (`iskTrend`): O sistema compara o ISK/h atual com o do último ciclo de sync para indicar se o rendimento está subindo, estável ou caindo.

---

## 5. Gestão de Participantes
*   **Multi-Character:** Você pode adicionar quantos personagens desejar a uma única atividade. O EasyEve sincronizará a carteira de cada um deles individualmente e somará os valores no relatório consolidado.
*   **Fit Integration:** Vincular um Fit a um personagem permite rastrear o "Risco em Jogo" (Value at Risk) e analisar a performance baseada em naves específicas.

---

## 6. MTU e Loot Complementar
Enquanto bounties são automáticos, outros lucros são manuais:
*   **MTU Contents:** Você pode registrar itens capturados por MTUs. O valor total estimado desses itens é somado ao lucro da operação.
*   **Loot & Salvage Estimado:** Espaço para inserir valores manuais de loot de wreckages e salvaging para uma visão 100% real do lucro.

---
*Atualizado em: 10 de Abril de 2026*
