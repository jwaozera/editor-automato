# Exemplos de Cadeias/Entradas para os Autômatos

Este README lista strings de exemplo para cada autômato de exemplo na pasta `examples/`. Use-as para verificar e demonstrar os comportamentos esperados no seu editor ao simular cada máquina.

- Cada exemplo abaixo aponta para o JSON correspondente (pronto para carregar no editor).
- Ajuste as posições (`x`, `y`) dos estados no editor conforme preferir.

---

## 1) DFA — Número par de 'a' (paridade)

- Linguagem: L = { w ∈ {a,b}* | w contém um número par de 'a' }.
- Observações:
  - Estado inicial é final (cadeia vazia aceita).
  - Símbolo `b` não altera a paridade.

Aceitas (exemplos):
- "" (cadeia vazia)
- "aa"
- "abba"
- "aba"
- "aaaa"
- "bbb"
- "b"
- "baab"
- "bababa"

Rejeitadas (exemplos):
- "a"
- "baa"
- "baba"
- "abb"

---

## 2) NFA — Cadeias que terminam com "ab"

- Linguagem: L = { w ∈ {a,b}* | w termina com "ab" }.
- Observações:
  - Não-determinismo: ao ler `a` em `q0`, a máquina pode ficar em `q0` (loop) ou ir para `q1`.

Aceitas (exemplos):
- "ab"
- "aab"
- "bbbab"
- "abab"

Rejeitadas (exemplos):
- ""
- "a"
- "aba"
- "b"

---

## 3) Mealy — Mapeamento e Greedy com símbolo multi-caractere


- Transdutor:
  - Prioriza símbolo multi-caractere "ab" (greedy): "ab" → "XY"
  - "a" → "x"
  - "b" → "y"
- Observações:
  - `meta.recognitionMode = false`: a máquina apenas transduz; não aceita/rejeita por final/consumo.

Entradas → Saídas (exemplos):
- "ab" → "XY"
- "aabb" → "xxyy"
- "abab" → "XYXY"
- "baa" → "yxx"
- "" → "" (vazia)

---

## 4) Moore — Saída por estado (inclui saída do estado inicial)

- Saída:
  - Estado `q0` emite "A"
  - Estado `q1` emite "B"
- Observações:
  - Em Moore, a saída do estado inicial já aparece mesmo com entrada vazia.

Entradas → Saídas (exemplos):
- "" → "A"
- "a" → "AB"    (q0→q1 ao ler 'a')
- "ab" → "ABA"  (q0→q1→q0 ao ler 'a','b')
- "aba" → "ABAB"

---

## 5) PDA — L = { a^n b^n | n ≥ 0 } (aceitação por pilha vazia)


- Linguagem: equilíbrio entre `a` seguidas de `b`: mesma quantidade e todos os `a` antes dos `b`.
- Observações:
  - `acceptanceMode = "empty-stack"`: aceita quando a pilha fica vazia.
  - Empilha `A` para cada `a`; desempilha um `A` para cada `b`.

Aceitas (exemplos):
- ""
- "ab"
- "aabb"
- "aaabbb"
- "aaaabbbb"

Rejeitadas (exemplos):
- "aab"     (faltou um `b`)
- "abb"     (sobrou `b`)
- "ba"      (ordem incorreta)
- "aba"     (intercalação incorreta)

---

## 6) Turing — Complemento binário (0 ↔ 1)

- Função: inverte cada bit (0→1, 1→0) e para ao encontrar o branco (`_`).
- Observações:
  - Mantém o comprimento da entrada; termina em estado final ao ler o blank.

Entradas → Saídas (exemplos):
- "" → ""          (continua vazia)
- "0" → "1"
- "1" → "0"
- "01" → "10"
- "0101" → "1010"
- "111" → "000"

---

## Dicas de uso no editor

- Carregue o JSON correspondente e rode simulações com as strings de exemplo acima:
  - DFAs/NFAs/PDAs: digite a palavra de entrada e simule para ver aceitação.
  - Mealy/Moore: verifique a saída (transdução).
  - Turing: verifique a fita final e a posição da cabeça.
- Para os casos com símbolos multi-caractere (como "ab"):
  - As máquinas foram construídas para dar preferência ao símbolo mais longo (greedy) quando aplicável.
