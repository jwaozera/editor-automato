# Editor de Autômatos

## Sobre o Projeto

O **Editor de Autômatos** é uma aplicação web desenvolvida em **React + TypeScript** com o objetivo de **auxiliar o aprendizado de Linguagens Formais e Autômatos (LFA)**.  
A ferramenta permite **criar, visualizar e simular autômatos** de diferentes tipos, oferecendo uma abordagem prática e interativa para o estudo de conceitos teóricos da computação.

Ela foi pensada como um **apoio didático** para estudantes de disciplinas como *Teoria da Computação* e *Linguagens Formais e Autômatos*, permitindo a visualização e experimentação dos seguintes modelos computacionais:

- **DFA** (*Deterministic Finite Automaton*)
- **NFA** (*Non-Deterministic Finite Automaton*)
- **PDA** (*Pushdown Automaton*)
- **Máquinas de Turing**
- **Modelos de Mealy e Moore**

Cada um desses modelos pode ser criado, manipulado e testado dentro do editor, permitindo que o estudante observe de forma clara o comportamento e as transições de estados durante a simulação.

---

## Autores

**João Euclides da Silva Melo**  
Matrícula: 202413130  
E-mail: [jesm@ic.ufal.br](mailto:jesm@ic.ufal.br)

**Otávio Fernandes de Oliveira**  
Matrícula: 202413284  
E-mail: [ofo@ic.ufal.br](mailto:ofo@ic.ufal.br)

---

## Objetivo Acadêmico

Este projeto foi desenvolvido como parte da disciplina **Linguagens Formais e Autômatos (LFA)**,  
oferecida pelo **Instituto de Computação da Universidade Federal de Alagoas (IC/UFAL)**.

O propósito principal é **fornecer uma ferramenta educacional** que permita aos alunos **explorar os conceitos de reconhecimento de linguagens formais, autômatos e máquinas computacionais** de maneira prática e visual.

---

## Tecnologias Utilizadas

- [React 18](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [TailwindCSS](https://tailwindcss.com/)
- Hooks personalizados (`usePanZoom`, `useSimulation`, `useHistory`)
- Canvas interativo para edição visual de estados e transições

---

## Como Executar o Projeto

### Pré-requisitos

Antes de rodar o projeto, verifique se você possui instalado:

- [Node.js (>= 18)](https://nodejs.org/)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)

---

### Instalar as Dependências

No terminal, dentro da pasta do projeto:

```bash
npm install
# ou
yarn install

## Rodar o Servidor de Desenvolvimento
npm start
# ou
yarn start

## Acessar o Projeto

Após iniciar o servidor, abra o navegador e acesse:

http://localhost:3000


O editor será carregado e você poderá criar e simular autômatos interativamente, adicionando estados, transições e executando testes passo a passo.

> Estrutura do Projeto
editor-automato/
├── public/                # Arquivos estáticos e ícones
├── src/
│   ├── components/        # Componentes da interface (editor, canvas, etc.)
│   ├── core/automata/     # Implementações dos autômatos (DFA, NFA, PDA, etc.)
│   ├── hooks/             # Hooks personalizados (simulação, histórico, zoom)
│   ├── utils/             # Funções auxiliares
│   └── App.tsx            # Ponto de entrada principal da aplicação
├── package.json
├── tailwind.config.js
└── tsconfig.json

> Scripts Disponíveis
Comando	Descrição
npm start	Inicia o servidor de desenvolvimento
npm run build	Gera a versão de produção
npm test	Executa os testes automatizados
npm run lint	Verifica e corrige problemas de código
