# Cómo contribuir

Gracias por querer ayudar. Cada contribución puede significar encontrar a alguien.

## Issues

- **Nueva fuente de datos**: abre un issue con el título `[fuente] Nombre del sitio` e incluye la URL y una descripción breve de qué información tiene.
- **Bug en un scraper**: incluye el nombre de la fuente, el error y si puedes, el output del scraper.
- **Mejora de datos**: describe qué campo está mal normalizado y cómo debería verse.

## Pull Requests

1. Trabaja en un branch descriptivo: `feature/scraper-X`, `fix/dedup-Y`, `data/add-source-Z`
2. Un PR por fuente o por problema — PRs pequeños se revisan más rápido
3. Si agregas una fuente nueva, actualiza también `config/sources.yaml` y la tabla en `README.md`

## Agregar un scraper nuevo

Crea `scrapers/nombre_fuente.py` heredando de `BaseScraper`:

```python
from .base import BaseScraper, MissingPerson

class NombreFuenteScraper(BaseScraper):
    def __init__(self):
        super().__init__("Nombre Fuente", "https://url-de-la-fuente.com")

    def scrape(self) -> list[MissingPerson]:
        # tu implementación aquí
        return []
```

## Preguntas

Abre un issue con el label `question`. No hay preguntas tontas aquí.
