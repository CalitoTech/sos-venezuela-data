# SOS Venezuela — Datos de Desaparecidos

> Plataforma centralizada de búsqueda de personas desaparecidas tras el terremoto en Venezuela (2026).

Este proyecto agrega y normaliza datos de múltiples fuentes en línea que recopilan información de personas desaparecidas, para ofrecer una fuente única, limpia y consultable en tiempo real.

---

## El problema

Tras el sismo, la información sobre desaparecidos está dispersa en docenas de sitios web, redes sociales y formularios independientes. Las familias tienen que revisar cada fuente manualmente, muchas veces con datos duplicados, inconsistentes o desactualizados.

## La solución

Un scraper que consolida todas las fuentes conocidas en una base de datos unificada, expuesta a través de una interfaz web simple y filtrable.

---

## Fuentes de datos (en construcción)

| Fuente | URL | Estado |
|--------|-----|--------|
| — | — | por agregar |

> Si conoces alguna fuente con listados de desaparecidos, abre un issue o un PR agregándola a esta tabla y a `config/sources.yaml`.

---

## Estructura del proyecto

```
sos-venezuela-data/
├── config/
│   └── sources.yaml        # Lista de fuentes a scrapear
├── scrapers/               # Un scraper por fuente
│   └── base.py             # Clase base compartida
├── data/
│   ├── raw/                # Datos crudos por fuente
│   └── processed/          # Datos limpios y unificados
├── api/                    # API REST (opcional, fase 2)
├── web/                    # Frontend de consulta (fase 2)
├── tests/
└── requirements.txt
```

---

## Cómo contribuir

Este proyecto necesita ayuda urgente. Cualquier contribución cuenta.

### Formas de ayudar

- **Agregar fuentes**: conoces un sitio con listados de desaparecidos → abre un issue
- **Escribir scrapers**: implementar el scraper para una fuente nueva
- **Limpiar datos**: mejorar el proceso de normalización y deduplicación
- **Frontend**: construir la interfaz de búsqueda
- **Devops**: automatizar la ejecución periódica de los scrapers

### Setup local

```bash
git clone https://github.com/CalitoTech/sos-venezuela-data.git
cd sos-venezuela-data
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Flujo de trabajo

1. Crea un branch desde `main`: `git checkout -b feature/scraper-nombre-fuente`
2. Implementa tu cambio
3. Abre un Pull Request con descripción clara de qué fuente agrega o qué problema resuelve

---

## Stack tecnológico (propuesto)

- **Python** — scrapers (requests / httpx + BeautifulSoup / Playwright)
- **SQLite / PostgreSQL** — almacenamiento
- **FastAPI** — API REST (fase 2)
- **Next.js o HTML estático** — frontend (fase 2)

---

## Código de conducta

Este es un proyecto humanitario. Se espera respeto y colaboración en todas las interacciones. Cero tolerancia a desinformación intencional.

---

## Licencia

MIT — libre de usar, modificar y distribuir.

---

*Si tienes información sobre personas desaparecidas y quieres reportarla directamente, usa las líneas de emergencia oficiales de Venezuela.*
