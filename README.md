# Sitio personal de Matías Montero

Este repositorio aloja el portafolio de Matías Montero. Está construido con [Quarto](https://quarto.org) y publica su salida en la carpeta `docs`, desde donde se despliega en GitHub Pages.

## Cómo trabajar aquí

1. Instala [Quarto](https://quarto.org/docs/get-started/) y abre el proyecto desde RStudio o VS Code.
2. Actualiza `_quarto.yml` para cambiar el título, la navegación o cualquier metadato del sitio.
3. Escribe nuevo contenido en `.qmd` dentro de la raíz o en `/posts/`.
4. Renderiza con `quarto render` (o usa `quarto preview` para desarrollo continuo).
5. Haz `git add` y `git commit` para registrar tus cambios; luego empuja para publicar en GitHub.

## Estructura útil

- `posts/` contiene noticias, tutoriales y publicaciones que se listan en `posts.qmd`.
- `files/` guarda imágenes, pdfs y fragmentos compartidos.
- `people.qmd`, `projects.yml` y `teaching.qmd` describen el equipo, proyectos y clases.

## Despliegue

El sitio se sirve desde `docs/`, así que después de renderizar ejecuta `quarto publish gh-pages` o asegúrate de que GitHub Pages esté apuntando a `docs/`.