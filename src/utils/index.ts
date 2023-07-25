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
