# ¿Quién Quiere Ser Millonario? — Edición Académica UG

Aplicación web interactiva y gamificada inspirada en el formato televisivo **«¿Quién Quiere Ser Millonario?»**, diseñada para el entrenamiento y evaluación preuniversitaria del **Bloque de Conocimiento 1: Ciencia, Tecnología e Ingeniería** (**Matemáticas, Física y Lenguaje**) de la Universidad de Guayaquil.

---

## 🎯 Objetivo del Proyecto

Transformar la preparación académica preuniversitaria en una experiencia interactiva, inmersiva y medible, permitiendo a los estudiantes practicar con un banco de preguntas personalizable, temporizadores adaptados a la naturaleza de cada reactivo (teoría vs. cálculo matemático) y retroalimentación explicativa inmediata en dispositivos **móviles, laptops y PC de escritorio**.

### Características Principales
- **Configuración Pre-Partida**:
  - Selección de asignatura: **Matemáticas**, **Física**, **Lenguaje** o **Todos**.
  - Selección de nivel de dificultad: **Fácil**, **Difícil** o **God Mode**.
  - Generación de **40 preguntas aleatorias** por ronda con opciones (`A`, `B`, `C`, `D`) barajadas dinámicamente.
- **Temporizador Inteligente por Tipo de Reactivo**:
  - **Preguntas de Conceptos (Teoría)**: Límite de **30 segundos** y **1 punto** por acierto.
  - **Preguntas de Ejercicios (Cálculo Matemático)**: Límite de **180 segundos**, **1 punto** por acierto y acceso a una **Pizarra y Calculadora Científica Rápida (`[C]`)** integrada.
- **Progresión Continua y Sistema de Calificación**:
  - La partida no se interrumpe al fallar una pregunta: el estudiante responde las 40 preguntas recibiendo la explicación paso a paso en cada ítem.
  - Evaluación final promediada sobre el **100%**:
    - **`< 70%`**: *Partida No Superada (Perdió el juego)*.
    - **`≥ 70%`**: *¡Ganó el juego!*.
    - **`> 90%`**: *¡Ganó el juego! + Mención Especial de Honor: Estudiante Estrella*.
- **Comodines Clásicos**:
  - **50:50**: Descarta automáticamente dos opciones incorrectas.
  - **Público**: Simula la votación porcentual de la audiencia universitaria según la dificultad.
  - **Pista Académica**: Muestra la fórmula física/matemática o clave conceptual del tema.
- **Base de Datos Personalizable**:
  - Incluye **140 preguntas** extraídas del temario oficial (con diagramas vectoriales en `<svg>` para problemas gráficos) y un gestor CRUD en el navegador (`localStorage`) para crear, editar, filtrar o restaurar preguntas.
- **Audio Procedural y Escenario a 60 FPS**:
  - Efectos de sonido sintetizados en tiempo real con **Web Audio API** y escenario televisivo animado en **HTML5 Canvas 2D**.

---

## 🛠️ Stack Tecnológico Completo

- **Framework Principal**: [Next.js 15](https://nextjs.org/) (App Router)
- **Lenguaje**: [TypeScript 5.9](https://www.typescriptlang.org/)
- ** Librería de UI**: [React 19](https://react.dev/)
- **Estilos y Diseño Responsivo**: [Tailwind CSS 4](https://tailwindcss.com/) (`Mobile-First` + soporte adaptativo para Móviles, Laptops y PC)
- **Gráficos y Animación**:
  - **HTML5 Canvas 2D API** (escenario de estudio televisivo a 60 FPS, luces volumétricas, partículas y *camera shake*)
  - **SVG Inline Técnico** (diagramas de física, planos inclinados, poleas, gráficas cinemáticas y emblemas)
- **Motor de Audio**: **Web Audio API** (sintetizador procedural sin archivos de audio externos)
- **Iconografía**: [Lucide React](https://lucide.dev/)
- **Persistencia Local**: `Web Storage API` (`localStorage`) para la base de datos personalizable de preguntas
- **Testing**: `node:test` + `node:assert/strict` ejecutados con `tsx`

---

## 🚀 Instalación y Ejecución Local

### 1. Prerrequisitos
- **Node.js** `v20+` (o superior)
- **npm** (o `bun` / `pnpm`)

### 2. Clonar el repositorio e instalar dependencias
```bash
git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_DEL_PROYECTO>
npm install
```

### 3. Configurar variables de entorno (opcional)
Copia el archivo de ejemplo `.env.example` a `.env.local`:
```bash
cp .env.example .env.local
```

### 4. Ejecutar el servidor de desarrollo
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador (PC, laptop o móvil).

### 5. Ejecutar pruebas unitarias y compilación de producción
```bash
# Ejecutar pruebas unitarias de la lógica del juego
npx tsx --test lib/game-logic.test.ts

# Compilar para producción
npm run build
npm start
```

---

## 👨‍💻 Autor

Desarrollado por **Desarrollador Fullstack con IA** (`mchusan24@gmail.com`) — combinando arquitectura web moderna, diseño de interfaces adaptativas y desarrollo asistido por Inteligencia Artificial para crear herramientas educativas interactivas de alto impacto.
