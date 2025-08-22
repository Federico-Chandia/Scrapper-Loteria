# API Quini 6 - Scraper de Resultados

API REST para obtener resultados del Quini 6 de Santa Fe con cache inteligente en SQLite.

## 🚀 Deploy en Render.com

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)

## 📋 Endpoints Disponibles

### Quini 6 Resultados
- `GET /q6r/sorteos` - Lista de sorteos
- `GET /q6r/sorteo/:numero` - Sorteo específico  
- `GET /q6r/todoslosnumeros` - Últimos 10 sorteos

### Tu Jugada
- `GET /tuju/sorteos` - Lista de sorteos
- `GET /tuju/sorteo/:numero` - Sorteo específico

### Utilidades
- `GET /bd` - Ver base de datos
- `GET /scraping` - Forzar scraping
- `GET /oficial` - Resultados oficiales

## 🛠️ Tecnologías

- Node.js + TypeScript
- Express.js
- Cheerio (Web Scraping)
- SQLite (Cache)
- Better-SQLite3

## 📦 Instalación Local

```bash
npm install
npm run build
npm start
```

## 🌐 URL de Producción

Una vez deployado en Render.com, tu API estará disponible en:
`https://tu-proyecto.onrender.com`