let last = 0;

const renderFPS = (now: number, element: Element) => {
  const time = now / 1000;
  const deltaTime = time - last;
  last = time;
  element.textContent = (1 / deltaTime).toFixed(1);
};

export default renderFPS;
