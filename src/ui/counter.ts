const COUNTER_URL = "https://hits.sh/sagarnidhish.github.io/cambridge-college-dining.svg?style=flat&label=Page%20loads";

export function appendPageCounter(parent: HTMLElement): HTMLElement {
  const container = document.createElement("p");
  container.className = "page-counter";
  const image = document.createElement("img");
  image.src = COUNTER_URL;
  image.alt = "Page loads";
  image.loading = "lazy";
  image.referrerPolicy = "no-referrer";
  image.addEventListener("error", () => {
    container.textContent = "Page-load count unavailable";
  }, { once: true });
  container.append(image);
  parent.append(container);
  return container;
}
