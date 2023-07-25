export const fetchFile = (
  fileName: string,
  callback: (text: string, fileName: string) => void
) => {
  var request = new XMLHttpRequest();

  request.onreadystatechange = () => {
    if (request.readyState === 4 && request.status !== 404) {
      callback(request.responseText, fileName);
    }
  };
  request.open("GET", fileName, true);
  request.send();
};

export const loadImages = async (images: string[]) => {
  return await Promise.all(
    images.map((src) => {
      const img = new Image();

      let _resolve: (value: HTMLImageElement) => void;
      const p = new Promise<HTMLImageElement>(
        (resolve) => (_resolve = resolve)
      );

      img.onload = () => {
        _resolve(img);
      };
      img.src = src;

      return p;
    })
  );
};
