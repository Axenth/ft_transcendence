function getCookie(cName) {
  const name: string = cName + "=";
  const cDecoded: string = decodeURIComponent(document.cookie); //to be careful
  const cArr: string[] = cDecoded.split("; ");
  let res: any;
  cArr.forEach((val) => {
    if (val.indexOf(name) === 0) res = val.substring(name.length);
  });
  return res;
}

export default getCookie;
